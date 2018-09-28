import logging
import os
import shutil
import stat
import urlparse

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.crypto import get_random_string
from django.utils.deconstruct import deconstructible
from django.utils.text import get_valid_filename

import boto3
import botocore
import requests
from storages.backends.s3boto3 import S3Boto3Storage

logger = logging.getLogger(__name__)

# permissions for objects uploaded to MEDIA_BUCKET
S3_WRITE_ARGS = {'ACL': 'public-read'}
# placeholder value for when file size is unknown
UNKNOWN_FILE_SIZE = 0


class S3MediaStorage(S3Boto3Storage):
    """Django media (user data) files storage"""
    bucket_name = settings.MEDIA_BUCKET
    custom_domain = settings.MEDIA_BUCKET + '.s3.amazonaws.com'
    file_overwrite = False

    def get_available_name(self, name, max_length=None):
        while True:
            # remove leading '-' characters to make file management easier
            # limit file name length to 255 to make "fully portable" in POSIX
            name = os.path.join(get_random_string(7), name.lstrip('-')[-255:])
            if not self.exists(name):
                return name

    # custom methods

    def get_name(self, name):
        return self.get_available_name(get_valid_filename(name))


@deconstructible
class SymlinkedFileSystemStorage(FileSystemStorage):
    """Custom file system storage class with support for symlinked files"""

    # Allow for SymlinkedFileSystemStorage to be settings-agnostic
    # SEE: http://stackoverflow.com/a/32349636/6031066
    def __init__(self):
        super(SymlinkedFileSystemStorage, self).__init__(
            location=settings.FILE_STORE_BASE_DIR,
            base_url=settings.FILE_STORE_BASE_URL
        )

    def exists(self, name):
        # takes broken symlinks into account
        return os.path.lexists(self.path(name))

    def get_available_name(self, name, max_length=None):
        # remove './' that is added by FileField.get_directory_name() when
        # upload_to is set to '' by default
        # TODO: remove this when get_directory_name() is removed in Django 2.0
        name = os.path.normpath(name)
        # create a hashed directory structure
        hashcode = hash(name)
        mask = 255  # bitmask
        # use the first and second bytes of the hash code represented as
        # zero-padded hex numbers as directory names
        # provides 256 * 256 = 65,536 of possible directory combinations
        dir1 = "{:0>2x}".format(hashcode & mask)
        dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
        # remove leading '-' characters to make file management easier
        # limit file name length to 255 to make "fully portable" in POSIX
        name = os.path.join(dir1, dir2, name.lstrip('-')[-255:])
        return super(SymlinkedFileSystemStorage, self).get_available_name(name)

    # custom methods

    def get_name(self, name):
        return self.get_available_name(get_valid_filename(name))


def copy_file_object(source, destination, progress_report=lambda _: None):
    """Copy a file object and update progress"""
    chunk_size = 10 * 1024 * 1024  # 10MB
    logger.debug("Copying '%s' to '%s'", source.name, destination.name)
    try:
        for chunk in iter(lambda: source.read(chunk_size), ''):
            destination.write(chunk)
            progress_report(len(chunk))
        # ensure that all internal buffers are written to disk
        destination.flush()
        os.fsync(destination.fileno())
    except EnvironmentError as exc:
        raise RuntimeError("Error copying '{}' to '{}': {}".format(
            source.name, destination.name, exc
        ))
    logger.info("Copied '%s' to '%s'", source.name, destination.name)


def copy_s3_object(source_bucket, source_key, destination_bucket,
                   destination_key, progress_report=lambda _: None):
    """Copy S3 object and update task progress"""
    s3 = boto3.client('s3')
    logger.debug("Started copying from 's3://%s/%s' to 's3://%s/%s'",
                 source_bucket, source_key, destination_bucket,
                 destination_key)
    try:
        s3.copy(CopySource={'Bucket': source_bucket, 'Key': source_key},
                Bucket=destination_bucket, Key=destination_key,
                ExtraArgs=S3_WRITE_ARGS, Callback=progress_report)
    except (botocore.exceptions.ClientError,
            botocore.exceptions.ParamValidationError) as exc:
        raise RuntimeError(
            "Error copying from 's3://{}/{}' to 's3://{}/{}': {}".format(
                source_bucket, source_key, destination_bucket,
                destination_key, exc
            )
        )
    logger.info("Finished copying from 's3://%s/%s' to 's3://%s/%s'",
                source_bucket, source_key, destination_bucket,
                destination_key)


def delete_file(absolute_path):
    if os.path.exists(absolute_path):
        try:
            os.unlink(absolute_path)
        except EnvironmentError as exc:
            logger.error("Error deleting '%s': %s", absolute_path, exc)
        else:
            logger.debug("Deleted '%s'", absolute_path)


def delete_s3_object(bucket, key):
    s3 = boto3.client('s3')
    logger.debug("Deleting 's3://%s/%s'",  bucket, key)
    try:
        s3.delete_object(Bucket=bucket, Key=key)
    except (botocore.exceptions.ClientError,
            botocore.exceptions.ParamValidationError) as exc:
        logger.error("Error deleting 's3://%s/%s': %s", bucket, key, exc)
    else:
        logger.info("Deleted 's3://%s/%s'", bucket, key)


def download_file_object(request_response, download_object,
                         progress_report=lambda _: None):
    """Download file from request response object to a temporary file and
    report progress"""
    chunk_size = 10 * 1024 * 1024  # 10MB
    logger.debug("Started downloading from '%s'", request_response.url)
    try:
        for chunk in request_response.iter_content(chunk_size):
            download_object.write(chunk)
            progress_report(len(chunk))
        # ensure that all internal buffers are written to disk
        download_object.flush()
        os.fsync(download_object.fileno())
    except EnvironmentError as exc:
        raise RuntimeError("Error downloading from '{}' to '{}': {}".format(
            request_response.url, download_object.name, exc))
    logger.info("Finished downloading from '%s' to '%s'",
                request_response.url, download_object.name)


def download_s3_object(bucket, key, download_object,
                       progress_report=lambda _: None):
    """Download object from S3 to a temp file and update task progress"""
    s3 = boto3.client('s3')
    logger.debug("Started downloading from 's3://%s/%s' to '%s'",
                 bucket, key, download_object.name)
    try:
        s3.download_fileobj(bucket, key, download_object,
                            Callback=progress_report)
        # ensure that all internal buffers are written to disk
        download_object.flush()
        os.fsync(download_object.fileno())
    except (EnvironmentError, botocore.exceptions.ClientError,
            botocore.exceptions.ParamValidationError) as exc:
        raise RuntimeError(
            "Error downloading from 's3://{}/{}' to '{}': {}".format(
                bucket, key, download_object.name, exc
            )
        )
    logger.info("Finished downloading from 's3://%s/%s' to '%s'",
                bucket, key, download_object.name)


def get_file_size(file_location):
    """Return return file size given location as an integer number of bytes"""
    if os.path.isabs(file_location):
        try:
            return os.path.getsize(file_location)
        except EnvironmentError:
            return UNKNOWN_FILE_SIZE
    elif file_location.startswith('s3://'):
        s3 = boto3.client('s3')
        bucket, key = parse_s3_url(file_location)
        try:
            return s3.head_object(Bucket=bucket, Key=key)['ContentLength']
        except (botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError):
            return UNKNOWN_FILE_SIZE
    else:
        try:
            response = requests.head(file_location)
            response.raise_for_status()
        except requests.exceptions.RequestException:
            return UNKNOWN_FILE_SIZE
        else:
            # Content-Length header is optional, so provide a default value
            return int(response.headers.get('Content-Length',
                                            UNKNOWN_FILE_SIZE))


def make_dir(path):
    """Create directory given absolute file system path"""
    # https://stackoverflow.com/a/14364249
    try:
        os.makedirs(path)
    except OSError as exc:
        if not os.path.isdir(path):
            raise RuntimeError(str(exc))
    else:
        logger.info("Created directory '%s'", path)


def move_file(source_path, destination_path):
    """Move file from one absolute file system path to another"""
    make_dir(os.path.dirname(destination_path))
    try:
        shutil.move(source_path, destination_path)
    except EnvironmentError as exc:
        raise RuntimeError("Error moving '{}' to '{}': {}".format(
                           source_path, destination_path, exc))
    # temp files are only accessible by the owner by default which prevents
    # access by the web server if it is running as its own user
    try:
        mode = os.stat(destination_path).st_mode
        os.chmod(destination_path,
                 mode | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH)
    except EnvironmentError as exc:
        logger.error("Error changing permissions on '%s': %s",
                     destination_path, exc)
    logger.info("Moved '%s' to '%s'", source_path, destination_path)


def parse_s3_url(url):
    """Return a tuple containing S3 bucket name and object key given S3
    protocol URL (s3://bucket-name/key)
    """
    result = urlparse.urlparse(url)
    return result.netloc, result.path[1:]  # strip leading slash


def symlink_file(source_path, link_path):
    """Create a symlink link_path to source_path"""
    if not os.path.isfile(source_path):
        raise RuntimeError(
            "Error creating symlink to '{}': not a file".format(source_path)
        )
    make_dir(os.path.dirname(link_path))
    try:
        os.symlink(source_path, link_path)
    except EnvironmentError as exc:
        raise RuntimeError("Error creating symlink '{}': {}".format(
            link_path, exc))
    logger.info("Created symlink '%s' to '%s'", link_path, source_path)


def upload_file_object(source, bucket, key, progress_report=lambda _: None):
    """Upload file from source path to S3 bucket and report progress"""
    s3 = boto3.client('s3')
    logger.debug("Started uploading from '%s' to 's3://%s/%s'",
                 source.name, bucket, key)
    try:
        s3.upload_fileobj(source, bucket, key, ExtraArgs=S3_WRITE_ARGS,
                          Callback=progress_report)
    except (EnvironmentError, botocore.exceptions.ClientError,
            botocore.exceptions.ParamValidationError) as exc:
        raise RuntimeError(
            "Error uploading from '{}' to 's3://{}/{}': {}".format(
                source.name, bucket, key, exc
            )
        )
    logger.info("Finished uploading from '%s' to 's3://%s/%s'",
                source.name, bucket, key)
