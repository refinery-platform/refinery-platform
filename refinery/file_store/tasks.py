from __future__ import division
import contextlib
import os
import tempfile
import threading
import urllib2
import urlparse

from django.conf import settings

import botocore
import celery
import requests

from .models import FileStoreItem
from .utils import (S3MediaStorage, SymlinkedFileSystemStorage,
                    copy_file_object, copy_s3_object, delete_file,
                    delete_s3_object, download_s3_object, get_file_size,
                    make_dir, move_file, parse_s3_url, symlink_file,
                    upload_file_object)

logger = celery.utils.log.get_task_logger(__name__)
logger.setLevel(celery.utils.LOG_LEVELS[settings.REFINERY_LOG_LEVEL])


class FileImportTask(celery.Task):

    soft_time_limit = 3600  # 1 hour

    def run(self, item_uuid, target_name=None):
        """Download or copy data file for FileStoreItem specified by UUID
        Fail the task in case of errors (http://stackoverflow.com/a/33143545)
        """
        logger.debug("Importing FileStoreItem with UUID '%s'", item_uuid)

        try:
            item = FileStoreItem.objects.get(uuid=item_uuid)
        except (FileStoreItem.DoesNotExist,
                FileStoreItem.MultipleObjectsReturned) as exc:
            logger.error("Error importing FileStoreItem with UUID '%s': %s",
                         item_uuid, exc)
            self.update_state(state=celery.states.FAILURE,
                              meta='Failed to import file')
            raise celery.exceptions.Ignore()

        if item.datafile:
            logger.info("Import canceled: data file '%s' already exists", item)
            return

        # exit if an import task is already running for this file
        if item.import_task_id:
            result = celery.result.AsyncResult(item.import_task_id)
            if result.state in celery.states.UNREADY_STATES | {'PROGRESS'}:
                logger.error("File import is already in progress for '%s'",
                             item)
                self.update_state(state=celery.states.FAILURE,
                                  meta='Failed to import file')
                raise celery.exceptions.Ignore()

        # save task ID for looking up file import status
        item.import_task_id = self.request.id
        item.save()

        # transfer data file
        try:
            if settings.REFINERY_S3_USER_DATA:
                if os.path.isabs(item.source):
                    file_store_name = self.import_path_to_s3(item.source)
                elif item.source.startswith('s3://'):
                    file_store_name = self.import_s3_to_s3(item.source)
                else:
                    file_store_name = self.import_url_to_s3(item.source,
                                                            target_name)
            else:
                if os.path.isabs(item.source):
                    file_store_name = self.import_path_to_path(item.source)
                elif item.source.startswith('s3://'):
                    file_store_name = self.import_s3_to_path(item.source)
                else:
                    file_store_name = self.import_url_to_path(item.source,
                                                              target_name)
        except (RuntimeError, celery.exceptions.SoftTimeLimitExceeded) as exc:
            logger.error("File import failed: %s", exc)
            self.update_state(state=celery.states.FAILURE,
                              meta='Failed to import file')
            raise celery.exceptions.Ignore()

        item.datafile.name = file_store_name
        item.save()
        logger.info("Imported FileStoreItem with UUID '%s'", item_uuid)

    def import_path_to_path(self, source_path, symlink=True):
        """Import file from an absolute file system path into
        REFINERY_FILE_STORE_ROOT
        """
        storage = SymlinkedFileSystemStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))
        file_store_path = storage.path(file_store_name)

        logger.debug("Transferring from '%s' to '%s'",
                     source_path, file_store_path)
        if source_path.startswith((settings.REFINERY_DATA_IMPORT_DIR,
                                   tempfile.gettempdir())):
            move_file(source_path, file_store_path)
        else:
            if symlink:
                symlink_file(source_path, file_store_path)
            else:
                make_dir(os.path.dirname(file_store_path))
                try:
                    with open(source_path, 'rb') as source, \
                            open(file_store_path, 'wb') as destination:
                        copy_file_object(source, destination,
                                         ProgressPercentage(
                                             source_path, self.request.id
                                         ))
                except EnvironmentError as exc:
                    delete_file(file_store_path)
                    raise RuntimeError("Error copying '{}' to '{}': {}".format(
                        source_path, file_store_path, exc
                    ))
        logger.info("Finished transferring from '%s' to '%s'",
                    source_path, file_store_path)

        return file_store_name

    def import_path_to_s3(self, source_path):
        """Import file from an absolute file system path into MEDIA_BUCKET"""
        storage = S3MediaStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))

        logger.debug("Transferring from '%s' to 's3://%s/%s'",
                     source_path, settings.MEDIA_BUCKET, file_store_name)
        try:
            with open(source_path, 'rb') as source_file_object:
                upload_file_object(
                    source_file_object, settings.MEDIA_BUCKET, file_store_name,
                    ProgressPercentage(source_path, self.request.id)
                )
        except (EnvironmentError, botocore.exceptions.BotoCoreError,
                botocore.exceptions.ClientError) as exc:
            raise RuntimeError("Error copying from '{}': {}".format(
                source_path, exc))
        logger.info("Finished transferring from '%s' to 's3://%s/%s'",
                    source_path, settings.MEDIA_BUCKET, file_store_name)

        if source_path.startswith(tempfile.gettempdir()):
            delete_file(source_path)

        return file_store_name

    def import_s3_to_path(self, source_url):
        """Import S3 object from s3:// URL into REFINERY_FILE_STORE_ROOT"""
        source_bucket, source_key = parse_s3_url(source_url)
        storage = SymlinkedFileSystemStorage()
        file_store_name = storage.get_name(os.path.basename(source_key))
        file_store_path = storage.path(file_store_name)

        logger.debug("Transferring from '%s' to '%s'",
                     source_url, file_store_path)
        make_dir(os.path.dirname(file_store_path))
        try:
            with open(file_store_path, 'wb') as destination:
                download_s3_object(source_bucket, source_key, destination,
                                   ProgressPercentage(source_url,
                                                      self.request.id))
        except (EnvironmentError, botocore.exceptions.BotoCoreError,
                botocore.exceptions.ClientError) as exc:
            delete_file(file_store_path)
            raise RuntimeError(
                "Error downloading from '{}' to '{}': {}".format(
                    source_url, file_store_path, exc
                )
            )
        logger.info("Finished transferring from '%s' to '%s'",
                    source_url, file_store_path)

        if source_bucket == settings.UPLOAD_BUCKET:
            delete_s3_object(source_bucket, source_key)

        return file_store_name

    def import_s3_to_s3(self, source_url):
        """Transfer S3 object from UPLOAD_BUCKET to MEDIA_BUCKET"""
        source_bucket, source_key = parse_s3_url(source_url)
        storage = S3MediaStorage()
        file_store_name = storage.get_name(os.path.basename(source_key))

        logger.debug("Transferring from 's3://%s/%s' to 's3://%s/%s'",
                     source_bucket, source_key, settings.MEDIA_BUCKET,
                     file_store_name)
        try:
            copy_s3_object(
                source_bucket, source_key, settings.MEDIA_BUCKET,
                file_store_name, ProgressPercentage(source_url,
                                                    self.request.id)
            )
        except (botocore.exceptions.BotoCoreError,
                botocore.exceptions.ClientError) as exc:
            raise RuntimeError(
                "Error copying from '{}' to 's3://{}/{}': {}".format(
                    source_url, settings.MEDIA_BUCKET, file_store_name, exc
                )
            )
        logger.info("Finished transferring from 's3://%s/%s' to 's3://%s/%s'",
                    source_bucket, source_key, settings.MEDIA_BUCKET,
                    file_store_name)

        if source_bucket == settings.UPLOAD_BUCKET:
            delete_s3_object(source_bucket, source_key)

        return file_store_name

    def import_url_to_path(self, source_url, target_name=None):
        """Import file from URL into REFINERY_FILE_STORE_ROOT"""
        # move the file from temp dir into file store dir
        storage = SymlinkedFileSystemStorage()
        # remove query string from URL before extracting file name
        if target_name is None:
            target_name = os.path.basename(urlparse.urlparse(source_url).path)
        file_store_name = storage.get_name(target_name)
        file_store_path = storage.path(file_store_name)

        logger.debug("Transferring from '%s' to '%s'",
                     source_url, file_store_path)
        make_dir(os.path.dirname(file_store_path))
        try:
            with contextlib.closing(urllib2.urlopen(source_url,
                                                    timeout=30)) as response, \
                    open(file_store_path, 'wb') as destination:
                copy_file_object(response, destination,
                                 ProgressPercentage(source_url,
                                                    self.request.id))
        except EnvironmentError as exc:
            delete_file(file_store_path)
            raise RuntimeError("Error downloading from '{}': '{}'".format(
                source_url, exc))
        logger.info("Finished transferring from '%s' to '%s'",
                    source_url, file_store_path)

        return file_store_name

    def import_url_to_s3(self, source_url, target_name=None):
        """Download file from URL and upload to MEDIA_BUCKET"""
        storage = S3MediaStorage()
        # remove query string from URL before extracting file name
        if target_name is None:
            target_name = os.path.basename(urlparse.urlparse(source_url).path)
        file_store_name = storage.get_name(target_name)

        logger.debug("Transferring from '%s' to 's3://%s/%s'",
                     source_url, settings.MEDIA_BUCKET, file_store_name)
        try:
            with contextlib.closing(urllib2.urlopen(source_url, timeout=30)) \
                    as response:
                upload_file_object(
                    response, settings.MEDIA_BUCKET, file_store_name,
                    ProgressPercentage(source_url, self.request.id)
                )
        except (EnvironmentError, botocore.exceptions.BotoCoreError,
                botocore.exceptions.ClientError) as exc:
            raise RuntimeError(
                "Error transferring from '{}' to 's3://{}/{}': {}".format(
                    source_url, settings.MEDIA_BUCKET, file_store_name, exc
                )
            )
        logger.info("Finished transferring from '%s' to 's3://%s/%s'",
                    source_url, settings.MEDIA_BUCKET, file_store_name)

        return file_store_name


class ProgressPercentage(object):
    """Callable for progress monitoring of file transfers
    https://boto3.readthedocs.io/en/stable/_modules/boto3/s3/transfer.html
    """
    def __init__(self, file_location, task_id):
        self._file_size = get_file_size(file_location)
        self._import_task_id = task_id
        self._seen_so_far = 0
        self._lock = threading.Lock()

    def __call__(self, bytes_amount):
        # to simplify we'll assume this is hooked up to a single filename
        with self._lock:
            self._seen_so_far += bytes_amount
            # file size may not be available for some download objects
            if self._file_size > 0:
                percent_done = (self._seen_so_far / self._file_size) * 100
            else:
                percent_done = 0
            FileImportTask().update_state(
                self._import_task_id, state='PROGRESS', meta={
                    'percent_done': '{:.0f}'.format(percent_done),
                    'current': self._seen_so_far, 'total': self._file_size
                }
            )


@celery.task.task()
def download_file(url, target_path, file_size=1):
    '''Download file to target_path from specified URL.
    Raises DonwloadError

    :param url: Source URL.
    :type url: str.
    :param target_path: absolute file system path to a temp file
    :type target_path: str
    :param file_size: Size of the remote file.
    :type file_size: int.
    '''
    # TODO: handle out of disk space condition
    logger.debug("Downloading file from '%s'", url)

    # check if source file can be downloaded
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.error(exc)
        raise RuntimeError("Could not open URL '{}': {}".format(url, exc))
    except ValueError as exc:
        raise RuntimeError("Could not open URL '{}'".format(url, exc))
    else:
        # get remote file size, provide a default value in case
        # Content-Length is missing
        remotefilesize = int(
            response.headers.get("Content-Length", file_size)
        )

    try:
        destination = open(target_path, 'wb+')
    except IOError as exc:
        raise RuntimeError(exc)
    else:
        # download and save the file
        localfilesize = 0
        blocksize = 8 * 2 ** 10    # 8 Kbytes
        for buf in iter(lambda: response.raw.read(blocksize), ''):
            localfilesize += len(buf)
            destination.write(buf)
            # check if we have a sane value for file size
            if remotefilesize > 0:
                percent_done = localfilesize * 100. / remotefilesize
            else:
                percent_done = 0
                download_file.update_state(
                    state="PROGRESS",
                    meta={
                        "percent_done": "%3.2f%%" % percent_done,
                        "current": localfilesize,
                        "total": remotefilesize
                    }
                )
        # cleanup
        # TODO: delete temp file if download failed
        destination.flush()
        destination.close()

    response.close()
    logger.debug("Finished downloading")
