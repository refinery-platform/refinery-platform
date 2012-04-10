from django.db import models
from django_extensions.db.fields import UUIDField
from settings_local import FILE_STORE_BASE_DIR
import os

def file_path(instance, filename):
    '''
    Return local file system path for uploaded files, create the path on file system if doesn't exist
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html
    '''
    hashcode = hash(instance)   # instance of RepositoryFile
    # Note: In most cases, instance will not have been saved to the database yet,
    # so if it uses the default AutoField, it might not yet have a value for its primary key field.
    # https://docs.djangoproject.com/en/dev/ref/models/fields/#django.db.models.FileField.upload_to
    mask = 255
    # use the first and second zero-padded bytes of the hash code as directory names
    # gives 256 * 256 = 65536 possible directories
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    return os.path.join(FILE_STORE_BASE_DIR, dir1, dir2, filename)

class RepositoryFile(models.Model):
    data = models.FileField(upload_to=file_path)
    uuid = UUIDField(unique=True, auto=True)
    sourceURL = models.URLField(blank=True)
    
    def delete(self):
        ''' Delete the file that belongs to this model '''
        os.unlink(self.data.name)

    def __unicode__(self):
        return self.data.name

class RepositoryCache:
    '''
    
    '''
    # doubly-linked list or heapq
    pass

def write_file(f, share_name=''):
    '''
    
    '''
    # create share_name if it doesn't exist
    
    # return uuid
    pass

def read_file(uuid):
    '''
    
    '''
    
    # return file object
    pass

def delete_file(uuid):
    '''
    
    '''
   
    # throw exception if uuid doesn't exist?
    pass

def write_remote_file(url, share_name=''):
    '''
    
    '''
    # check if share_name exists
    
    # return uuid 
    pass
