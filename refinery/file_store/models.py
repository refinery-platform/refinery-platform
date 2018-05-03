"""
* Manages all data files
* Downloads files from external repositories (by URL)

Requirements:

FILE_STORE_DIR setting - main file store directory
* must be a subdirectory of MEDIA_ROOT
* must be writeable by the Django server
"""

import logging
import os
import re
import urlparse

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

import celery
from django_extensions.db.fields import UUIDField

import constants
import core

logger = logging.getLogger(__name__)


def _mkdir(path):
    """Create directory given absolute file system path"""
    # https://stackoverflow.com/a/14364249
    try:
        os.makedirs(path)
    except OSError:
        if not os.path.isdir(path):
            raise
    else:
        logger.info("Created directory '%s'", path)


# create data storage directories
_mkdir(settings.FILE_STORE_BASE_DIR)
_mkdir(settings.FILE_STORE_TEMP_DIR)


def _map_source(source):
    """Convert URLs to file system paths by applying file source map"""
    for pattern, replacement in \
            settings.REFINERY_FILE_SOURCE_MAP.iteritems():
        translated_source = re.sub(pattern, replacement, source)
        if translated_source != source:
            return translated_source
    return source


def generate_file_source_translator(username=None, base_path=None,
                                    identity_id=None):
    """Generate a relative source path translator function based on username
    or base path or AWS Cognito identity ID

    username: user's subdirectory in settings.REFINERY_DATA_IMPORT_DIR
    base_path: absolute path to prepend to source if source is relative
    identity_id: AWS Cognito identity ID of the current user
    """

    def translate(source):
        """Convert file source to absolute path

        source: URL, absolute or relative file system path
        """
        # ignore URLs and absolute file system paths as a failsafe
        if core.utils.is_absolute_url(source) or os.path.isabs(source):
            return source

        # process relative path
        # if REFINERY_DEPLOYMENT_PLATFORM = 'aws' and REFINERY_S3_USER_DATA
        # use settings.COGNITO_IDENTITY_POOL_ID
        if identity_id:
            source = "s3://{}/{}/{}".format(
                settings.UPLOAD_BUCKET, identity_id, source
            )
        elif base_path:
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
    name = models.CharField(unique=True, max_length=50)
    description = models.CharField(max_length=250)
    used_for_visualization = models.BooleanField(default=False)

    def __unicode__(self):
        return self.description if self.description else self.name


class FileExtension(models.Model):
    name = models.CharField(unique=True, max_length=50)
    filetype = models.ForeignKey(FileType)

    def __unicode__(self):
        return self.name


class FileStoreItem(models.Model):
    """Represents all data files"""
    datafile = models.FileField(blank=True, max_length=1024)
    uuid = UUIDField()  # auto-generated unique ID
    # URL, absolute file system path, or blank if source is a blob or similar
    source = models.CharField(blank=True, max_length=1024)
    filetype = models.ForeignKey(FileType, blank=True, null=True)
    # ID of Celery task used for importing the data file
    import_task_id = UUIDField(auto=False, blank=True)
    # Date created
    created = models.DateTimeField(auto_now_add=True)
    # Date updated
    updated = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        if self.datafile.name:
            return self.datafile.name
        elif self.source:
            return self.source
        else:
            return str(self.uuid)  # UUID is available only after save()

    def save(self, *args, **kwargs):
        self.source = _map_source(self.source)

        if not self.filetype:
            # set file type using file extension
            try:
                extension = self.get_file_extension()
            except RuntimeError as exc:
                logger.warn("Could not assign type to file '%s': %s",
                            self, exc)
            else:
                self.filetype = extension.filetype

        # symlink datafile if possible
        if (not self.datafile and os.path.isabs(self.source) and
                settings.REFINERY_DATA_IMPORT_DIR not in self.source and
                get_temp_dir() not in self.source):
            self._symlink_datafile()

        super(FileStoreItem, self).save(*args, **kwargs)

    def get_absolute_path(self):
        """
        Construct the absolute path to the data file.
        :returns: str -- the absolute path to the data file or None if the file
        does not exist on disk.
        """
        if self.datafile and self.datafile.storage.exists(self.datafile.path):
            return self.datafile.path
        else:
            return None

    def get_file_size(self, report_symlinks=False):
        """Return the size of the file in bytes.
        report_symlinks: report the size of symlinked files or not
        returns zero if the file is:
        - not local
        - a symlink and report_symlinks=False
        """
        if self.is_symlinked() and not report_symlinks:
            return 0

        try:
            return self.datafile.size
        except ValueError:  # file is not local
            return 0
        except OSError as exc:
            # file should be there but it is not
            logger.critical("Error getting size for '%s': %s", self, exc)
            return 0

    def get_file_extension(self):
        """Return FileExtension object based on datafile name or source"""
        extension = self.get_extension()
        try:
            return FileExtension.objects.get(name=extension)
        except FileExtension.DoesNotExist:
            extension = _get_extension_from_string(extension)
            try:
                return FileExtension.objects.get(name=extension)
            except FileExtension.DoesNotExist as exc:
                raise RuntimeError(
                    "Extension '{}' is not valid: {}".format(extension, exc)
                )
            except FileExtension.MultipleObjectsReturned as exc:
                raise RuntimeError(exc)
        except FileExtension.MultipleObjectsReturned as exc:
            raise RuntimeError(exc)

    def get_extension(self):
        """Return extension of datafile name or file name in source"""
        if self.datafile.name:
            return _get_extension_from_string(self.datafile.name)
        else:
            return _get_extension_from_string(self.source)

    def get_file_object(self):
        """Return file object for the data file or None if failed to open"""
        try:
            # FieldFile.open() and File.open() don't return file objects, so
            # accessing it directly
            return self.datafile.file.file  # FileStoreItem.FieldFile.File.file
        except ValueError as exc:
            logger.error("Error opening %s: %s", self.datafile, exc)
            return None

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
        """Check if the datafile is a regular file"""
        try:
            return os.path.isfile(self.get_absolute_path())
        except ValueError:
            logger.error("'%s' is not a file", self.get_absolute_path())
        except TypeError:  # no datafile available or file does not exist
            pass
        return False

    def delete_datafile(self, save_instance=True):
        """Delete datafile on disk and cancel file import"""
        self.terminate_file_import_task()
        if self.datafile:
            file_name = self.datafile.name
            logger.debug("Deleting datafile '%s'", file_name)
            try:
                self.datafile.delete(save=save_instance)
            except OSError as exc:
                logger.error("Error deleting file '%s': %s", file_name, exc)
            else:
                logger.info("Deleted datafile '%s'", file_name)

    def rename_datafile(self, name):
        """Change name of the data file
        New name may not be the same as the requested name in case of conflict
        with an existing file
        """
        logger.debug("Renaming datafile '%s' to '%s'",
                     self.datafile.name, name)
        if self.is_local():
            # obtain a new path based on requested name
            new_relative_path = default_storage.get_name(name)
            new_absolute_path = os.path.join(settings.FILE_STORE_BASE_DIR,
                                             new_relative_path)
            if _rename_file_on_disk(self.datafile.path, new_absolute_path):
                self.datafile.name = new_relative_path
                self.save()
                return os.path.basename(self.datafile.name)
            else:
                logger.error("Renaming datafile '%s' failed",
                             self.datafile.name)
                return None
        else:
            logger.error("Datafile does not exist")
            return None

    def _symlink_datafile(self):
        """Create a symlink to the file pointed by source
        Note: does not save the model
        """
        logger.debug("Symlinking datafile to '%s'", self.source)

        if os.path.isfile(self.source):
            # construct symlink target path based on source file name
            rel_dst_path = default_storage.get_name(
                os.path.basename(self.source)
            )
            abs_dst_path = os.path.join(settings.FILE_STORE_BASE_DIR,
                                        rel_dst_path)
            # create symlink
            if _symlink_file_on_disk(self.source, abs_dst_path):
                # update the model with the symlink path
                self.datafile.name = rel_dst_path
                logger.debug("Datafile symlinked")
            else:
                logger.error("Symlinking failed")
        else:
            logger.error("Symlinking failed: source is not a file")

    def get_datafile_url(self):
        """Returns relative or absolute URL of the datafile depending on file
        availability and MEDIA_URL setting
        """
        try:
            return self.datafile.url
        except ValueError:
            if core.utils.is_absolute_url(self.source):
                if self.source.startswith('s3://'):
                    return None  # file is in the UPLOAD_BUCKET
                return self.source
        logger.error("File not found at '%s'", self.datafile.name)
        return None

    def get_import_status(self):
        """Return file import task state"""
        if not self.import_task_id:
            return constants.NOT_AVAILABLE
        return celery.result.AsyncResult(self.import_task_id).state

    def terminate_file_import_task(self):
        if self.import_task_id:
            logger.info("Terminating import task '%s' for '%s'",
                        self.import_task_id, self)
            result = celery.result.AsyncResult(self.import_task_id)
            result.revoke(terminate=True)


def get_temp_dir():
    """Return the absolute path to the file store temp dir"""
    return settings.FILE_STORE_TEMP_DIR


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


# post_delete is safer than pre_delete
@receiver(post_delete, sender=FileStoreItem)
def _delete_datafile(sender, instance, **kwargs):
    """Delete the datafile when model is deleted
    Signal handler is required because QuerySet bulk delete does not call
    delete() method on the models
    """
    instance.delete_datafile(save_instance=False)


def _symlink_file_on_disk(source, link_name):
    """Create a symbolic link pointing to source path named link_name"""
    link_dir = os.path.dirname(link_name)

    # create intermediate dirs if they do not already exist
    if not os.path.isdir(link_dir):
        try:
            os.makedirs(link_dir)
        except OSError as exc:
            logger.error("Error creating directory '%s': %s", link_dir, exc)
            return False

    # create symbolic link
    try:
        os.symlink(source, link_name)
    except OSError as exc:
        logger.error("Error creating symlink '%s': %s", link_name, exc)
        return False

    logger.debug("Created symlink '%s' to '%s'", link_name, source)
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


def _get_extension_from_string(path):
    """Return file extension given a file name, file system path, or URL"""
    file_name_parts = os.path.basename(path).split('.')
    if len(file_name_parts) == 1:  # no periods in file name
        return ''
    if len(file_name_parts) > 2:  # two or more periods in file name
        return '.'.join(file_name_parts[-2:])
    return file_name_parts[-1]  # one period in file name


def parse_s3_url(url):
    """Return a tuple containing S3 bucket name and object key given S3
    protocol URL (s3://bucket-name/key)
    """
    result = urlparse.urlparse(url)
    return result.netloc, result.path[1:]  # strip leading slash
