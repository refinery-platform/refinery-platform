from django.db import models
from django_extensions.db.fields import UUIDField
from settings_local import FILE_STORE_BASE_DIR
import os
from django.db.models.signals import post_delete
from django.dispatch import receiver

def file_path(instance, filename):
    '''
    Return local file system path for uploaded files, create the path on file system if doesn't exist
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html
    '''
    hashcode = hash(filename)   # if duplicate file names get _N (N is int) added to the name
    mask = 255  # bitmask
    # use the first and second zero-padded bytes of the hash code as directory names
    # provides 256 * 256 = 65536 possible directories
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    return os.path.join(FILE_STORE_BASE_DIR, dir1, dir2, filename)

class RepositoryFile(models.Model):
    data = models.FileField(upload_to=file_path)
    uuid = UUIDField(unique=True, auto=True)
    sourceURL = models.URLField(blank=True)     # should contain file name if file was uploaded?
    
    def __unicode__(self):
        return self.data.name + ' : ' + self.uuid

@receiver(post_delete, sender=RepositoryFile)
def _delete_file_on_disk(sender, **kwargs):
    '''
    Delete the file that belongs to this model from file system
    Call this function only when deleting the model
    Otherwise, this will result in models pointing to files that don't exist
    '''
    instance = kwargs.get('instance')
    instance.data.delete(save=False)    # don't save the model back to DB after file was deleted

def read_file(uuid):
    ''' Return a FileField object given UUID '''
    try:
        f = RepositoryFile.objects.get(uuid=uuid).data
    except RepositoryFile.DoesNotExist:
        return None
    return f

def delete_file(uuid):
    ''' Delete RepositoryFile given UUID '''
    try:
        f = RepositoryFile.objects.get(uuid=uuid)
    except RepositoryFile.DoesNotExist:
        return False
    else:
        f.delete()
        return True

def write_file(f, share_name=''):
    '''
    Store given file
    '''
    # create share_name if it doesn't exist
    
    # return uuid
    pass

def write_remote_file(url, share_name=''):
    '''
    Download file from provided URL
    '''
    # create share_name if it doesn't exist
    
    # return uuid 
    pass

class RepositoryCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass
