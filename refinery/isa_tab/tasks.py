from celery.task import task
from django.core.management import call_command
import sys, os, string

@task()
def call_download(accession, file_download_flag):
    args = (accession, file_download_flag)
    call_command('download_files', *args)

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

        try:
            f.retrbinary('RETR %s' % file_name, open(file_path, 'wb').write)
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
    f.close()