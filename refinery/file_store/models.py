"""
file_store module

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
from celery.result import AsyncResult

from django.conf import settings
from django.dispatch import receiver
from django.db import models
from django.db.models.signals import pre_delete
from django_extensions.db.fields import UUIDField
from django.core.files.storage import FileSystemStorage

from core.utils import is_url, get_aware_local_time


logger = logging.getLogger(__name__)


def _mkdir(path):
    """Create directory given absolute file system path.
    Does not create intermediate dirs if they don't exist.

    :param path: Absolute file system path.
    :type path: str.
    :returns: bool -- True if directory was created, False if it wasn't.
    """
    logger.debug("Creating directory '%s'", path)
    try:
        os.mkdir(path)
    except OSError as e:
        logger.error("Error creating directory '%s': %s", path, e)
        return False
    logger.info("Created directory '%s'", path)
    return True


# configure and create file store directories
if not settings.FILE_STORE_DIR:
    settings.FILE_STORE_DIR = 'file_store'  # relative to MEDIA_ROOT

# absolute path to the file store root dir
FILE_STORE_BASE_DIR = os.path.join(settings.MEDIA_ROOT,
                                   settings.FILE_STORE_DIR)
# create this directory in case it doesn't exist
if not os.path.isdir(FILE_STORE_BASE_DIR):
    _mkdir(FILE_STORE_BASE_DIR)

# temp dir should be located on the same file system as the base dir
FILE_STORE_TEMP_DIR = os.path.join(FILE_STORE_BASE_DIR, 'temp')
# create this directory in case it doesn't exist
if not os.path.isdir(FILE_STORE_TEMP_DIR):
    _mkdir(FILE_STORE_TEMP_DIR)

# To make sure we can move uploaded files into file store quickly instead of
# copying
if not settings.FILE_UPLOAD_TEMP_DIR:
    settings.FILE_UPLOAD_TEMP_DIR = FILE_STORE_TEMP_DIR
# To keep uploaded files always on disk
if not settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
    settings.FILE_UPLOAD_MAX_MEMORY_SIZE = 0

# http://stackoverflow.com/q/4832626
FILE_STORE_BASE_URL = \
    urljoin(settings.MEDIA_URL, settings.FILE_STORE_DIR) + '/'


def file_path(instance, filename):
    """Construct relative file system path for new file store files relative to
    FILE_STORE_BASE_DIR.
    Based on
    http://michaelandrews.typepad.com/the_technical_times/2009/10/creating-a-hashed-directory-structure.html

    :param instance: FileStoreItem instance.
    :type instance: FileStoreItem.
    :param filename: requested filename.
    :type filename: str.
    :returns: str -- if success, None if failure.
    """
    hashcode = hash(filename)
    mask = 255  # bitmask
    # use the first and second bytes of the hash code represented as
    # zero-padded hex numbers as directory names
    # provides 256 * 256 = 65536 of possible directory combinations
    dir1 = "{:0>2x}".format(hashcode & mask)
    dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
    # replace parentheses with underscores in the filename since
    # Galaxy doesn't process names with parentheses in them
    filename = re.sub('[()]', '_', filename)
    return os.path.join(instance.sharename, dir1, dir2, filename)


def map_source(source):
    """convert URLs to file system paths by applying file source map"""
    for pattern, replacement in \
            settings.REFINERY_FILE_SOURCE_MAP.iteritems():
        translated_source = re.sub(pattern, replacement, source)
        if source != translated_source:
            source = translated_source
            break
    return source


def generate_file_source_translator(username='', base_path=''):
    """Generate file source reference translator function based on username or
    base_path
    username: user's subdirectory in settings.REFINERY_DATA_IMPORT_DIR
    base_path: absolute path to prepend to source if source is relative
    """

    def translate(source):
        """Convert file source to absolute path
        source: URL, absolute or relative file system path
        """
        source = map_source(source.strip())
        # ignore URLs and absolute file paths
        if is_url(source) or os.path.isabs(source):
            return source
        # process relative path
        if base_path:
            source = os.path.join(base_path, source)
        elif username:
            source = os.path.join(
                settings.REFINERY_DATA_IMPORT_DIR, username, source)
        else:
            raise ValueError("Failed to translate relative source path: "
                             "must provide either username or base_path")
        return source

    return translate


class FileType(models.Model):
    #: name of file extension
    name = models.CharField(unique=True, max_length=50)
    #: short description of file extension
    description = models.CharField(max_length=250)

    def __unicode__(self):
        return self.description


class FileExtension(models.Model):
    # file extension associated with the filename
    name = models.CharField(unique=True, max_length=50)
    filetype = models.ForeignKey(FileType)

    def __unicode__(self):
        return self.name


class _FileStoreItemManager(models.Manager):
    """Custom model manager to handle creation and retrieval of FileStoreItems
    """

    def create_item(self, source, sharename='', filetype=''):
        """A "constructor" for FileStoreItem.

        :param source: URL or absolute file system path to a file.
        :type source: str.
        :returns: FileStoreItem -- if success, None if failure.
        """
        # it doesn't make sense to create a FileStoreItem without a file source
        if not source:
            logger.error("Source is required but was not provided")
            return None

        item = self.create(source=map_source(source), sharename=sharename)

        item.set_filetype(filetype)

        # symlink if source is a file system path outside of the import dir
        if (os.path.isabs(item.source) and settings.
                REFINERY_DATA_IMPORT_DIR not in item.source):
            item.symlink_datafile()

        return item

    def get_item(self, uuid):
        """Handles potential exceptions when retrieving a FileStoreItem
        :param uuid: UUID of a FileStoreItem.
        :type uuid: str.
        :returns: FileStoreItem -- model instance if exactly one match is
        found, None otherwise.
        """
        try:
            item = FileStoreItem.objects.get(uuid=uuid)
        except FileStoreItem.DoesNotExist:
            logger.warn("FileStoreItem with UUID '%s' does not exist", uuid)
            return None
        except FileStoreItem.MultipleObjectsReturned:
            logger.warn("More than one FileStoreItem matched UUID '%s'", uuid)
            return None

        return item


class SymlinkedFileSystemStorage(FileSystemStorage):
    '''Custom file system storage class with support for symlinked files.

    '''

    def exists(self, name):
        # takes broken symlinks into account
        return os.path.lexists(self.path(name))


symlinked_storage = SymlinkedFileSystemStorage(location=FILE_STORE_BASE_DIR,
                                               base_url=FILE_STORE_BASE_URL)


class FileStoreItem(models.Model):
    '''Represents data files on disk.

    '''
    #: file on disk
    datafile = models.FileField(
        upload_to=file_path,
        storage=symlinked_storage,
        blank=True,
        max_length=1024
    )
    #: unique ID
    uuid = UUIDField(unique=True, auto=True)
    #: source URL or absolute file system path
    source = models.CharField(max_length=1024)
    #: optional subdirectory inside the file store that contains the files of a
    # particular group
    sharename = models.CharField(max_length=20, blank=True)
    #: type of the file
    filetype = models.ForeignKey(FileType, null=True)
    #: file import task ID
    import_task_id = UUIDField(blank=True)
    # Date created
    created = models.DateTimeField(auto_now_add=True,
                                   default=get_aware_local_time,
                                   blank=True)
    # Date updated
    updated = models.DateTimeField(auto_now=True,
                                   default=get_aware_local_time,
                                   blank=True)

    objects = _FileStoreItemManager()

    def __unicode__(self):
        return self.uuid + ' - ' + self.datafile.name

    def get_absolute_path(self):
        """Compute the absolute path to the data file.
        :returns: str -- the absolute path to the data file or None if the file
        does not exist on disk.
        """
        if self.datafile and self.datafile.storage.exists(self.datafile.path):
            return self.datafile.path
        else:
            return None

    def get_file_size(self, report_symlinks=False):
        """Return the size of the file in bytes.
        :param report_symlinks: report the size of symlinked files or not.
        :type report_symlinks: bool.
        :returns: int -- file size. Zero if the file is:
        - not local
        - a symlink and report_symlinks=False
        """
        if self.is_symlinked() and not report_symlinks:
            return 0

        try:
            return self.datafile.size
        except ValueError:  # file is not local
            return 0

    def get_file_extension(self):
        '''Return extension of the file on disk or from the source.

        :returns: str -- file extension that begins with a period.

        '''
        # try to get extension from file on disk if exists
        if self.datafile.name:
            return get_extension_from_path(self.datafile.name)
        else:  # otherwise get it from file source
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
            # FieldFile.open() and File.open() don't return file objects, so
            # accessing it directly
            return self.datafile.file.file  # FileStoreItem.FieldFile.File.file
        except ValueError as e:
            logger.error("%s [%s]", e.message, self.uuid)
            return None

    def get_filetype(self):
        """Retrieve the type of the datafile.

        :returns: FileType object.

        """
        return self.filetype

    def set_filetype(self, filetype=''):
        """Assign the type of the datafile.
        Only existing types allowed as arguments.

        :param filetype: requested file type.
        :type filetype: str.
        :returns: True if success, False if failure.

        """
        # make sure the file type is valid before assigning it to model field

        all_known_extensions = [e.name for e in
                                FileExtension.objects.all()]

        # If filetype argument is one that we know of great, Else we try to
        # guess
        if filetype in all_known_extensions:
            f = filetype
        else:
            f = str(self.source.rpartition("/")[-1]).split('.', 1)[-1]

        # Set the filetype of the FileStoreItem instance, if we still dont
        # know the filetype after our guess earlier, we try to split on a
        # '.' again etc. If we fail, the filetype is set to unknown
        try:
            if f in all_known_extensions:
                self.filetype = FileType.objects.get(
                    description=FileExtension.objects.get(name=f).filetype)
            else:
                f = f.split('.', 2)[-1]
                if f in all_known_extensions:
                    self.filetype = FileType.objects.get(
                        description=FileExtension.objects.get(
                            name=f).filetype)
                else:
                    f = f.rpartition(".")[-1]
                    if f in all_known_extensions:
                        self.filetype = FileType.objects.get(
                            description=FileExtension.objects.get(
                                name=f).filetype)
                    else:
                        # If we cannot assign a filetype after all of this,
                        # we let the filetype associated with the filestore
                        # item be null
                        pass

            self.save()
            logger.info("File type is set to '%s'", f)
            return True

        except Exception as e:
            logger.error("Couldn't save:%s with extension: %s, %s" % (self,
                                                                      f, e))
            return False

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

        :returns: bool -- True if the datafile can be used as a file object,
            False otherwise.

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
        """Delete datafile if it exists on disk.

        :returns: bool -- True if deletion succeeded, False otherwise.
        """
        if self.datafile.name:
            logger.debug("Deleting datafile '%s'", self.datafile.name)
            try:
                self.datafile.delete()
            except OSError as e:
                logger.error(
                    "Error deleting file. "
                    "OSError: [Errno: %s], file name: %s, error: %s",
                    e.errno, e.filename, e.strerror)
                return False
            logger.info("Datafile deleted")
            return True
        else:  # datafile doesn't exist
            return False

    def rename_datafile(self, name):
        """Change name of the data file.
        New name may not be the same as the requested name in case of conflict
        with an existing file.

        :param name: new data file name.
        :type name: str.
        :returns: str -- new name if renaming succeeded, None otherwise.

        """
        logger.debug("Renaming datafile %s to %s", self.datafile.name, name)

        if self.is_local():
            # obtain a new path based on requested name
            new_rel_path = self.datafile.storage.get_available_name(
                file_path(self, name)
            )
            new_abs_path = os.path.join(FILE_STORE_BASE_DIR, new_rel_path)

            # rename the physical file
            if _rename_file_on_disk(self.datafile.path, new_abs_path):
                # update the model with new path
                self.datafile.name = new_rel_path
                # TODO: update FileField only: update_fields=['name']
                self.save()
                logger.info("Datafile renamed")
                return os.path.basename(self.datafile.name)
            else:
                logger.error("Renaming failed")
                return None
        else:
            logger.error("Datafile does not exist")
            return None

    def symlink_datafile(self):
        """Create a symlink to the file pointed by source.
        Does not check that the source is an absolute file system path.

        :returns: bool -- True if success, False if failure.

        """
        logger.debug("Symlinking datafile to %s", self.source)

        if os.path.isfile(self.source):
            # construct symlink target path based on source file name
            rel_dst_path = self.datafile.storage.get_available_name(
                file_path(self, os.path.basename(self.source)))
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

    def get_datafile_url(self):
        """ This returns the url for a given FileStoreItem. If the FileStoreItem
        `is_local` then the url is constructed using the get_full_url method.
        :param self: the FileStoreItem that we want a url for
        :type self: A FileStoreItem instance
        :returns: A url for the given FileStoreItem or None
        """

        if self.is_local():
            return self.datafile.url
        else:
            # data file doesn't exist on disk
            if os.path.isabs(self.source):
                # source is a file system path
                logger.error("File not found at '%s'",
                             self.datafile.name)
                return None
            else:
                # source is a URL
                return self.source

    def get_import_status(self):
        """Return file import task state"""
        return AsyncResult(self.import_task_id).state


def is_local(uuid):
    """Check if this FileStoreItem can be used as a file object
    :param uuid: UUID of a FileStoreItem
    :type uuid: str.
    :returns: bool -- True if yes, False if no.
    """
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
        logger.error(
            "Could not open file: %s - error(%s): %s",
            file_name, e.errno, e.strerror
        )
        return None


@receiver(pre_delete, sender=FileStoreItem)
def _delete_datafile(sender, **kwargs):
    """Delete the FileStoreItem datafile when model is deleted.
    Signal handler is required because QuerySet delete() method does a bulk
    delete and does not call any delete() methods on the models.

    """
    item = kwargs.get('instance')
    logger.debug("Deleting FileStoreItem with UUID '%s'", item.uuid)
    item.delete_datafile()


def _symlink_file_on_disk(source, target):
    '''Symlink source path to target path creating intermediate directories if
    they don't exist.

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
            logger.error(
                "Error creating file store directory. "
                "OSError: [Errno %s], file name: %s, error: %s",
                target_dir, e.errno, e.filename, e.strerror)
            return False

    # create symlink
    try:
        os.symlink(source, target)
    except OSError as e:
        logger.error(
            "Error creating file store symlink. "
            "OSError: [Errno %s], file name: %s, error: %s",
            e.errno, e.filename, e.strerror)
        return False

    logger.debug("Symlinked %s to %s", source, target)
    return True


def _rename_file_on_disk(current_path, new_path):
    '''Rename a file using absolute paths, creating intermediate directories if
    they don't exist.

    :param current_path: Existing absolute file system path.
    :type current_path: str.
    :param new_path: New absolute file system path.
    :type new_path: str.
    :returns: True if renaming succeeded, False if failed.

    '''
    try:
        os.renames(current_path, new_path)
    except OSError as e:
        logger.error(
            "Error renaming file on disk\nOSError: [Errno %s], file name: %s, "
            "error: %s. Current file name: %s. New file name: %s",
            e.errno, e.filename, e.strerror, current_path, new_path
        )
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
