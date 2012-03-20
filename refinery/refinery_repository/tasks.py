from celery.task import task, periodic_task
from celery.schedules import crontab
#from celery import current_app, events
import os, errno
from django.conf import settings

        
"""
Name: create_dir
Description:
    creates a directory if it needs to be created
Parameters:
    file_path: directory to create if necessary
"""
def create_dir(file_path):
    try:
        os.makedirs(file_path)
    except OSError, e:
        if e.errno != errno.EEXIST:
            raise

@task()
def download_ftp_file(ftp, out_dir, accession):
    import ftplib, socket, os.path, string, sys

    file_name = ftp.split('/')[-1] #get the file name
    out_dir = os.path.join(out_dir, accession) #directory where file downloads
    
    #make super-directory (out_dir/accession) if it doesn't exist
    create_dir(out_dir)

    file_path = os.path.join(out_dir, file_name) # path where file downloads
    if(not os.path.exists(file_path)): #if file exists already don't download
        ftp = ftp[6:] #remove the ftp:// part from the front
    
        #get the ftp host
        ind = string.index(ftp, '/')
        host = ftp[:ind]
    
        #get the directory to change to
        rind = string.rindex(ftp, '/')
        new_dir = ftp[ind+1:rind]

        try:
            f = ftplib.FTP(host)
        except (socket.error, socket.gaierror), e:
            print 'ERROR: Cannot read "%s"' % host
            sys.exit()

        try:
            f.login()
        except ftplib.error_perm:
            print 'ERROR: Cannot login anonymously'
            f.quit()
            sys.exit()

        try:
            f.cwd(new_dir)
        except ftplib.error_perm:
            print 'ERROR: cannot CD to "%s"' % new_dir
            f.quit()
            
        size = int(f.size(file_name))
        downloaded = [0] #can't change non-local vars until Py3, so hack
        file = open(file_path, 'wb')
        
        #defined here because those 3 vars needed to be defined first
        def handleDownload(block):
            downloaded[0] += len(block)
            file.write(block)
            
            percent_dl = downloaded[0] * 100. / size
            download_ftp_file.update_state(state="PROGRESS",
                            meta={
                                  "percent_done": "%3.2f%%" % (percent_dl),
                                  'current': downloaded[0],
                                  'total': size,
                                  'download_location': file_path,
                                  'download_url': "ftp://%s" % ftp
                            })
            #status = r"%3.2f%% downloaded" % (percent_dl)
            #status = status + chr(8)*(len(status)+1)
            #print status,
            
        try:
            f.retrbinary('RETR %s' % file_name, handleDownload)
        except ftplib.error_perm:
            print 'ERROR: cannot read file "%s"' % file_path
            os.unlink(file_path)
        f.quit()
    
@task()
def download_http_file(url, out_dir, accession):
    import urllib2, os.path
    
    file_name = url.split('/')[-1] #get the file name
    out_dir = os.path.join(out_dir, accession) #directory where file downloads
    
    #make super-directory (out_dir/accession) if it doesn't exist
    create_dir(out_dir)
    
    file_path = os.path.join(out_dir, file_name) # path where file downloads

    if(not os.path.exists(file_path)):
        u = urllib2.urlopen(url)
        f = open(file_path, 'wb')
        meta = u.info()
        file_size = int(meta.getheaders("Content-Length")[0])
        print "Downloading: %s Bytes: %s" % (file_name, file_size)
        file_size_dl = 0
        block_sz = 8192
        while True:
            buffer = u.read(block_sz)
            if not buffer:
                break

            file_size_dl += len(buffer)
            f.write(buffer)
            
            downloaded = file_size_dl * 100. / file_size
            download_http_file.update_state(state="PROGRESS",
                        meta={
                              "percent_done": "%3.2f%%" % (downloaded),
                              'current': file_size_dl,
                              'total': file_size
                        })
            
            #status = r"%10d  [%3.2f%%]" % (file_size_dl, downloaded)
            #status = status + chr(8)*(len(status)+1)
            #print status,

        f.close()
                
@task()
def call_download(file_url):
    from refinery_repository.models import Investigation
    
    """args = (file_url)
    orig_stdout = sys.stdout
    sys.stdout = content = StringIO()
    call_command('download_files', *args)
    sys.stdout = orig_stdout
    content.seek(0)
    
    task_ids = content.read()
    print "call_download"
    print task_ids
    return task_ids"""
    #isolate accession number
    file_name = file_url.split('/')[-1] #get the file name
    accession = file_name.split('.')[0]
    
    try:
        #get investigation with primary key
        i = Investigation.objects.get(pk=accession)
    except Investigation.DoesNotExist:
        raise "Investigation %s is not available" % accession
            
    assays = i.assay_set.all() #get assays via fk

    #object to return, set of urls to download
    file_list = set()
    
    for a in assays:
        processed = a.processed_data.all() #associated processed data
        for p in processed:
            file_list.add(p.derived_arrayexpress_ftp_file)

    task_ids = list()
    for f in file_list:
        id = download_http_file.delay(f, settings.DOWNLOAD_BASE_DIR, accession)
        task_ids.append(id)

    return task_ids

@task()
def convert_to_isatab(accession):
    import subprocess, shutil, tempfile, os.path
    
    retval = 1 #successful conversion
    command = "./convert.sh %s" % accession
    
    #send stdout and stderr to a unique temp directory to avoid console
    temp_dir = tempfile.mkdtemp()
    stderr_n = tempfile.NamedTemporaryFile(dir=temp_dir, prefix='ae_stderr').name
    stdout_n = tempfile.NamedTemporaryFile(dir=temp_dir, prefix='ae_stdout').name

    #create the subprocess
    process = subprocess.Popen(args=command, shell=True, 
                               cwd=settings.CONVERSION_DIR, 
                               stderr=open(stderr_n, 'wb'),
                               stdout=open(stdout_n, 'wb'))
    #run the subprocess and grab the exit code
    exit_code = process.wait()
    #process stderr
    stderr = open(stderr_n).read().strip()
    if stderr:
        #unsuccessful conversion, so remove the investigation file and dir
        shutil.rmtree(os.path.join(settings.ISA_TAB_DIR, accession))
        
        if exit_code != 0: #something bad happened
            shutil.rmtree(temp_dir)
            raise Exception, "Error Converting to ISA-Tab: %s" % stderr
        else:
            #print stderr
            retval = 0 #unsuccessful conversion, but clean exit

    #clean up the temporary directory and other files
    os.unlink(stderr_n)
    os.unlink(stdout_n)
    os.rmdir(temp_dir)

    return retval
   
@periodic_task(run_every=crontab(minute="*/15", day_of_week="thursday"))
def get_arrayexpress_studies():
    import urllib2, time, re, os.path, string, sys
    from celery.task.sets import TaskSet
    from django.core.management import call_command
    from StringIO import StringIO
    from datetime import date, datetime, timedelta

    create_dir(settings.WGET_DIR) #make the directory if it's not there

    print "getting %s" % settings.WGET_URL
    u = urllib2.urlopen(settings.WGET_URL)
    ae_file = os.path.join(settings.WGET_DIR, 'arrayexpress_studies')
    
    print "writing to file %s" % ae_file
    f = open(ae_file, 'w')
    #download in pieces to make sure you're never biting off too much
    block_sz = 8192
    while True:
        buffer = u.read(block_sz) #read block_sz bytes from url
        if not buffer:
            break

        f.write(buffer) #write what you read from url to file

    f.close()
    
    last_date_run = datetime.strptime(settings.LAST_AE_UPDATE, '%Y-%m-%d').date()
    
    ae_accessions = list()
    f = open(ae_file, 'r')
    for line in f:
        try:
            #get date that study was updated; between "lastupdatedate" tags
            updated = string.split(line, 'lastupdatedate>').pop(1)
            updated = updated[:-2] #take off the </ connected to the date
            accessions = string.split(line, 'accession>')
            for a in accessions: #many accessions, so search for right one
                if re.search(r'^E-', a):
                    a = a[:-2] #take off the </ connected to the accession
                    isatab_dir = os.path.join(settings.ISA_TAB_DIR, a)
                    #will only convert new studies
                    if not os.path.isdir(isatab_dir): #hasn't been done before
                        ae_accessions.append(a)
                    else: #if updated recently, then convert also
                        #convert string to datetime.date object for comparison
                        update = datetime.strptime(updated, '%Y-%m-%d').date()
                        #if the study has been updated since the last time we
                        #did this, update the ISA-Tab
                        if (update - last_date_run) > timedelta(days=-1):
                            ae_accessions.append(a)
        except IndexError: #looking at line without interesting information
            pass                    
    f.close()

    s_tasks = list()
    for ae_accession in ae_accessions:
        #print ae_accession        
        #task = convert_to_isatab.delay(ae_accession)
        s_task = convert_to_isatab.subtask(args=(ae_accession,))
        s_tasks.append(s_task)
        
    job = TaskSet(tasks=s_tasks)
    result = job.apply_async()
    
    #go to sleep for 3 seconds at a time until all tasks are finished
    while result.waiting():
        print 'sleeping'
        time.sleep(3)
        
    results = result.join() #list of the results in dispatch order
    
    success_list = list()
    
    for a, r in zip(ae_accessions, results):
        if(r):
            success_list.append(a)
        
    #print success_list

    #grab the stderr instead of having it go to console
    orig_stderr = sys.stderr
    sys.stderr = content = StringIO()
    call_command('parser', *success_list, stderr=content)
    sys.stderr = orig_stderr
    content.seek(0)
    
    #if there was a problem, have it email you
    stderr = content.read().strip()
    if stderr:
        print stderr
        """
        msg = MIMEText(stderr)
        msg['Subject'] = 'Refinery Parser Error'
        msg['From'] = settings.FROM_EMAIL
        msg['To'] = settings.TO_EMAIL
            
        s = smtplib.SMTP('localhost')
        s.sendmail(settings.FROM_EMAIL, [settings.TO_EMAIL], msg.as_string())
        s.quit()
        """
            
    #settings.LAST_AE_UPDATE = str(date.today())