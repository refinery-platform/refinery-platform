from django.db import models
from django_extensions.db.fields import UUIDField
from settings_local import MEDIA_ROOT, FILE_STORE_BASE_DIR
import os
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.core.files import File

# provide a default location for file store
if not FILE_STORE_BASE_DIR:
    FILE_STORE_BASE_DIR = "files"

def file_path(modelinstance, filename):
    '''
    Return local file system path for uploaded files
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html
    '''
    hashcode = hash(filename)   # duplicate file names get _N (N is int) added to the name
    mask = 255  # bitmask
    # use the first and second bytes of the hash code represented as zero-padded hex numbers as directory names
    # provides 256 * 256 = 65536 of possible directory combinations
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    return os.path.join(FILE_STORE_BASE_DIR, dir1, dir2, filename)

class RepositoryFile(models.Model):
    datafile = models.FileField(upload_to=file_path)
    uuid = UUIDField(unique=True, auto=True)
    sourceURL = models.URLField(blank=True)     # should contain file name if file was uploaded?
    def __unicode__(self):
        return self.datafile.name + ' : ' + self.uuid

@receiver(post_delete, sender=RepositoryFile)
def _delete_file_on_disk(sender, **kwargs):
    '''
    Delete the file that belongs to this model from file system
    Call this function only when deleting the model
    Otherwise, this will result in models pointing to files that don't exist
    ''' 
    instance = kwargs.get('instance')
    instance.datafile.delete(save=False)    # don't save the model back to DB after file was deleted

def read_file(uuid):
    ''' Return a FileField object given UUID '''
    try:
        datafile = RepositoryFile.objects.get(uuid=uuid).file
    except RepositoryFile.DoesNotExist:
        return None
    return datafile

def delete_file(uuid):
    ''' Delete RepositoryFile given UUID '''
    try:
        f = RepositoryFile.objects.get(uuid=uuid)
    except RepositoryFile.DoesNotExist:
        return False
    f.delete()
    return True

def write_file(abssrcpath, share_name='', link=False):
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
        rf = RepositoryFile()
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
        rf = RepositoryFile()
        rf.datafile.save(srcfilename, srcfile)  # model is saved by default after file has been altered
        srcfile.close()
    srcfo.close()
    return rf.uuid

def write_remote_file(url, share_name=''):
    '''
    Download file from provided URL
    '''
    pass
    # return uuid

class RepositoryCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass
