import os
import urllib2
import tempfile
from django.core.files import File
from celery.task import task
from file_store.models import FileStoreItem, is_local

@task()
def create(source, sharename='', permanent=False, file_size=None):
    '''
    Create a FileStoreItem instance and return its UUID
    source is either an absolute file system path or URL
    '''
    print "file_store create called"
    print source

    if not source: return None
    
    # check if source file is available
    """
    if os.path.isabs(source):
        try:
            srcfo = open(source)
            srcfo.close()
        except IOError as e:
            #TODO: write error msg to log
            print e.errno
            return None
    else:
        req = urllib2.Request(source)
        try:
            response = urllib2.urlopen(req)
            response.close()
        except urllib2.URLError as e:
            #TODO: write error msg to log
            print e.reason
            return None
    """

    item = FileStoreItem.objects.create(source=source, sharename=sharename)
    #TODO: call import_file as subtask?
    if permanent:
        if not import_file(item.uuid, permanent=True, file_size=file_size):    # download/copy but don't add to cache
            return None
    return item.uuid

@task()
def import_file(uuid, permanent=False, refresh=False, file_size=None):
    '''
    Download or copy file specified by UUID
    If permanent=False then add to cache
    '''
    # check if there's a FileStoreItem with this UUID
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        #TODO: write msg to log
        return None
    # if file exists locally, either return it or delete before re-import
    if is_local(uuid):
        if refresh:
            try:
                item.datafile.delete()
            except OSError as e:
                #TODO: write error msg to log
                print e.errno, e.filename, e.strerror
        else:
            return item
    # import file
    src = item.source
    # if source is an absolute file system path then copy, if URL then download
    if os.path.isabs(src):  # if source is a file system path
        # check if source file can be opened
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
    else:   # if source is a URL 
        req = urllib2.Request(src)
        # check if source file can be opened
        try:
            response = urllib2.urlopen(req)
        except urllib2.URLError as e:
            #TODO: write error msg to log
            print e.reason
            return None

        # download and save the file
        tmpfile = tempfile.NamedTemporaryFile()
        if (file_size is None):
            remotefilesize = int(response.info().getheaders("Content-Length")[0])
        else:
            remotefilesize = file_size 
        filename = response.geturl().split('/')[-1]    # get file name from its URL
    
        localfilesize = 0
        blocksize = 8 * 2 ** 10    # 8 Kbytes
        while True:
            buf = response.read(blocksize)
            if not buf:
                break
    
            localfilesize += len(buf)
            tmpfile.write(buf)
            downloaded = localfilesize * 100. / remotefilesize
            import_file.update_state(
                state="PROGRESS",
                meta={"percent_done": "%3.2f%%" % (downloaded), 'current': localfilesize, 'total': remotefilesize}
                )
        
        tmpfile.flush()
        
        #TODO: move tmpfile to file store dir to avoid copying large files (if tmpfile is on the same file system)
        item.datafile.save(filename, File(tmpfile))

        tmpfile.close()
        response.close()

    #TODO: if permanent is False then add to cache
    if not permanent:
        pass

    return item

@task()
def read(uuid):
    ''' Return a FileStoreItem given UUID '''
    #TODO: call import_file as subtask?
    return import_file(uuid)

@task()
def delete(uuid):
    ''' Delete the FileStoreItem given UUID '''
    try:
        FileStoreItem.objects.get(uuid=uuid).delete()
    except FileStoreItem.DoesNotExist:
        #TODO: write error msg to log
        return False
    return True

@task()
def update(uuid, source):
    ''' Replace the file while keeping the same UUID '''
    FileStoreItem.objects.filter(uuid=uuid).update(source=source)
    # import new file from source
    #TODO: call import_file as task
    return import_file(uuid, refresh=True)
