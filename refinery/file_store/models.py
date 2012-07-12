"""
file_store module

* Manages all data files
* Downloads files from external repositories (by URL)
* Manage the import cache/public data space

"""

import os
import logging
from urlparse import urlparse
from django.conf import settings
from django.dispatch import receiver
from django.db import models
from django.db.models.signals import pre_delete, pre_save
from django_extensions.db.fields import UUIDField
from django.core.files.storage import FileSystemStorage

# set file store directories
if not settings.FILE_STORE_DIR:
    settings.FILE_STORE_DIR = 'files'   # relative to MEDIA_ROOT

# absolute path to the file store root dir
FILE_STORE_BASE_DIR = os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
#TODO: create this directory if it doesn't exist?

# temp dir should be located on the same file system as the base dir
FILE_STORE_TEMP_DIR = os.path.join(FILE_STORE_BASE_DIR, 'temp')
#TODO: create this directory if it doesn't exist?

logger = logging.getLogger('file_store')

def file_path(modelinstance, filename):
    '''
    Return local file system path for uploaded files relative to FILE_STORE_BASE_DIR
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html
    '''
    hashcode = hash(filename)   # duplicate file names get _N (N is int) added to the name
    mask = 255  # bitmask
    # use the first and second bytes of the hash code represented as zero-padded hex numbers as directory names
    # provides 256 * 256 = 65536 of possible directory combinations
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    #return os.path.join(settings.FILE_STORE_DIR, modelinstance.sharename, dir1, dir2, filename)
    return os.path.join(modelinstance.sharename, dir1, dir2, filename)

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
        ''' Return absolute path of the data file '''
        if self.datafile.name == '': return None

        try:
            return self.datafile.path
        except ValueError:  # file hasn't been imported yet?
            logger.exception("Data file doesn't exist, UUID = %s", self.uuid)
            return None

@receiver(pre_save, sender=FileStoreItem)
def _symlink_file_on_disk(sender, **kwargs):
    ''' Create a symlink to the file if source is an absolute file system path '''
    item = kwargs.get('instance')
    logger.debug("Entering _symlink_file_on_disk(), source = %s, datafile.name = %s", item.source, item.datafile.name)

    if os.path.isabs(item.source) and item.datafile.name == '':
        src_file_name = os.path.basename(item.source)
        # path relative to the base dir
        rel_dst_path = item.datafile.storage.get_available_name(file_path(item, src_file_name))
        logger.debug("rel_dst_path = %s", rel_dst_path)
        # absolute destination path is needed to create the symlink
        abs_dst_path = os.path.join(FILE_STORE_BASE_DIR, rel_dst_path)
        # create intermediate directories if they don't exist
        dst_dir_name = os.path.split(abs_dst_path)[0]
        if not os.path.isdir(dst_dir_name):
            try:
                os.makedirs(dst_dir_name)
            except OSError as e:
                logger.exception("Error creating file store directory. OSError: %s, file name: %s, error: %s",
                                 e.errno, e.filename, e.strerror)
        try:
            os.symlink(item.source, abs_dst_path)
        except OSError as e:
            logger.exception("Error creating file store symlink. OSError number: %s, file name: %s, error: %s",
                             e.errno, e.filename, e.strerror)
            return None
        # assign symlink path to FileField
        item.datafile.name = rel_dst_path
    logger.debug("Leaving _symlink_file_on_disk(): item.datafile.name = %s", item.datafile.name)

@receiver(pre_delete, sender=FileStoreItem)
def _delete_file_on_disk(sender, **kwargs):
    ''' Delete the FileStoreItem file from disk when model is deleted '''
    # Need a signal handler because QuerySet delete() method does a bulk delete
    # and does not call any delete() methods on the models
    item = kwargs.get('instance')
    try:
        item.datafile.delete(save=False)    # save=False to avoid executing pre_save signal handler
    except OSError as e:
        logger.exception("Error deleting data file. OSError number: %s, file name: %s, error: %s",
                         e.errno, e.filename, e.strerror)

class FileStoreCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass

def is_local(uuid):
    ''' Check if this FileStoreItem can be used as a file object '''
    try:
        f = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return False

    if f.datafile.name == '': return False

    try:
        return os.path.isfile(f.datafile.path)
    except ValueError:
        logger.exception("Data file does not exist")
        return False

def is_permanent(uuid):
    ''' Check if FileStoreItem instance is referenced in the cache '''
    #TODO: implement
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
