from celery.schedules import crontab
from celery.task import task, periodic_task
from celery.task.sets import TaskSet, subtask
from collections import defaultdict
from core.models import *
from datetime import date, datetime, timedelta
from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.db.utils import IntegrityError
from file_store.tasks import create, delete, read
from data_set_manager.models import Investigation, Study
from data_set_manager.isa_tab_parser import IsaTabParser
import csv, errno, ftplib, glob, os, os.path, re, shutil, socket, string
import subprocess, sys, tempfile, time, traceback, urllib2
from zipfile import ZipFile, BadZipfile

@task()
def convert_to_isatab(accession):
    """
    Name: convert_to_isatab
    Description:
        converts MAGE-Tab file from ArrayExpress into ISA-Tab, zips up the 
        ISA-Tab, and zips up the MAGE-Tab
    Parameters:
        accession: ArrayExpress study to convert
    """
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
    else: #successfully converted
        #zip up ISA-Tab files 
        isatab_file_location = os.path.join(settings.ISA_TAB_DIR, accession)
        """
        shutil makes a zip, tar, tar.gz, etc file out of files in given dir 
        Params:
        zip file prefix
        type of archive (e.g. zip, tar)
        superdirectory of the directory you want to archive
        name of directory that's being archived
        """ 
        shutil.make_archive(isatab_file_location, 'zip',  
                                        settings.ISA_TAB_DIR, accession)
        
        #move into the ISA-Tab folder
        shutil.move("%s.zip" % isatab_file_location, isatab_file_location)
        
        #Get and zip up the MAGE-TAB and put in the ISA-Tab folder
        #make file name for ArrayExpress information to download into
        ae_name = tempfile.NamedTemporaryFile(dir=temp_dir, prefix='ae_').name
        #make url to fetch the experiment
        url = "%s/%s" % (settings.AE_BASE_URL, accession)
        
        #get ArrayExpress information to get URLs to download
        u = urllib2.urlopen(url)
        f = open(ae_name, 'wb')
        f.write(u.read()) #small file, so just grab whole thing in one go
        f.close()
        
        #open and read in the last line (the HTML) that has the info we want
        f = open(ae_name, 'rb')
        lines = f.readlines()
        f.close()
        last_line = lines[-1]
        
        #isolate the links by splitting on '<a href="'
        a_hrefs = string.split(last_line, '<a href="')
        #get the links we want
        for a_href in a_hrefs:
            if re.search(r'http://.+sdrf.txt', a_href) or re.search(r'http://.+idf.txt', a_href):
                link = string.split(a_href, '"').pop(0) #grab the link
                file_name = link.split('/')[-1] #get the file name
                
                #download and zip up locally because needs to be sequential
                dir_to_zip = os.path.join(temp_dir, accession)
                create_dir(dir_to_zip)
                
                u = urllib2.urlopen(link)
                file = os.path.join(dir_to_zip, file_name)
                f = open(file, 'wb')
                f.write(u.read()) #again, shouldn't be a large file
                f.close()
        
                #zip up and move the MAGE-TAB files
                shutil.make_archive(dir_to_zip, 'zip', temp_dir, 
                                                "MAGE-TAB_%s" % accession)
                shutil.move("%s.zip" % dir_to_zip, isatab_file_location)

    #clean up the temporary directory and other files
    shutil.rmtree(temp_dir)

    return retval

"""
Name: get_arrayexpress_studies
Description:
    task that runs every Friday at 9:00PM that checks ArrayExpress for new
    and updated studies, then pulls down their metadata, converts it to
    ISA-Tab, and parses it into the Django database
"""
@periodic_task(run_every=crontab(hour="12", day_of_week="friday"))
def get_arrayexpress_studies():
    create_dir(settings.WGET_DIR) #make the directory if it's not there
    
    #find out when the last pull from ArrayExpress was
    ae_file = os.path.join(settings.WGET_DIR, 'arrayexpress_studies')
    try:
        t = os.path.getmtime(ae_file)
        last_date_run = datetime.fromtimestamp(t).date()
    except: #if file doesn't exist yet, then just make last_date_run today
        last_date_run = date.today()

    print "getting %s" % settings.WGET_URL
    u = urllib2.urlopen(settings.WGET_URL)
    
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
                    if not Study.objects.filter(identifier=a):
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
    #orig_stderr = sys.stderr
    #sys.stderr = content = StringIO()
    #call_command('parser', *success_list, stderr=content)
    #sys.stderr = orig_stderr
    #content.seek(0)
    
    print success_list
    #success_list = ['E-GEOD-18588', 'E-GEOD-35573', 'E-MTAB-805', 'E-GEOD-33887', 'E-GEOD-33546', 'E-GEOD-35791', 'E-GEOD-34962', 'E-GEOD-34261']
    s_tasks = list()
    for ae in success_list:
        isatab_archive = os.path.join(settings.ISA_TAB_DIR, ae, "%s.zip" % ae)
        pre_isatab = os.path.join(settings.ISA_TAB_DIR, ae, "MAGE-TAB_%s.zip" % ae)
        sub_task = parse_isatab.subtask(args=(ae, isatab_archive, pre_isatab))
        s_tasks.append(sub_task)
    
    job = TaskSet(tasks=s_tasks)
    result = job.apply_async()
    while result.waiting():
        print 'sleeping'
        time.sleep(3)
    results = result.join()
    print "RESULTS:",
    print results
    
    #get public group and ArrayExpress User for assigning DataSets
    public_group = ExtendedGroup.objects.get(name__exact="Public")
    ae_user = User.objects.get(username__exact="ArrayExpress")
    for r in results:
        if r != None:
            investigation = Investigation.objects.get(uuid=r)
            identifier = investigation.get_identifier()
    
            datasets = DataSet.objects.filter(name=identifier)
            if len(datasets): #if not 0, update dataset with new investigation
                #go through datasets until you find one with the correct owner
                for ds in datasets:
                    own = ds.get_owner()
                    if own == ae_user:
                        d = ds
                        break
                d.update_investigation(investigation, "updated")
            else: #create a new dataset
                d = DataSet.objects.create(name=identifier)
                d.set_investigation(investigation)
                d.set_owner(ae_user)
                d.share(public_group)
        

    #if there was a problem, have it email you
    #stderr = content.read().strip()
    #if stderr:
    #    print stderr   

@task()
def parse_isatab(folder_name, isa_archive=None, pre_isa_archive=None):
    path = os.path.join(settings.ISA_TAB_DIR, folder_name)
    print path
    p = IsaTabParser()
    try:
        investigation = p.run(path, isa_archive, pre_isa_archive)
        return investigation.uuid
    except:
        pass
    return None