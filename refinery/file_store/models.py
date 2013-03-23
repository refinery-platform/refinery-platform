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
import re
import logging
from urlparse import urlparse, urljoin
from django.conf import settings
from django.dispatch import receiver
from django.db import models
from django.db.models.signals import pre_delete
from django_extensions.db.fields import UUIDField
from django.contrib.sites.models import Site
from django.core.files.storage import FileSystemStorage


logger = logging.getLogger('file_store')


def _mkdir(path):
    '''Create directory given absolute file system path.
    Does not create intermediate dirs if they don't exist.

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
    settings.FILE_STORE_DIR = 'file_store'   # relative to MEDIA_ROOT

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
    '''Construct relative file system path for new file store files relative to FILE_STORE_BASE_DIR.
    Based on http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html

    :param instance: FileStoreItem instance.
    :type instance: FileStoreItem.
    :param filename: requested filename.
    :type filename: str.
    :returns: str -- if success, None if failure.

    '''
    hashcode = hash(filename)
    mask = 255  # bitmask
    # use the first and second bytes of the hash code represented as zero-padded hex numbers as directory names
    # provides 256 * 256 = 65536 of possible directory combinations
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    # replace parentheses with underscores in the filename since
    # Galaxy doesn't process names with parentheses in them
    filename = re.sub('[()]', '_', filename)
    return os.path.join(instance.sharename, dir1, dir2, filename)


# http://stackoverflow.com/questions/4832626/how-does-django-construct-the-url-returned-by-filesystemstorage
FILE_STORE_BASE_URL = urljoin(settings.MEDIA_URL, settings.FILE_STORE_DIR) + '/'
# set the file store location
fss = FileSystemStorage(location=FILE_STORE_BASE_DIR, base_url=FILE_STORE_BASE_URL)


#TODO: expand the list of file types. Reference:
# http://wiki.g2.bx.psu.edu/Admin/Datatypes/Adding%20Datatypes
# http://en.wikipedia.org/wiki/List_of_file_formats#Biology

# list of file types in alphabetical order for convenience
BAM = 'bam'
BED = 'bed'
BIGBED = 'bigbed'
BIGWIG = 'bigwig'
CBS = 'cbs'
CEL = 'cel'
CSV = 'csv'
ELAND = 'eland'
GFF = 'gff'
GTF = 'gtf'
GZ = 'gz'
IDF = 'idf'
FASTA = 'fasta'
FASTQ = 'fastq'
FASTQCSANGER = 'fastqcsanger'
FASTQILLUMINA = 'fastqillumina'
FASTQSANGER = 'fastqsanger'
FASTQSOLEXA = 'fastqsolexa'
SAM = 'sam'
SEG = 'seg'
TABULAR = 'tabular'
TDF = 'tdf'
TGZ = 'tgz'
TXT = 'txt'
VCF = 'vcf'
WIG = 'wig'
XML = 'xml'
ZIP = 'zip'
UNKNOWN = ''    # special catch-all type with no corresponding extension

# file types with descriptions used by FileStoreItem.filetype choice field
FILE_TYPES = (
    # (type, description) in alphabetical order for convenience
    (BAM, 'Binary compressed SAM'),
    (BED, 'BED file'),
    (BIGBED, 'Big BED'),
    (BIGWIG, 'Big WIG'),
    (CBS, 'Circular Binary Segmentation File'), # see SEG below
    (CEL, 'Affymetrix Probe Results file'),
    (CSV, 'Comma Separated Values'),
    (ELAND, 'Eland file'),
    (GFF, 'GFF file'),
    (GTF, 'GTF file'),
    (GZ, 'Gzip compressed archive'),
    (IDF, 'IDF file'),
    (FASTA, 'FASTA file'),
    (FASTQ, 'FASTQ file'),
    (FASTQCSANGER, 'FASTQC Sanger'),
    (FASTQILLUMINA, 'FASTQ Illumina'),
    (FASTQSANGER, 'FASTQ Sanger'),
    (FASTQSOLEXA, 'FASTQ Solexa'),
    (SAM, 'Sequence Alignment/Map'),
    (SEG, 'Segmented Data File'), # http://www.broadinstitute.org/software/igv/SEG
    (TABULAR, 'Tabular file'),
    (TDF, 'TDF file'),
    (TGZ, 'Gzip compressed tar archive'),
    (TXT, 'Text file'),
    (VCF, 'Variant Call Format'),
    (WIG, 'Wiggle Track Format'),
    (XML, 'XML file'),
    (ZIP, 'Zip compressed archive'),
    (UNKNOWN, 'Unknown file type'),
)

# mapping of file extensions to file types
# in alphabetical order by type with extensions of the same type
# located on the same line for convenience
FILE_EXTENSIONS = {
    'bam': BAM,
    'bed': BED,
    'bigbed': BIGBED, 'bb': BIGBED,
    'bigwig': BIGWIG,
    'cel': CEL,
    'csv': CSV,
    'eland': ELAND,
    'gff': GFF,
    'gtf': GTF,
    'gz': GZ,
    'idf': IDF,
    'fasta': FASTA,
    'fastq': FASTQ,
    'fastqcsanger': FASTQCSANGER,
    'fastqillumina': FASTQILLUMINA,
    'fastqsanger': FASTQSANGER,
    'fastqsolexa': FASTQSOLEXA,
    'sam': SAM,
    'tabular': TABULAR,
    'tdf': TDF,
    'tgz': TGZ,
    'txt': TXT,
    'vcf': VCF,
    'wig': WIG,
    'xml': XML,
    'zip': ZIP,
}


class _FileStoreItemManager(models.Manager):
    '''Custom model manager to handle creation and retrieval of FileStoreItems.

    '''
    def create_item(self, source, sharename='', filetype=''):
        '''A "constructor" for FileStoreItem.
        
        :param source: URL or absolute file system path to a file.
        :type source: str.
        :returns: FileStoreItem -- if success, None if failure.

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
    '''Represents data files on disk.
    
    '''
    #: file on disk
    datafile = models.FileField(upload_to=file_path, storage=fss, blank=True, max_length=1024)
    #: unique ID
    uuid = UUIDField(unique=True, auto=True)
    #: source URL or absolute file system path
    source = models.CharField(max_length=1024)
    #: optional subdirectory inside the file store that contains the files of a particular group
    sharename = models.CharField(max_length=20, blank=True)
    #: type of the file
    filetype = models.CharField(max_length=15, choices=FILE_TYPES, blank=True)

    objects = _FileStoreItemManager()

    def __unicode__(self):
        return self.uuid + ' - ' + self.datafile.name

    def get_absolute_path(self):
        '''Compute the absolute path to the data file.
        
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

    def get_file_object(self):
        '''Open data file.

        :returns: file object -- or None if failed to open data file.

        '''
        try:
            # FieldFile.open() and File.open() don't return file objects, so accessing it directly
            return self.datafile.file.file  # FileStoreItem.FieldFile.File.file
        except ValueError as e:
            logger.error("%s [%s]", e.message, self.uuid)
            return None

    def get_filetype(self):
        '''Retrieve the type of the datafile.
        
        :returns: str -- type of the datafile.

        '''
        return self.filetype

    def set_filetype(self, filetype=''):
        '''Assign the type of the datafile.
        Only existing types allowed as arguments.

        :param filetype: requested file type.
        :type filetype: str.
        :returns: True if success, False if failure.

        '''
        # if type wasn't provided guess it from extension
        if not filetype:
            filetype = self.get_file_extension().lstrip('.')

        filetype = filetype.lower()
        # make sure the file type is valid before assigning it to model field
        try:
            self.filetype = FILE_EXTENSIONS[filetype]
        except KeyError:
            logger.info("'%s' is an unknown file type", filetype)
            self.filetype = UNKNOWN
            return False

        self.save()
        logger.info("File type is set to '%s'", filetype)
        return True

    def is_symlinked(self):
        '''Check if the data file is a symlink.
        
        :returns: True if the datafile is a symlink, False if not.

        '''
        path = self.get_absolute_path()
        if path:
            return os.path.islink(path)
        else:
            return False

    def is_local(self):
        '''Check if the datafile can be used as a file object.

        :returns: bool -- True if the datafile can be used as a file object, False otherwise.

        '''
        path = self.get_absolute_path()
        if path:
            try:
                return os.path.isfile(path)
            except ValueError:
                logger.error("'%s' is not a file", path)
            except TypeError:
                logger.error("Path must be a string")
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
        New name may not be the same as the requested name in case of conflict with an existing file.

        :param name: new data file name.
        :type name: str.
        :returns: str -- new name if renaming succeeded, None otherwise.

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

    def get_full_url(self):
        '''Return the full URL (including hostname) for the datafile.

        :returns: str -- local URL or source if it's a remote file

        '''
        if self.is_local():
            try:
                current_site = Site.objects.get_current()
            except Site.DoesNotExist:
                logger.error("Cannot provide a full URL: no sites configured or SITE_ID is not set correctly")
            return 'http://{}{}'.format(current_site.domain, self.datafile.url)
        else:
            if os.path.abspath(self.source):
                # in case source is a file system path but file doesn't exist on disk
                return None
            else:
                return self.source

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


def get_file_object(file_name):
    '''Open file given its name.

    :param file_name: name of the file.
    :type file_name: str.
    :returns: file object -- or None if failed to open file.

    '''
    try:
        return open(file_name, 'rb')
    except IOError as e:
        logger.error("Could not open file: %s - error(%s): %s", file_name, e.errno, e.strerror)
        return None


@receiver(pre_delete, sender=FileStoreItem)
def _delete_datafile(sender, **kwargs):
    '''Delete the FileStoreItem datafile when model is deleted.
    Signal handler is required because QuerySet delete() method does a bulk delete
    and does not call any delete() methods on the models.

    '''
    item = kwargs.get('instance')
    logger.debug("Deleting FileStoreItem with UUID '%s'", item.uuid)
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


