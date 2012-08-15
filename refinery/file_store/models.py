"""
file_store module

@author: Ilya Sytchev

* Manages all data files
* Downloads files from external repositories (by URL)
* Manage the import cache/public data space

Requirements:

FILE_STORE_DIR setting - main file store directory
* must be a subdirectory of MEDIA_ROOT
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
from django.core.files import File
from django.core.files.storage import FileSystemStorage


logger = logging.getLogger('file_store')


def _mkdir(path):
    '''Create directory given absolute file system path.  Does not create intermediate dirs if they don't exist.

    :param path: Absolute file system path.
    :type path: str.
    :returns: bool -- True if directory was created, False if it wasn't.

    '''
    logger.info("Creating directory %s", path)
    try:
        os.mkdir(path)
    except OSError as e:
        logger.error("Error creating directory\nOSError: [Errno %s], error: %s, path: %s",
                     e.errno, e.strerror, e.filename)
        return False
    logger.info("Directory %s created", path)
    return True


# configure and create file store directories
if not settings.FILE_STORE_DIR:
    settings.FILE_STORE_DIR = 'files'   # relative to MEDIA_ROOT

# absolute path to the file store root dir
FILE_STORE_BASE_DIR = os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
# create this directory in case it doesn't exist
if not os.path.isdir(FILE_STORE_BASE_DIR):
    _mkdir(FILE_STORE_BASE_DIR)

# temp dir should be located on the same file system as the base dir
FILE_STORE_TEMP_DIR = os.path.join(FILE_STORE_BASE_DIR, 'temp')
# create this directory in case it doesn't exist
if not os.path.isdir(FILE_STORE_TEMP_DIR):
    _mkdir(FILE_STORE_TEMP_DIR)


# To make sure we can move uploaded files into file store quickly instead of copying
if not settings.FILE_UPLOAD_TEMP_DIR:
    settings.FILE_UPLOAD_TEMP_DIR = FILE_STORE_TEMP_DIR
# To keep uploaded files always on disk
if not settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
    settings.FILE_UPLOAD_MAX_MEMORY_SIZE = 0


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


#TODO: expand the list of file types. Reference:
# http://wiki.g2.bx.psu.edu/Admin/Datatypes/Adding%20Datatypes
# http://en.wikipedia.org/wiki/List_of_file_formats#Biology
FILE_TYPES = (
    # (extension, description) 
    ('bam', 'Binary compressed SAM'),
    ('bed', 'BED file'),
    ('bigbed', 'Big BED'),
    ('bigwig', 'Big WIG'),
    ('csv', 'Comma Separated Values'),
    ('eland', 'Eland file'),
    ('gff', 'GFF file'),
    ('gz', 'Gzip compressed archive'),
    ('idf', 'IDF file'),
    ('fasta', 'FASTA file'),
    ('fastq', 'FASTQ file'),
    ('fastqcsanger', 'FASTQC Sanger'),
    ('fastqillumina', 'FASTQ Illumina'),
    ('fastqsanger', 'FASTQ Sanger'),
    ('fastqsolexa', 'FASTQ Solexa'),
    ('sam', 'Sequence Alignment/Map'),
    ('tdf', 'TDF file'),
    ('vcf', 'Variant Call Format'),
    ('wig', 'WIG file'),
    ('xml', 'XML file'),
    ('zip', 'Zip compressed archive'),
)


class FileStoreItemManager(models.Manager):
    '''Custom model manager to handle creation and retrieval of FileStoreItems.

    '''
    def create_item(self, source, sharename='', filetype=''):
        '''A "constructor" for FileStoreItem.
        
        :param source: URL or absolute file system path to a file.
        :type source: str.
        :returns: FileStoreItem if success, None if failure.

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

    def get_item(self, uuid):
        '''Handles potential exceptions when retrieving a FileStoreItem.

        :param uuid: UUID of a FileStoreItem.
        :type uuid: str.
        :returns: FileStoreItem -- model instance if exactly one match is found, None otherwise.

        '''
        try:
            item = FileStoreItem.objects.get(uuid=uuid)
        except FileStoreItem.DoesNotExist:
            logger.warn("FileStoreItem with UUID '%s' does not exist", uuid)
            return None
        except FileStoreItem.MultipleObjectsReturned:
            logger.warn("More than one FileStoreItem matched UUID '%s'", uuid)
            return None

        return item


class FileStoreItem(models.Model):
    ''' Represents data files on disk '''
    datafile = models.FileField(upload_to=file_path, storage=fss, blank=True)
    uuid = UUIDField(unique=True, auto=True)
    source = models.CharField(max_length=1024)     # URL or absolute file system path
    sharename = models.CharField(max_length=20, blank=True)
    filetype = models.CharField(max_length=15, choices=FILE_TYPES, blank=True)

    objects = FileStoreItemManager()

    def __unicode__(self):
        return self.uuid + ' - ' + self.datafile.name

    def get_absolute_path(self):
        '''Return the absolute path to the data file.
        
        :returns: str -- the absolute path to the data file or None if the file does not exist on disk.
        
        '''
        try:
            return self.datafile.path
        except ValueError:  # file is not local
            logger.warn("Datafile doesn't exist in FileStoreItem %s", self.uuid)
            return None

    def get_file_size(self, report_symlinks=False):
        '''Return the size of the file in bytes.
        
        :param report_symlinks: report the size of symlinked files or not.
        :type report_symlinks: bool.
        :returns: int -- file size.  Zero if the file is:
         - not local
         - a symlink and report_symlinks=False

        '''
        if self.is_symlinked() and not report_symlinks: return 0

        try:
            return self.datafile.size
        except ValueError:  # file is not local
            logger.warn("Datafile doesn't exist in FileStoreItem '%s'", self.uuid)
            return 0

    def get_file_extension(self):
        '''Return extension of the file on disk or from the source.
        
        :returns: str -- file extension that begins with a period.
        
        '''
        if self.datafile.name:  # try to get extension from file on disk if exists
            return get_extension_from_path(self.datafile.name)
        else:   # otherwise get it from file source
            if os.path.isabs(self.source):
                return get_extension_from_path(self.source)
            else:
                # otherwise treat the source as URL
                u = urlparse(self.source)
                name = u.path.split('/')[-1]
                return os.path.splitext(name)[-1]

    def get_filetype(self):
        '''Retrieve the type of the datafile.
        
        :returns: str -- type of the datafile.

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
        
        :returns: True if the datafile is a symlink, False if not.

        '''
        try:
            return os.path.islink(self.get_absolute_path())
        except TypeError:
            logger.error("Path cannot be None")
            return False

    def is_local(self):
        '''Check if the datafile can be used as a file object.
        
        :returns: bool -- True if the datafile can be used as a file object, False otherwise.

        '''
        path = self.get_absolute_path()
        try:
            return os.path.isfile(path)
        except ValueError:
            logger.error("'%s' is not a file", path)
            return False
        except TypeError:
            logger.warn("Path cannot be None")
            return False

    def delete_datafile(self):
        '''Delete datafile if it exists on disk.
        
        :returns: bool -- True if deletion succeeded, False otherwise.

        '''
        if self.datafile.name:
            logger.debug("Deleting datafile '%s'", self.datafile.name)
            try:
                self.datafile.delete()
            except OSError as e:
                logger.error("Error deleting file\nOSError: [Errno: %s], file name: %s, error: %s",
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
        Does not check that the source is an absolute file system path.

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
                logger.debug("Datafile symlinked")
                return True
            else:
                logger.error("Symlinking failed")
                return False
        else:
            logger.error("Symlinking failed: source is not a file")
            return False

#===============================================================================
#    def copy_datafile(self):
#        '''Copy file from source.
#        Assumes datafile does not exist.
#        Does not check that the source is an absolute file system path.
# 
#        :returns: bool -- True if success, False if failure.
# 
#        '''
#        #TODO: handle out of disk space condition
#        if os.path.isfile(self.source):
#            # check if source file can be opened
#            try:
#                srcfile = File(open(self.source))
#            except IOError:
#                logger.error("Could not open file: %s", self.source)
#                return False
#            srcfilename = os.path.basename(self.source)
# 
#            #TODO: copy file in chunks to display progress report
#            self.datafile.save(srcfilename, srcfile)  # model is saved by default if FileField.save() is called
#            srcfile.close()
#            logger.info("File copied")
#            return True
#        else:
#            logger.error("Copying failed: source is not a file")
#            return False
#===============================================================================

#===============================================================================
#    def download_datafile(self, file_size=1):
#        '''Download file from source.
#        Assumes datafile does not exist.
# 
#        :param file_size: Size of the external files.
#        :type file_size: int.
#        :returns: bool -- True if success, False if failure.
# 
#        '''
#        # download the file from source URL to a temp location on disk
#        tmpfile = tasks.download_file.delay(self.source, file_size).get()
#        if not tmpfile:
#            logger.error("Downloading from '%s' failed", self.source)
#            return False
#    
#        # get the file name from URL (remove query string)
#        u = urlparse(self.source)
#        src_file_name = os.path.basename(u.path)
#        # construct destination path based on source file name
#        rel_dst_path = self.datafile.storage.get_available_name(file_path(self, src_file_name))
#        abs_dst_path = os.path.join(FILE_STORE_BASE_DIR, rel_dst_path)
# 
#        # move the temp file into the file store
#        try:
#            os.renames(tmpfile.name, abs_dst_path)
#        except OSError as e:
#            logger.error("Error moving temp file into the file store\nOSError: %s, file name: %s, error: %s",
#                         e.errno, e.filename, e.strerror)
#            return False
# 
#        # assign new path to datafile
#        self.datafile.name = rel_dst_path
#        # save the model instance
#        self.save()
#        return True
#===============================================================================


def is_local(uuid):
    '''Check if this FileStoreItem can be used as a file object
    
    :param uuid: UUID of a FileStoreItem
    :type uuid: str.
    :returns: bool -- True if yes, False if no.
    
    '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.error("FileStoreItem with UUID %s does not exist", uuid)
        return False

    return item.is_local()


def is_permanent(uuid):
    '''Check if FileStoreItem instance is referenced in the cache.
    
    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.

    '''
    return True


def get_temp_dir():
    '''Return the absolute path to the file store temp dir.

    :returns: str -- absolute path to the file store temp dir.

    '''
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
        logger.error("FileStoreItem with UUID %s does not exist", uuid)
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
        logger.error("FileStoreItem with UUID %s does not exist", uuid)
        return None

    return item.get_file_size(report_symlinks=report_symlinks)


@receiver(pre_delete, sender=FileStoreItem)
def _delete_datafile(sender, **kwargs):
    '''Delete the FileStoreItem datafile when model is deleted.
    Signal handler is required because QuerySet delete() method does a bulk delete
    and does not call any delete() methods on the models.
    
    '''
    item = kwargs.get('instance')
    logger.info("Deleting FileStoreItem with UUID '%s'", item.uuid)
    item.delete_datafile()


def _symlink_file_on_disk(source, target):
    '''Symlink source path to target path creating intermediate directories if they don't exist.
    
    :param source: absolute file system path of the source file.
    :type source: str.
    :param target: absolute file system path of the symlink.
    :type source: str.
    :returns: bool - True if symlinking succeeded, False if failed.

    '''
    target_dir = os.path.dirname(target)

    # create intermediate dirs if they don't already exist
    if not os.path.isdir(target_dir):
        try:
            os.makedirs(target_dir)
        except OSError as e:
            logger.error("Error creating file store directory\nOSError: [Errno %s], file name: %s, error: %s",
                         target_dir, e.errno, e.filename, e.strerror)
            return False

    # create symlink
    try:
        os.symlink(source, target)
    except OSError as e:
        logger.error("Error creating file store symlink\nOSError: [Errno %s], file name: %s, error: %s",
                     e.errno, e.filename, e.strerror)
        return False

    logger.debug("Symlinked %s to %s", source, target)
    return True


def _rename_file_on_disk(current_path, new_path):
    '''Rename a file using absolute paths, creating intermediate directories if they don't exist.
    
    :param current_path: Existing absolute file system path.
    :type current_path: str.
    :param new_path: New absolute file system path.
    :type new_path: str.
    :returns: True if renaming succeeded, False if failed.

    '''
    try:
        os.renames(current_path, new_path)
    except OSError as e:
        logger.error("Error renaming file on disk\nOSError: [Errno %s], file name: %s, error: %s. Current file name: %s. New file name: %s",
                     e.errno, e.filename, e.strerror, current_path, new_path)
        return False

    logger.debug("Renamed %s to %s", current_path, new_path)
    return True


def get_available_filetypes():
    '''Return a list of file type names that are allowed as values for FileStoreItem.filetype field.
    
    :returns: list -- Available file type names.
    
    '''
    return dict(FILE_TYPES).keys()


def get_extension_from_path(path):
    '''Return file extension given its file system path.

    :returns: str -- File extension preceeded by a period.

    '''
    return os.path.splitext(path)[-1]


class FileStoreCache:
    '''
    LRU file cache
    '''
    # doubly-linked list or heapq
    pass


