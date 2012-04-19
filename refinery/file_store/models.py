import os
import urllib2
from django.db import models
from django_extensions.db.fields import UUIDField
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.core.files import File
from django.core.files.temp import NamedTemporaryFile
from settings_local import MEDIA_ROOT, FILE_STORE_BASE_DIR

# provide a default location for file store
if not FILE_STORE_BASE_DIR:
    FILE_STORE_BASE_DIR = "files"

def file_path(modelinstance, filename):
    '''
    Return local file system path for uploaded files
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html
    '''
    #TODO: include share_name in the path
    hashcode = hash(filename)   # duplicate file names get _N (N is int) added to the name
    mask = 255  # bitmask
    # use the first and second bytes of the hash code represented as zero-padded hex numbers as directory names
    # provides 256 * 256 = 65536 of possible directory combinations
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    return os.path.join(FILE_STORE_BASE_DIR, modelinstance.sharename, dir1, dir2, filename)

class RefineryFile(models.Model):
    ''' Represents data files on disk '''
    datafile = models.FileField(upload_to=file_path)
    uuid = UUIDField(unique=True, auto=True)
    sourceURL = models.URLField(blank=True)     # should contain file name if file was uploaded?
    sharename = models.CharField(max_length=20, blank=True)
    def __unicode__(self):
        return self.datafile.name + ' : ' + self.uuid

@receiver(post_delete, sender=RefineryFile)
def _delete_file_on_disk(sender, **kwargs):
    '''
    Delete the file that belongs to this RefineryFile instance from the file system
    Call this function only when deleting the instance
    Otherwise, this will result in instances pointing to files that don't exist
    '''
    #TODO: raise exception if file not found?
    instance = kwargs.get('instance')
    instance.datafile.delete(save=False)    # don't save the model back to DB after file was deleted

def read_file(uuid):
    ''' Return a FileField object given UUID '''
    try:
        datafile = RefineryFile.objects.get(uuid=uuid).file
    except RefineryFile.DoesNotExist:
        #TODO: write error msg to log
        return None
    return datafile

def delete_file(uuid):
    ''' Delete RefineryFile given UUID '''
    try:
        f = RefineryFile.objects.get(uuid=uuid)
    except RefineryFile.DoesNotExist:
        #TODO: write error msg to log
        return False
    f.delete()
    #TODO: check if completed successfully
    return True

def write_file(abssrcpath, sharename='', link=False):
    '''
    Store file specified by absolute file system path
    '''
    # check if source file exists
    try:
        srcfo = open(abssrcpath)
    except IOError:
        return None
    srcfilename = os.path.basename(abssrcpath)
    # create a symlink to original file or copy original file to a new file
    if link:
        rf = RefineryFile(sharename=sharename)
        # create symlink destination path and check if there's a name conflict
        reldstpath = rf.datafile.storage.get_available_name(file_path(None, srcfilename))
        # absolute destination path is need to create the symlink
        absdstpath = os.path.join(MEDIA_ROOT, reldstpath)
        (dstdirname, dstfilename) = os.path.split(absdstpath)
        # create intermediate directories if they don't exist
        if not os.path.isdir(dstdirname):
            os.makedirs(dstdirname)
        os.symlink(abssrcpath, absdstpath)
        # assign symlink path to FileField
        rf.datafile.name = reldstpath
        # associate the file on disk with FileField
        rf.datafile.file = open(absdstpath)
        # save the model instance
        rf.save()
    else:   # copy file
        srcfile = File(srcfo)
        rf = RefineryFile(sharename=sharename)
        rf.datafile.save(srcfilename, srcfile)  # model is saved by default after file has been altered
        srcfile.close()
    srcfo.close()
    return rf.uuid

def write_remote_file(url, sharename=''):
    '''
    Download file from provided URL
    '''
    # download file to temp file object
    req = urllib2.Request(url)
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

#        downloaded = localfilesize * 100. / remotefilesize
#        status = r"%10d  [%3.2f%%]" % (localfilesize, downloaded)
#        status = status + chr(8) * (len(status) + 1)
#        print status,

    tmpfile.flush()
    
    #TODO: move tmpfile to file store dir to avoid copying large files
    rf = RefineryFile()
    rf.datafile.save(filename, File(tmpfile))

    tmpfile.close()
    response.close()
    return rf.uuid

class RefineryCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass
