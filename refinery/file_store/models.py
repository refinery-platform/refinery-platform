import os
from django.db import models
from django_extensions.db.fields import UUIDField
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from settings_local import FILE_STORE_BASE_DIR

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

class FileStoreItem(models.Model):
    ''' Represents data files on disk '''
    datafile = models.FileField(upload_to=file_path)
    uuid = UUIDField(unique=True, auto=True)
    source = models.CharField(max_length=1024, blank=True)     # URL or absolute file system path
    sharename = models.CharField(max_length=20, blank=True)
    def __unicode__(self):
        return self.datafile.name + ' - ' + self.uuid

@receiver(pre_delete, sender=FileStoreItem)
def _delete_file_on_disk(sender, **kwargs):
    ''' Delete the file that belongs to this FileStoreItem instance from the file system '''
    item = kwargs.get('instance')
    # delete files that are located within the file store directory only
    #TODO: expand inline to avoid extra DB query when looking up by UUID
    if is_local(item.uuid):
        try:
            item.datafile.delete()
        except OSError:
            #TODO: write error msg to log
            pass

class FileStoreCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass

def is_local(uuid):
    ''' Check if the file is physically located within the file store directory '''
    try:
        f = FileStoreItem.objects.get(uuid=uuid).datafile
    except FileStoreItem.DoesNotExist:
        #TODO: write error msg to log
        return False
    # local files are stored with relative path names that begin with FILE_STORE_BASE_DIR
    if f and f.name.startswith(FILE_STORE_BASE_DIR):
        return True
    else:
        return False

def is_permanent(uuid):
    ''' Check if FileStoreItem instance is referenced in the cache '''
    return True
