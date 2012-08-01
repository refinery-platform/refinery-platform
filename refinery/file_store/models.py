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

def _mkdir(path):
    ''' Create directory given absolute path '''
    #logger.debug("Creating directory %s", path)
    if not os.path.isdir(path):
        try:
            os.mkdir(path)
        except OSError as e:
            logger.exception("Error creating directory. OSError: [Errno %s], error: %s, path: %s",
                             e.errno, e.strerror, e.filename)
            return False
        logger.info("Directory %s created", path)
    else:
        #logger.warn("Directory %s already exists", path)
        pass
    return True

# configure and create file store directories
if not settings.FILE_STORE_DIR:
    settings.FILE_STORE_DIR = 'files'   # relative to MEDIA_ROOT

# absolute path to the file store root dir
FILE_STORE_BASE_DIR = os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
# create this directory in case it doesn't exist
_mkdir(FILE_STORE_BASE_DIR)

# temp dir should be located on the same file system as the base dir
FILE_STORE_TEMP_DIR = os.path.join(FILE_STORE_BASE_DIR, 'temp')
# create this directory in case it doesn't exist
_mkdir(FILE_STORE_TEMP_DIR)

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

FILE_TYPES = (
    ('BAM', 'BAM file'),
    ('BED', 'BED file'),
    ('IDF', 'IDF file'),
    ('FASTA', 'FASTA file'),
    ('FASTQ', 'FASTQ file'),
    ('TDF', 'TDF file'),
    ('VCF', 'VCF file'),
    ('WIG', 'WIG file'),
)

class FileStoreItem(models.Model):
    ''' Represents data files on disk '''
    datafile = models.FileField(upload_to=file_path, storage=fss, blank=True)
    uuid = UUIDField(unique=True, auto=True)
    source = models.CharField(max_length=1024)     # URL or absolute file system path
    sharename = models.CharField(max_length=20, blank=True)
    filetype = models.CharField(max_length=5, choices=FILE_TYPES, blank=True)

    def __unicode__(self):
        return self.datafile.name + ' - ' + self.uuid
    
    def get_absolute_path(self):
        ''' Return absolute path of the data file or None if the file does not exist on disk '''
        try:
            return self.datafile.path
        except ValueError:  # file hasn't been imported yet?
            logger.exception("Datafile doesn't exist, UUID = %s", self.uuid)
            return None

    def get_file_size(self, report_symlinks=False):
        '''
        Return the size of the file in bytes
        Return zero if the file is:
         - not local
         - a symlink and report_symlinks=False
        '''
        if self.is_symlinked() and not report_symlinks: return 0

        try:
            return self.datafile.size
        except ValueError:  # file is not local
            logger.exception("Datafile doesn't exist in FileStoreItem %s", self.uuid)
            return 0

    def get_file_extension(self):
        ''' Return extension of the file on disk or of the file in source URL '''
        if self.datafile.name:
            return os.path.splitext(self.datafile.name)[-1]
        else:
            # this is a remote file that has not been copied to file store, so get extension from the source URL
            u = urlparse(self.source)
            name = u.path.split('/')[-1]
            return os.path.splitext(name)[-1]
    
    def get_filetype(self):
        ''' Return the type of the datafile '''
        return self.filetype
    
    def set_filetype(self, filetype):
        '''Assign the type of the datafile.  Only existing types allowed as arguments.

        :param filetype: requested file type.
        :returns: True if success, False if failure.

        '''
        
        self.filetype = filetype
        self.save()

    def is_symlinked(self):
        ''' Return True if the data file is a symlink '''
        return os.path.islink(self.get_absolute_path())

    def is_local(self):
        ''' Check if the datafile can be used as a file object '''
        if not self.datafile.name: return False
        try:
            return os.path.isfile(self.datafile.path)
        except ValueError:
            logger.exception("%s is not a file", self.datafile.path)
            return False

    def delete_datafile(self):
        '''
        Delete datafile if it exists on disk
        Return True if deletion succeeded, return False otherwise
        '''
        logger.debug("Deleting datafile %s", self.datafile.name)
        
        if self.datafile.name:
            try:
                self.datafile.delete()
            except OSError as e:
                logger.exception("Error deleting file. OSError: [Errno: %s], file name: %s, error: %s",
                                 e.errno, e.filename, e.strerror)
                return False
            logger.info("Datafile deleted")
            return True
        else:   # datafile doesn't exist
            return False

    def rename_datafile(self, name):
        '''
        Change name of the datafile
        Return the name that was assigned by the file storage system if renaming succeeded
        (may not be the same as the requested name in case of conflict)
        Return None otherwise
        '''
        logger.debug("Renaming datafile %s to %s", self.datafile.name, name)

        if self.is_local():
            # obtain a new path based on requested name
            new_rel_path = self.datafile.storage.get_available_name(file_path(self, name))
            new_abs_path = os.path.join(FILE_STORE_BASE_DIR, new_rel_path)
            
            # rename the physical file
            if _rename_file_on_disk(self.datafile.path, new_abs_path):
                # update the model with new path
                self.datafile.name = new_rel_path
                self.save() #TODO: update FileField only: update_fields=['name']
                logger.info("Datafile renamed")
                return os.path.basename(self.datafile.name)
            else:
                logger.error("Renaming failed")
                return None
        else:
            logger.error("Datafile does not exist")
            return None

    def symlink_datafile(self):
        '''
        Create a symlink to the file
        Does not check that:
        - the source is an absolute file system path
        - the datafile already exists
        '''
        logger.debug("Symlinking datafile to %s", self.source)

        if os.path.isfile(self.source):
            # construct symlink target path based on source file name
            rel_dst_path = self.datafile.storage.get_available_name(file_path(self, os.path.basename(self.source)))
            abs_dst_path = os.path.join(FILE_STORE_BASE_DIR, rel_dst_path)
    
            # create symlink
            if _symlink_file_on_disk(self.source, abs_dst_path):
                # update the model with the symlink path
                self.datafile.name = rel_dst_path
                self.save()
                logger.info("Datafile symlinked")
                return True
            else:
                logger.error("Symlinking failed")
                return False
        else:
            logger.error("Symlinking failed: source is not a file")
            return False

def is_local(uuid):
    ''' Check if this FileStoreItem can be used as a file object '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return False
    return item.is_local()

def is_permanent(uuid):
    ''' Check if FileStoreItem instance is referenced in the cache '''
    return True

def get_temp_dir():
    ''' Return the absolute path to the file store temp dir '''
    return FILE_STORE_TEMP_DIR

def get_file_extension(uuid):
    ''' Return file extension of the file specified by UUID '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None
    return item.get_file_extension()

def get_file_size(uuid, report_symlinks=False):
    ''' Return size of the file specified by UUID '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None
    return item.get_file_size(report_symlinks=report_symlinks)
    
@receiver(pre_delete, sender=FileStoreItem)
def _delete_datafile(sender, **kwargs):
    '''
    Delete the FileStoreItem datafile when model is deleted
    Need a signal handler because QuerySet delete() method does a bulk delete
    and does not call any delete() methods on the models
    '''
    item = kwargs.get('instance')
    item.delete_datafile()

def _symlink_file_on_disk(source, target):
    '''
    Symlink source to target specified by absolute paths
    Creating intermediate directories if they don't exist
    '''
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

    logger.debug("Symlinked %s to %s", source, target)
    return True

def _rename_file_on_disk(current_path, new_path):
    '''
    Rename a file using absolute paths
    Create intermediate directories if they don't exist
    '''
    try:
        os.renames(current_path, new_path)
    except OSError as e:
        logger.exception("Error renaming file on disk. OSError: [Errno %s], file name: %s, error: %s. Current file name: %s. New file name: %s",
                        e.errno, e.filename, e.strerror, current_path, new_path)
        return False

    logger.debug("Renamed %s to %s", current_path, new_path)
    return True

def get_available_filetypes():
    '''Return a list of file type names that are allowed as values for FileStoreItem.filetype field.
    
    :returns: list -- list of available file type names.
    
    '''
    
    pass

class FileStoreCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass
