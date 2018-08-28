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

    def copy_file(self, source_path, destination_path):
        """Copy a file from one absolute file system path to another"""
        make_dir(os.path.dirname(destination_path))
        try:
            with open(source_path, 'rb') as source, \
                    open(destination_path, 'wb') as destination:
                try:
                    self.copy_file_obj(source, destination)
                except RuntimeError:
                    self.delete_file(destination_path)
                    raise
                # ensure that all internal buffers are written to disk
                destination.flush()
                os.fsync(destination.fileno())
        except EnvironmentError as exc:
            raise RuntimeError("Error copying '{}' to '{}': {}".format(
                source_path, destination_path, exc))

    def copy_file_obj(self, source_obj, destination_obj):
        """Copy a file object and update progress"""
        chunk_size = 10 * 1024 * 1024  # 10MB
        progress_report = ProgressPercentage(os.path.getsize(source_obj.name),
                                             self.request.id)
        try:
            for chunk in iter(lambda: source_obj.read(chunk_size), ''):
                destination_obj.write(chunk)
                progress_report(len(chunk))
        except EnvironmentError as exc:
            raise RuntimeError("Error copying '{}' to '{}': {}".format(
                source_obj.name, destination_obj.name, exc
            ))

    def copy_s3_object(self, source_url, destination_bucket, destination_key):
        """Copy S3 object and update task progress"""
        source_bucket, source_key = parse_s3_url(source_url)
        s3 = boto3.client('s3')
        try:
            source_size = s3.head_object(Bucket=source_bucket,
                                         Key=source_key)['ContentLength']
            s3.copy(CopySource={'Bucket': source_bucket, 'Key': source_key},
                    Bucket=destination_bucket, Key=destination_key,
                    Callback=ProgressPercentage(source_size, self.request.id))
        except (botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError) as exc:
            raise RuntimeError(
                "Error copying from 's3://{}/{}' to 's3://{}/{}': {}".format(
                    source_bucket, source_key, destination_bucket,
                    destination_key, exc
                )
            )

    @staticmethod
    def delete_file(absolute_path):
        if os.path.exists(absolute_path):
            try:
                os.unlink(absolute_path)
            except EnvironmentError as exc:
                logger.error("Error deleting '%s': %s", absolute_path, exc)
            logger.debug("Deleted '%s'", absolute_path)

    @staticmethod
    def delete_s3_object(bucket, key):
        s3 = boto3.client('s3')
        logger.debug("Deleting 's3://%s/%s'",  bucket, key)
        try:
            s3.delete_object(Bucket=bucket, Key=key)
        except (botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError) as exc:
            logger.error("Failed to delete 's3://%s/%s': %s", bucket, key, exc)
        logger.info("Deleted 's3://%s/%s'", bucket, key)

    def download_file(self, source_url):
        """Download file from URL to a temporary file"""
        try:
            response = requests.get(source_url, stream=True)
            response.raise_for_status()
        except requests.exceptions.RequestException as exc:
            raise RuntimeError("Could not open URL '{}': '{}'".format(
                               source_url, exc))
        try:
            with NamedTemporaryFile(dir=get_temp_dir(),
                                    delete=False) as download_object:
                try:
                    self.download_file_obj(response, download_object)
                except RuntimeError:
                    self.delete_file(download_object.name)
                    raise
                # ensure that all internal buffers are written to disk
                download_object.flush()
                os.fsync(download_object.fileno())
        except EnvironmentError as exc:
            raise RuntimeError("Error downloading from '{}': {}".format(
                source_url, exc))

        return download_object.name

    def download_s3_object(self, bucket, key):
        """Download object from S3 to a temp file and update task progress"""
        s3 = boto3.client('s3')
        try:
            source_size = s3.head_object(Bucket=bucket,
                                         Key=key)['ContentLength']
        except (botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError) as exc:
            raise RuntimeError(
                "Error downloading from 's3://{}/{}': {}".format(
                    bucket, key, exc)
            )
        try:
            with NamedTemporaryFile(dir=get_temp_dir(),
                                    delete=False) as download_object:
                try:
                    s3.download_fileobj(bucket, key, download_object,
                                        Callback=ProgressPercentage(
                                            source_size, self.request.id
                                        ))
                except (botocore.exceptions.ClientError,
                        botocore.exceptions.ParamValidationError) as exc:
                    self.delete_file(download_object.name)
                    raise RuntimeError(
                        "Error downloading from 's3://{}/{}': {}".format(
                            bucket, key, exc)
                    )
                # ensure that all internal buffers are written to disk
                download_object.flush()
                os.fsync(download_object.fileno())
        except EnvironmentError as exc:
            raise RuntimeError(
                "Error downloading from 's3://{}/{}': {}".format(
                    bucket, key, exc)
            )
        return download_object.name

    def download_file_obj(self, request_response, download_object):
        """Download from request response object and update task progress"""
        # Content-Length header is optional, so provide a default value
        chunk_size = 10 * 1024 * 1024  # 10MB
        remote_file_size = int(
            request_response.headers.get('Content-Length', 0)
        )
        progress_report = ProgressPercentage(remote_file_size, self.request.id)
        try:
            for chunk in request_response.iter_content(chunk_size):
                download_object.write(chunk)
                progress_report(len(chunk))
        except EnvironmentError as exc:
            raise RuntimeError("Error downloading from '{}': {}".format(
                request_response.url, exc))

    def import_path_to_path(self, source_path, symlink=True):
        """Import file from an absolute file system path into
        FILE_STORE_BASE_DIR
        """
        storage = SymlinkedFileSystemStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))
        file_store_path = storage.path(file_store_name)

        if source_path.startswith((settings.REFINERY_DATA_IMPORT_DIR,
                                   get_temp_dir())):
            self.move_file(source_path, file_store_path)
            logger.info("Moved '%s' to '%s'", source_path, file_store_path)
        else:
            if symlink:
                self.symlink_file(source_path, file_store_path)
                logger.info("Created symlink '%s' to '%s'",
                            file_store_path, source_path)
            else:
                logger.debug("Copying '%s' to '%s'",
                             source_path, file_store_path)
                self.copy_file(source_path, file_store_path)
                logger.info("Copied '%s' to '%s'",
                            source_path, file_store_path)

        return file_store_name

    def import_path_to_s3(self, source_path):
        """Import file from an absolute file system path into MEDIA_BUCKET"""
        storage = S3MediaStorage()
        file_store_name = storage.get_name(os.path.basename(source_path))

        logger.debug("Started uploading from '%s' to 's3://%s/%s'",
                     source_path, settings.MEDIA_BUCKET, file_store_name)
        self.upload_s3_object(source_path, settings.MEDIA_BUCKET,
                              file_store_name)
        logger.info("Finished uploading from '%s' to 's3://%s/%s'",
                    source_path, settings.MEDIA_BUCKET, file_store_name)

        if source_path.startswith((settings.REFINERY_DATA_IMPORT_DIR,
                                   get_temp_dir())):
            self.delete_file(source_path)

        return file_store_name

    def import_s3_to_path(self, source_url):
        """Import S3 object from s3:// URL into FILE_STORE_BASE_DIR"""
        source_bucket, source_key = parse_s3_url(source_url)

        logger.debug("Started downloading from '%s'", source_url)
        temp_file_path = self.download_s3_object(source_bucket, source_key)
        logger.info("Finished downloading from '%s'", source_url)

        storage = SymlinkedFileSystemStorage()
        # remove query string from URL before extracting file name
        source_file_name = os.path.basename(urlparse.urlparse(source_url).path)
        file_store_name = storage.get_name(source_file_name)
        file_store_path = storage.path(file_store_name)
        self.move_file(temp_file_path, file_store_path)
        logger.info("Moved '%s' to '%s'", temp_file_path, file_store_path)

        if source_bucket == settings.UPLOAD_BUCKET:
            self.delete_s3_object(source_bucket, source_key)

        return file_store_name

    def import_s3_to_s3(self, source_url):
        """Transfer S3 object from UPLOAD_BUCKET to MEDIA_BUCKET"""
        source_bucket, source_key = parse_s3_url(source_url)
        storage = S3MediaStorage()
        file_store_name = storage.get_name(os.path.basename(source_key))

        logger.debug("Started copying from '%s' to 's3://%s/%s'",
                     source_url, settings.MEDIA_BUCKET, file_store_name)
        self.copy_s3_object(source_url, settings.MEDIA_BUCKET, file_store_name)
        logger.info("Finished copying from '%s' to 's3://%s/%s'",
                    source_url, settings.MEDIA_BUCKET, file_store_name)

        if source_bucket == settings.UPLOAD_BUCKET:
            self.delete_s3_object(source_bucket, source_key)

    def import_url_to_path(self, source_url):
        """Import file from URL into FILE_STORE_BASE_DIR"""
        logger.debug("Started downloading from '%s'", source_url)
        temp_file_path = self.download_file(source_url)
        logger.info("Finished downloading from '%s' to '%s'",
                    source_url, temp_file_path)

        storage = SymlinkedFileSystemStorage()
        # remove query string from URL before extracting file name
        source_file_name = os.path.basename(urlparse.urlparse(source_url).path)
        file_store_name = storage.get_name(source_file_name)
        file_store_path = storage.path(file_store_name)
        self.move_file(temp_file_path, file_store_path)
        logger.info("Moved '%s' to '%s'", temp_file_path, file_store_path)

        return file_store_name

    def import_url_to_s3(self, source_url):
        """Download file from URL and upload to MEDIA_BUCKET"""
        logger.debug("Started downloading from '%s'", source_url)
        temp_file_path = self.download_file(source_url)
        logger.info("Finished downloading from '%s' to '%s'",
                    source_url, temp_file_path)

        storage = S3MediaStorage()
        # remove query string from URL before extracting file name
        source_file_name = os.path.basename(urlparse.urlparse(source_url).path)
        file_store_name = storage.get_name(source_file_name)

        logger.debug("Started uploading from '%s' to 's3://%s/%s'",
                     temp_file_path, settings.MEDIA_BUCKET, file_store_name)
        self.upload_s3_object(temp_file_path, settings.MEDIA_BUCKET,
                              file_store_name)
        logger.info("Finished uploading from '%s' to 's3://%s/%s'",
                    temp_file_path, settings.MEDIA_BUCKET, file_store_name)

        self.delete_file(temp_file_path)

        return file_store_name

    @staticmethod
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
            logger.error("Failed changing permissions on '%s': %s",
                         destination_path, exc)

    @staticmethod
    def symlink_file(source_path, link_path):
        """Create a symlink link_path to source_path"""
        make_dir(os.path.dirname(link_path))
        try:
            os.symlink(source_path, link_path)
        except OSError as exc:
            raise RuntimeError("Error creating symlink '{}': {}".format(
                link_path, exc))

    def upload_s3_object(self, source_path, bucket, key):
        """Upload file from source path to S3 bucket"""
        s3 = boto3.client('s3')
        try:
            source_size = os.path.getsize(source_path)
            s3.upload_file(source_path, bucket, key,
                           ExtraArgs={'ACL': 'public-read'},
                           Callback=ProgressPercentage(source_size,
                                                       self.request.id))
        except (EnvironmentError, botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError) as exc:
            raise RuntimeError(
                "Error uploading from '{}' to 's3://{}/{}': {}".format(
                    source_path, bucket, key, exc
                )
            )


class ProgressPercentage(object):
    """Callable for progress monitoring of S3 transfers using boto3 within
    FileImportTask
    https://boto3.readthedocs.io/en/stable/_modules/boto3/s3/transfer.html
    """
    def __init__(self, file_size, task_id):
        self._file_size = file_size
        self._import_task_id = task_id
        self._seen_so_far = 0
        self._lock = threading.Lock()

    def __call__(self, bytes_amount):
        # to simplify we'll assume this is hooked up to a single filename
        with self._lock:
            self._seen_so_far += bytes_amount
            # file size may not be available for some download objects
            if self._file_size > 0:
                percentage = self._seen_so_far * 100. / self._file_size
            else:
                percentage = 0
            FileImportTask().update_state(
                self._import_task_id, state='PROGRESS', meta={
                    'percent_done': '{:.0f}'.format(percentage),
                    'current': self._seen_so_far,
                    'total': self._file_size
                }
            )


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
