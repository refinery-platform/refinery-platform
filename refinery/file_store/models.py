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
    ('bam', 'BAM file'),
    ('bed', 'BED file'),
    ('gz', 'Gzip compressed archive'),
    ('idf', 'IDF file'),
    ('fasta', 'FASTA file'),
    ('fastq', 'FASTQ file'),
    ('tdf', 'TDF file'),
    ('vcf', 'VCF file'),
    ('wig', 'WIG file'),
    ('zip', 'Zip compressed archive'),
)

class FileStoreItemManager(models.Manager):
    ''' '''
    def create_item(self, source, sharename='', filetype=''):
        '''A "constructor" for FileStoreItem.
        
        :param source: URL or absolute file system path to a file.
        :param type: str.
        :returns: FileStoreItem is success, None if failure.

        '''
        if not source:  # it doesn't make sense to create a FileStoreItem without a file source
            logger.error("Source is required but was not provided")
            return None

        item = self.create(source=source, sharename=sharename)

        # assign a file type
        item.set_filetype(filetype)

        # try symlinking
        if os.path.isabs(item.source):
            item.symlink_datafile()

        return item
        
class FileStoreItem(models.Model):
    ''' Represents data files on disk '''
    datafile = models.FileField(upload_to=file_path, storage=fss, blank=True)
    uuid = UUIDField(unique=True, auto=True)
    source = models.CharField(max_length=1024)     # URL or absolute file system path
    sharename = models.CharField(max_length=20, blank=True)
    filetype = models.CharField(max_length=5, choices=FILE_TYPES, blank=True)

    objects = FileStoreItemManager()

    def __unicode__(self):
        return self.datafile.name + ' - ' + self.uuid
    
    def get_absolute_path(self):
        ''' Return absolute path of the data file or None if the file does not exist on disk '''
        try:
            return self.datafile.path
        except ValueError:  # file hasn't been imported yet?
            logger.exception("Datafile doesn't exist in FileStoreItem %s", self.uuid)
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
        '''Retrieve extension of the file on disk or from the source.
        
        :returns: string -- file extension that begins with a period.
        
        '''
        if self.datafile.name:  # try to get extension from file on disk if exists
            return get_extension_from_path(self.datafile.name)
        else:   # otherwise get it from file source
            if os.path.isabs(self.source):  # in case the file has not been symlinked yet
                return get_extension_from_path(self.source)
            else:
                # this is a remote file that has not been copied to file store, so get extension from the source URL
                u = urlparse(self.source)
                name = u.path.split('/')[-1]
                return os.path.splitext(name)[-1]
    
    def get_filetype(self):
        '''Retrieve the type of the datafile.
        
        :returns: string -- type of the datafile.

        '''
        return self.filetype
    
    def set_filetype(self, filetype):
        '''Assign the type of the datafile.  Only existing types allowed as arguments.

        :param filetype: requested file type.
        :returns: True if success, False if failure.

        '''
        # guess the file type if it wasn't provided
        if not filetype:
            filetype = self.get_file_extension().lstrip('.')

        # make sure the file type is valid
        if filetype in get_available_filetypes(): 
            self.filetype = filetype
            self.save()
            logger.info("File type is set to '%s'", filetype)
            return True
        else:
            logger.error("'%s' is an invalid file type", filetype)
            return False

    def is_symlinked(self):
        '''Check if the data file is a symlink.
        
        :returns: True is the datafile is a symlink, False if not.

        '''
        path = self.get_absolute_path()
        if path:
            return os.path.islink(path)
        else:
            logger.error("Path cannot be empty")
            return False

    def is_local(self):
        ''' Check if the datafile can be used as a file object '''
        if not self.datafile.name: return False
        try:
            return os.path.isfile(self.datafile.path)
        except ValueError:
            logger.exception("'%s' is not a file", self.datafile.path)
            return False

    def delete_datafile(self):
        '''
        Delete datafile if it exists on disk
        Return True if deletion succeeded, return False otherwise
        '''
        logger.debug("Deleting datafile '%s'", self.datafile.name)
        
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
        '''Change name of the data file.
        
        :param name: new data file name.
        :type name: str.
        :returns: str -- the name that was assigned by the file storage system if renaming succeeded
        (may not be the same as the requested name in case of conflict), None otherwise.

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
        '''Create a symlink to the file pointed by source.
        Does not check that:
        - the source is an absolute file system path.
        - the datafile already exists.

        :returns: bool -- True if success, False if failure.

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
    '''Check if this FileStoreItem can be used as a file object
    
    :param uuid: UUID of a FileStoreItem
    :type uuid: str.
    :returns: bool -- True if yes, False if no.
    
    '''
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
    '''Return file extension of the file specified by UUID.
    
    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :returns: str -- extension of the data file.
    
    '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None
    return item.get_file_extension()

def get_file_size(uuid, report_symlinks=False):
    '''Return size of the file specified by UUID.
    
    :param uuid: UUID of a FileStoreItem.
    :type uuid: UUID.
    :param report_symlinks: report the size of symlinked files or not.
    :type report_symlink: bool.
    :returns: int -- size of the file on disk.

    '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None

    return item.get_file_size(report_symlinks=report_symlinks)
    
@receiver(pre_delete, sender=FileStoreItem)
def _delete_datafile(sender, **kwargs):
    '''Delete the FileStoreItem datafile when model is deleted
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
    return dict(FILE_TYPES).keys()

def get_extension_from_path(path):
    return os.path.splitext(path)[-1]

class FileStoreCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass
