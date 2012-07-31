"""
file_store module

* Manages all data files
* Downloads files from external repositories (by URL)
* Manage the import cache/public data space

Requirements:

FILE_STORE_DIR - main file store directory
* must point to a subdirectory of MEDIA_ROOT
* must be writeable by the Django server
Example: FILE_STORE_DIR = 'files'
"""

import os
import logging
from urlparse import urlparse
from django.conf import settings
from django.dispatch import receiver
from django.db import models
from django.db.models.signals import pre_delete
from django_extensions.db.fields import UUIDField
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger('file_store')

# set file store directories
if not settings.FILE_STORE_DIR:
    settings.FILE_STORE_DIR = 'files'   # relative to MEDIA_ROOT

# absolute path to the file store root dir
FILE_STORE_BASE_DIR = os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
# create this directory in case it doesn't exist
if not os.path.isdir(FILE_STORE_BASE_DIR):
    try:
        os.mkdir(FILE_STORE_BASE_DIR)
    except OSError as e:
        logger.exception("Error creating FILE_STORE_BASE_DIR. OSError: [Errno %s], error: %s, path: %s",
                         e.errno, e.strerror, e.filename)

# temp dir should be located on the same file system as the base dir
FILE_STORE_TEMP_DIR = os.path.join(FILE_STORE_BASE_DIR, 'temp')
# create this directory in case it doesn't exist
if not os.path.isdir(FILE_STORE_TEMP_DIR):
    try:
        os.mkdir(FILE_STORE_TEMP_DIR)
    except OSError as e:
        logger.exception("Error creating FILE_STORE_TEMP_DIR. OSError: [Errno %s], error: %s, path: %s",
                         e.errno, e.strerror, e.filename)

# To make sure we can move uploaded files into file store quickly by using os.rename()
#settings.FILE_UPLOAD_TEMP_DIR = FILE_STORE_TEMP_DIR

def file_path(instance, filename):
    '''
    Return local file system path for uploaded files relative to FILE_STORE_BASE_DIR
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html
    '''
    hashcode = hash(filename)
    mask = 255  # bitmask
    # use the first and second bytes of the hash code represented as zero-padded hex numbers as directory names
    # provides 256 * 256 = 65536 of possible directory combinations
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    return os.path.join(instance.sharename, dir1, dir2, filename)

# set the file store location
fss = FileSystemStorage(location=FILE_STORE_BASE_DIR)

class FileStoreItem(models.Model):
    ''' Represents data files on disk '''
    datafile = models.FileField(upload_to=file_path, storage=fss, blank=True)
    uuid = UUIDField(unique=True, auto=True)
    source = models.CharField(max_length=1024)     # URL or absolute file system path
    sharename = models.CharField(max_length=20, blank=True)

    def __unicode__(self):
        return self.datafile.name + ' - ' + self.uuid
    
    def get_absolute_path(self):
        ''' Return absolute path of the data file or None if the file does not exist on disk '''
        try:
            return self.datafile.path
        except ValueError:  # file hasn't been imported yet?
            logger.exception("Data file doesn't exist, UUID = %s", self.uuid)
            return None

    def get_file_size(self, report_symlinks=False):
        '''
        Return the size of the file in bytes
        Return zero if the file is:
         - not local
         - a symlink and report_symlinks=False
        '''

        if self.is_symlink() and not report_symlinks: return 0

        try:
            return self.datafile.size
        except ValueError:  # file is not local
            logger.exception("Data file doesn't exist, UUID = %s", self.uuid)
            return 0

    def is_symlink(self):
        ''' Return True if the data file is a symlink '''
        return os.path.islink(self.get_absolute_path())

class FileStoreCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass

def is_local(uuid):
    ''' Check if this FileStoreItem can be used as a file object '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return False

    if not item.datafile.name: return False

    try:
        return os.path.isfile(item.datafile.path)
    except ValueError:
        logger.exception("%s is not a file", item.datafile.path)
        return False

def is_permanent(uuid):
    ''' Check if FileStoreItem instance is referenced in the cache '''
    return True

def get_temp_dir():
    ''' Return the absolute path to the file store temp dir '''
    return FILE_STORE_TEMP_DIR
    
def get_file_extension(uuid):
    ''' Return file extension of the file specified by UUID '''
    try:
        f = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None

    if f.datafile.name:
        return os.path.splitext(f.datafile.name)[-1]
    else:
        # this is a remote file that has not been copied to file store, so get extension from the source URL
        u = urlparse(f.source)
        name = u.path.split('/')[-1]
        return os.path.splitext(name)[-1]

@receiver(pre_delete, sender=FileStoreItem)
def _delete_file_on_disk(sender, **kwargs):
    ''' Delete the FileStoreItem file from disk when model is deleted '''

    # Need a signal handler because QuerySet delete() method does a bulk delete
    # and does not call any delete() methods on the models
    item = kwargs.get('instance')

    # if file exists on disk
    if item.datafile.name:
        logger.debug("Deleting file %s", item.datafile.name)
        try:
            item.datafile.delete(save=False)    # save=False to avoid extra database hit
        except OSError as e:
            logger.exception("Error deleting file. OSError: [Errno: %s], file name: %s, error: %s",
                             e.errno, e.filename, e.strerror)

def _symlink_file_on_disk(source, target):
    ''' Symlink source to target creating intermediate directories if necessary '''

    target_dir = os.path.dirname(target)

    # create intermediate dirs if they don't already exist
    if not os.path.isdir(target_dir):
        try:
            os.makedirs(target_dir)
        except OSError as e:
            logger.exception("Error creating file store directory %s. OSError: [Errno %s], file name: %s, error: %s",
                             target_dir, e.errno, e.filename, e.strerror)
            return False

    # create symlink
    try:
        os.symlink(source, target)
    except OSError as e:
        logger.exception("Error creating file store symlink. OSError: [Errno %s], file name: %s, error: %s",
                         e.errno, e.filename, e.strerror)
        return False

    logger.debug("%s -> %s", source, target)
    return True
