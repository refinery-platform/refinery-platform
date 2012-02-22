from celery.task import task, Task
from django.core.management import call_command
from celery import current_app, events
import sys, os, string
from StringIO import StringIO

@task()
def call_download(accession, file_download_flag):
    args = (accession, file_download_flag)
    orig_stdout = sys.stdout
    sys.stdout = content = StringIO()
    call_command('download_files', *args)
    sys.stdout = orig_stdout
    content.seek(0)
    
    task_ids = content.read()
    print "call_download"
    print task_ids
    return task_ids

@task()
def download_ftp_file(ftp, out_dir):        
    import ftplib, socket
    
    file_name = ftp.split('/')[-1] #get the file name
    file_path = "%s/%s" % (out_dir, file_name) # path where file downloads
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
                            meta={"percent_done": "%3.2f%%" % (percent_dl)})
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
def download_http_file(url, out_dir):
    import urllib2
    
    file_name = url.split('/')[-1] #get the file name
    file_path = "%s/%s" % (out_dir, file_name) # path where file downloads

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
#        buffer = u.read()
            if not buffer:
                break

            file_size_dl += len(buffer)
            f.write(buffer)
            
            downloaded = file_size_dl * 100. / file_size
            download_http_file.update_state(state="PROGRESS",
                        meta={"percent_done": "%3.2f%%" % (downloaded)})
            
            #status = r"%10d  [%3.2f%%]" % (file_size_dl, downloaded)
            #status = status + chr(8)*(len(status)+1)
            #print status,

        f.close()