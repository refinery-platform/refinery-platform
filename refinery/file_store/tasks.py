import os
import urllib2
from django.core.files import File
from django.core.files.temp import NamedTemporaryFile
from celery.task import task
from file_store.models import FileStoreItem

# for testing
@task()
def add(x, y):
    return x + y

def create(source, sharename='', permanent=False):
    item = FileStoreItem(source=source, sharename=sharename)
    item.save()
    if permanent:
        import_file (item.uuid, permanent=True)    # download/copy but don't add to cache
    return item.uuid

#@task()
def import_file(uuid, permanent=False):
    '''
    Download or copy file specified by UUID. If permanent is False then add to cache.
    return File or True|False?
    '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        #TODO: write msg to log
        return False
    src = item.source
    # if source is an absolute file system path then copy, if URL then download, return False otherwise?
    if src[0] == '/':   # assume UNIX-style path only
        # check if source file exists
        try:
            srcfo = open(src)
        except IOError:
            #TODO: write error msg to log
            return None
        srcfilename = os.path.basename(src)
        srcfile = File(srcfo)
        #TODO: copy file in chunks to display progress report (need to override Storage.save?)
        item.datafile.save(srcfilename, srcfile)  # model is saved by default after file has been altered
        srcfile.close()
        srcfo.close()
    else:
        req = urllib2.Request(src)
        try:
            response = urllib2.urlopen(req)
        except urllib2.URLError, e:
            #TODO: write error to log
            response.close()
            return None

        # download and save the file
        #TODO: download data directly to a file in MEDIA_ROOT to avoid copying from temp file after download is finished
        tmpfile = NamedTemporaryFile()  # django.core.files.File cannot handle file-like objects like those returned by urlopen
        remotefilesize = int(response.info().getheaders("Content-Length")[0])
        filename = response.geturl().split('/')[-1]    # get file name from its URL
    
        localfilesize = 0       # bytes
        blocksize = 8 * 1024    # bytes
        while True:
            buf = response.read(blocksize)
            if not buf:
                break
    
            localfilesize += len(buf)
            tmpfile.write(buf)
#            downloaded = localfilesize * 100. / remotefilesize
#            status = r"%10d  [%3.2f%%]" % (localfilesize, downloaded)
#            status = status + chr(8) * (len(status) + 1)
#            print status,

        tmpfile.flush()
        
        #TODO: move tmpfile to file store dir to avoid copying large files
        item.datafile.save(filename, File(tmpfile))

        tmpfile.close()
        response.close()

    #TODO: if permanent is False then add to cache
    if not permanent:
        pass

    return item.datafile

#@task()
def read(uuid):
    '''
    Return a File object given UUID
    If file is not local then import the file
    '''
    try:
        f = FileStoreItem.objects.get(uuid=uuid).datafile
    except FileStoreItem.DoesNotExist:
        #TODO: write msg to log
        # import file
        return None
    return f

#@task()
def delete(uuid):
    ''' Delete the FileStoreItem given UUID '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        #TODO: write error msg to log
        return False
    item.delete()
    #TODO: check if deletion was successful
    return True

#@task()
def update(uuid, source):
    ''' Replace the file while keeping the same UUID '''
    # delete file from disk if exists
    # update source
    # import new file from source
    return True
