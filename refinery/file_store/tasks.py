from __future__ import division
import os
import shutil
import stat
from tempfile import NamedTemporaryFile
import threading
import urlparse

from django.conf import settings

import boto3
import botocore
import celery
import requests

from data_set_manager.models import Node

from .models import FileStoreItem, make_dir, get_temp_dir, parse_s3_url
from .utils import S3MediaStorage, SymlinkedFileSystemStorage

logger = celery.utils.log.get_task_logger(__name__)
logger.setLevel(celery.utils.LOG_LEVELS['DEBUG'])


class FileImportTask(celery.Task):
    track_started = True

    def run(self, item_source, symlink=True):
        logger.info("Importing file")
        try:
            if settings.REFINERY_S3_USER_DATA:
                if os.path.isabs(item_source):
                    self.import_path_to_s3(item_source)
                elif item_source.startswith('s3://'):
                    self.import_s3_to_s3(item_source)
                else:
                    self.import_url_to_s3(item_source)
            else:
                if os.path.isabs(item_source):
                    self.import_path_to_path(item_source, symlink)
                elif item_source.startswith('s3://'):
                    self.import_s3_to_path(item_source)
                else:
                    self.import_url_to_path(item_source)
        except RuntimeError as exc:
            logger.error("File import failed: %s", exc)
            self.update_state(state=celery.states.FAILURE,
                              meta='Failed to import file')
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()
        logger.info("File imported successfully")

    def import_path_to_path(self, source_path, symlink):
        """Import file from an absolute file system path into
        FILE_STORE_BASE_DIR
        """
        storage = SymlinkedFileSystemStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))
        file_store_path = storage.path(file_store_name)

        if source_path.startswith((settings.REFINERY_DATA_IMPORT_DIR,
                                   get_temp_dir())):
            move_file(source_path, file_store_path)
        else:
            if symlink:
                symlink_file(source_path, file_store_path)
            else:
                make_dir(os.path.dirname(file_store_path))
                try:
                    with open(source_path, 'rb') as source, \
                            open(file_store_path, 'wb') as destination:
                        try:
                            copy_file_object(source, destination,
                                             ProgressPercentage(
                                                 source_path, self.request.id
                                             ))
                        except RuntimeError:
                            delete_file(file_store_path)
                            raise
                except EnvironmentError as exc:
                    raise RuntimeError("Error copying '{}' to '{}': {}".format(
                        source_path, file_store_path, exc
                    ))

        return file_store_name

    def import_path_to_s3(self, source_path):
        """Import file from an absolute file system path into MEDIA_BUCKET"""
        storage = S3MediaStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))
        try:
            with open(source_path, 'rb') as source_file_object:
                upload_file_object(
                    source_file_object, settings.MEDIA_BUCKET, file_store_name,
                    ProgressPercentage(source_path, self.request.id)
                )
        except EnvironmentError as exc:
            raise RuntimeError("Error copying '{}': {}".format(source_path,
                                                               exc))

        if source_path.startswith(get_temp_dir()):
            self.delete_file(source_path)

        return file_store_name

    def import_s3_to_path(self, source_url):
        """Import S3 object from s3:// URL into FILE_STORE_BASE_DIR"""
        source_bucket, source_key = parse_s3_url(source_url)
        with NamedTemporaryFile(dir=get_temp_dir(), delete=False) as temp_file:
            try:
                download_s3_object(source_bucket, source_key, temp_file,
                                   ProgressPercentage(source_url,
                                                      self.request.id))
            except RuntimeError:
                delete_file(temp_file.name)
                raise

        storage = SymlinkedFileSystemStorage()
        # remove query string from URL before extracting file name
        file_store_name = storage.get_name(os.path.basename(source_key))
        move_file(temp_file.name, storage.path(file_store_name))

        if source_bucket == settings.UPLOAD_BUCKET:
            delete_s3_object(source_bucket, source_key)

        return file_store_name

    def import_s3_to_s3(self, source_url):
        """Transfer S3 object from UPLOAD_BUCKET to MEDIA_BUCKET"""
        source_bucket, source_key = parse_s3_url(source_url)
        storage = S3MediaStorage()
        file_store_name = storage.get_name(os.path.basename(source_key))
        copy_s3_object(source_bucket, source_key, settings.MEDIA_BUCKET,
                       file_store_name, ProgressPercentage(source_url,
                                                           self.request.id))
        if source_bucket == settings.UPLOAD_BUCKET:
            delete_s3_object(source_bucket, source_key)

        return file_store_name

    def import_url_to_path(self, source_url):
        """Import file from URL into FILE_STORE_BASE_DIR"""
        try:
            request_response = requests.get(source_url, stream=True)
            request_response.raise_for_status()
        except requests.exceptions.RequestException as exc:
            raise RuntimeError("Error downloading from '{}': '{}'".format(
                               source_url, exc))
        with NamedTemporaryFile(dir=get_temp_dir(), delete=False) as temp_file:
            try:
                download_file_object(request_response, temp_file,
                                     ProgressPercentage(source_url,
                                                        self.request.id))
            except RuntimeError:
                delete_file(temp_file.name)
                raise

        storage = SymlinkedFileSystemStorage()
        # remove query string from URL before extracting file name
        source_file_name = os.path.basename(urlparse.urlparse(source_url).path)
        file_store_name = storage.get_name(source_file_name)
        move_file(temp_file.name, storage.path(file_store_name))

        return file_store_name

    def import_url_to_s3(self, source_url):
        """Download file from URL and upload to MEDIA_BUCKET"""
        try:
            request_response = requests.get(source_url, stream=True)
            request_response.raise_for_status()
        except requests.exceptions.RequestException as exc:
            raise RuntimeError("Error downloading from '{}': '{}'".format(
                               source_url, exc))
        with NamedTemporaryFile(dir=get_temp_dir()) as temp_file:
            download_file_object(
                request_response, temp_file, ProgressPercentage(
                    source_url, self.request.id, 0, 50
                )
            )
            temp_file.seek(0)
            storage = S3MediaStorage()
            # remove query string from URL before extracting file name
            source_file_name = os.path.basename(
                urlparse.urlparse(source_url).path
            )
            file_store_name = storage.get_name(source_file_name)
            upload_file_object(
                temp_file, settings.MEDIA_BUCKET, file_store_name,
                ProgressPercentage(temp_file.name, self.request.id, 50, 100)
            )
        return file_store_name


class ProgressPercentage(object):
    """Callable for progress monitoring of file transfers
    https://boto3.readthedocs.io/en/stable/_modules/boto3/s3/transfer.html
    """
    def __init__(self, file_location, task_id, min_percent=0, max_percent=100):
        self._file_size = get_file_size(file_location)
        self._import_task_id = task_id
        self._min = min_percent
        self._max = max_percent
        self._seen_so_far = 0
        self._lock = threading.Lock()

    def __call__(self, bytes_amount):
        # to simplify we'll assume this is hooked up to a single filename
        with self._lock:
            self._seen_so_far += bytes_amount
            # file size may not be available for some download objects
            if self._file_size > 0:
                percentage = (self._seen_so_far * (self._max - self._min) /
                              self._file_size + self._min)
            else:
                percentage = 0
            FileImportTask().update_state(
                self._import_task_id, state='PROGRESS', meta={
                    'percent_done': '{:.0f}'.format(percentage),
                    'current': self._seen_so_far,
                    'total': self._file_size
                }
            )


def get_file_size(file_location):
    UNKNOWN_SIZE = 0
    if os.path.isabs(file_location):
        try:
            return os.path.getsize(file_location)
        except EnvironmentError:
            return UNKNOWN_SIZE
    elif file_location.startswith('s3://'):
        s3 = boto3.client('s3')
        bucket, key = parse_s3_url(file_location)
        try:
            return s3.head_object(Bucket=bucket, Key=key)['ContentLength']
        except (botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError):
            return UNKNOWN_SIZE
    else:
        try:
            response = requests.head(file_location)
            response.raise_for_status()
        except requests.exceptions.RequestException:
            return UNKNOWN_SIZE
        else:
            # Content-Length header is optional, so provide a default value
            return int(response.headers.get('Content-Length', UNKNOWN_SIZE))


@celery.task.task(track_started=True)
def import_file(uuid, refresh=False, file_size=0):
    """Download or copy file specified by UUID
    refresh: force overwriting the file
    file_size: size of the remote file
    """
    logger.debug("Importing FileStoreItem with UUID '%s'", uuid)

    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except (FileStoreItem.DoesNotExist,
            FileStoreItem.MultipleObjectsReturned) as exc:
        logger.error("Error importing FileStoreItem with UUID '%s': %s",
                     uuid, exc)
        import_file.update_state(state=celery.states.FAILURE,
                                 meta='Failed to import file')
        # http://stackoverflow.com/a/33143545
        raise celery.exceptions.Ignore()

    # exit if an import task is already running for this file
    if item.import_task_id:
        result = celery.result.AsyncResult(item.import_task_id)
        if result.state in list(celery.states.UNREADY_STATES) + ['PROGRESS']:
            logger.error(
                "File import is already in progress for '%s' - task ID: '%s'",
                item, item.import_task_id
            )
            import_file.update_state(state=celery.states.FAILURE,
                                     meta='Failed to import file')
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()

    # save task ID for looking up file import status
    if import_file.request.id:  # to avoid error if called not as task
        item.import_task_id = import_file.request.id
        item.save()

    # check if datafile should be updated
    if item.is_local():
        if refresh:
            logger.info("Data file replacement requested: deleting data file")
            item.datafile.delete(save=False)
        else:
            logger.info("File already exists: '%s'", item.get_absolute_path())
            return

    # start the transfer
    if os.path.isabs(item.source):
        # file is in a temp dir or a locally mounted external file system
        pass
    elif item.source.startswith('s3://'):
        # file is in a S3 bucket (for example: UPLOAD_BUCKET)
        pass
    else:  # assume that source is a regular URL
        # check if source file can be downloaded
        try:
            response = requests.get(item.source, stream=True)
            response.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            logger.error("Could not open URL '%s': '%s'", item.source, exc)
            import_file.update_state(state=celery.states.FAILURE,
                                     meta='Failed to import file from URL')
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()
        # FIXME: When importing a tabular file into Refinery, there is a
        # dependence on this ConnectionError below returning `None`!!!!
        except (requests.exceptions.ConnectionError, ValueError) as exc:
            logger.error("Could not open URL '%s': '%s'", item.source, exc)
            return None

        with NamedTemporaryFile(dir=get_temp_dir(), delete=False) as tmpfile:
            # provide a default value in case Content-Length is missing
            remote_file_size = int(
                response.headers.get('Content-Length', file_size)
            )
            logger.debug("Downloading from '%s'", item.source)
            # download and save the file
            import_failure = False
            local_file_size = 0
            block_size = 10 * 1024 * 1024  # bytes
            try:
                for buf in response.iter_content(block_size):
                    local_file_size += len(buf)

                    try:
                        tmpfile.write(buf)
                    except IOError as exc:
                        # e.g., [Errno 28] No space left on device
                        logger.error("Error downloading from '%s': %s",
                                     item.source, exc)
                        import_failure = True
                        break

                    # check if we have a sane value for file size
                    if remote_file_size > 0:
                        percent_done = \
                            local_file_size * 100. / remote_file_size
                    else:
                        percent_done = 0

                    import_file.update_state(
                        state="PROGRESS",
                        meta={
                            "percent_done": "{:.0f}".format(percent_done),
                            "current": local_file_size,
                            "total": remote_file_size
                        }
                    )
            except requests.exceptions.ContentDecodingError as e:
                logger.error("Error while decoding response content:%s" % e)
                import_failure = True

            if import_failure:
                # delete temp. file if download failed
                logger.error(
                    "File import task has failed. Deleting temporary file..."
                )
                tmpfile.delete = True
                import_file.update_state(state=celery.states.FAILURE,
                                         meta='Failed to import file from URL')
                # http://stackoverflow.com/a/33143545
                raise celery.exceptions.Ignore()

        logger.debug("Finished downloading from '%s'", item.source)

        # get the file name from URL (remove query string)
        source_path = urlparse.urlparse(item.source).path
        # construct destination path based on source file name
        storage = SymlinkedFileSystemStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))
        file_store_path = storage.path(file_store_name)
        # move the temp file into the file store
        try:
            if not os.path.exists(os.path.dirname(file_store_path)):
                os.makedirs(os.path.dirname(file_store_path))
            # os.renames() prunes rightmost path segments of the old name
            os.rename(tmpfile.name, file_store_path)
        except (IOError, OSError) as exc:
            logger.error("Error moving temp file '%s' into the file store: %s",
                         tmpfile.name, exc)
            import_file.update_state(state=celery.states.FAILURE,
                                     meta='Failed to import file from URL')
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()
        # temp file is only accessible by the owner by default which prevents
        # access by the web server if it is running as its own user
        try:
            mode = os.stat(file_store_path).st_mode
            os.chmod(file_store_path,
                     mode | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH)
        except (IOError, OSError) as exc:
            logger.error("Failed changing permissions on '%s': %s",
                         file_store_path, exc)
        # assign new path to datafile
        item.datafile.name = file_store_name

    item.save()

    return item.uuid


@celery.signals.task_postrun.connect(sender=import_file)
def update_solr_index(**kwargs):
    """Updates Solr with file import state"""
    # allow for the use of keyword or positional argument
    try:
        file_store_item_uuid = kwargs['kwargs']['uuid']
    except KeyError:
        file_store_item_uuid = kwargs['args'][0]

    try:
        node = Node.objects.get(file_uuid=file_store_item_uuid)
    except (Node.DoesNotExist, Node.MultipleObjectsReturned) as exc:
        logger.error("Could not retrieve Node with file UUID '%s': %s",
                     file_store_item_uuid, exc)
    else:
        node.update_solr_index()
        logger.info("Updated Solr index with file import state for Node '%s'",
                    node.uuid)


@celery.signals.task_success.connect(sender=import_file)
def begin_auxiliary_node_generation(**kwargs):
    # NOTE: Celery docs suggest to access these fields through kwargs as the
    # structure of celery signal handlers changes often
    # http://docs.celeryproject.org/en/3.1/userguide/signals.html#basics
    file_store_item_uuid = kwargs['result']
    try:
        node = Node.objects.get(file_uuid=file_store_item_uuid)
    except (Node.DoesNotExist, Node.MultipleObjectsReturned) as exc:
        logger.error("Couldn't retrieve Node: %s", exc)
    else:
        node.run_generate_auxiliary_node_task()


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
                # TODO Remove this entirely, no associated import_file task?
                import_file.update_state(
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


def copy_file_object(source, destination, progress_report):
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
                   destination_key, progress_report):
    """Copy S3 object and update task progress"""
    s3 = boto3.client('s3')
    logger.debug("Started copying from 's3://%s/%s' to 's3://%s/%s'",
                 source_bucket, source_key, destination_bucket,
                 destination_key)
    try:
        s3.copy(CopySource={'Bucket': source_bucket, 'Key': source_key},
                Bucket=destination_bucket, Key=destination_key,
                Callback=progress_report)
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
        logger.debug("Deleted '%s'", absolute_path)


def delete_s3_object(bucket, key):
    s3 = boto3.client('s3')
    logger.debug("Deleting 's3://%s/%s'",  bucket, key)
    try:
        s3.delete_object(Bucket=bucket, Key=key)
    except (botocore.exceptions.ClientError,
            botocore.exceptions.ParamValidationError) as exc:
        logger.error("Error deleting 's3://%s/%s': %s", bucket, key, exc)
    logger.info("Deleted 's3://%s/%s'", bucket, key)


def download_file_object(request_response, download_object, progress_report):
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


def download_s3_object(bucket, key, download_object, progress_report):
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


def upload_file_object(source, bucket, key, progress_report):
    """Upload file from source path to S3 bucket and report progress"""
    s3 = boto3.client('s3')
    logger.debug("Started uploading from '%s' to 's3://%s/%s'",
                 source.name, bucket, key)
    try:
        s3.upload_fileobj(source, bucket, key,
                          ExtraArgs={'ACL': 'public-read'},
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
