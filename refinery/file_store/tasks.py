import os
import stat
from tempfile import NamedTemporaryFile
import threading
import urlparse

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage

import boto3
import botocore
import celery
from celery.signals import task_postrun, task_success
from celery.task import task
import requests
from requests.exceptions import (ConnectionError, ContentDecodingError,
                                 HTTPError)

from data_set_manager.models import Node
from data_set_manager.search_indexes import NodeIndex

from .models import FileStoreItem, _mkdir, get_temp_dir, parse_s3_url
from .utils import S3MediaStorage, SymlinkedFileSystemStorage, _delete_file

logger = celery.utils.log.get_task_logger(__name__)
logger.setLevel(celery.utils.LOG_LEVELS['DEBUG'])


class ProgressPercentage(object):
    """Callable for progress monitoring of S3 transfers"""

    def __init__(self, filename, task_id):
        self._filename = filename
        self._task_id = task_id
        self._size = os.path.getsize(filename)
        self._seen_so_far = 0
        self._lock = threading.Lock()

    def __call__(self, bytes_amount):
        # to simplify we'll assume this is hooked up to a single filename
        with self._lock:
            self._seen_so_far += bytes_amount
            percentage = self._seen_so_far * 100. / self._size
            import_file.update_state(
                self._task_id, state='PROGRESS',
                meta={
                    'percent_done': '{:.0f}'.format(percentage),
                    'current': self._seen_so_far,
                    'total': self._size
                }
            )


def _copy_file_obj(source, destination):
    """Copy file object in chunks"""
    chunk_size = 10 * 1024 * 1024  # 10MB
    source_size = os.path.getsize(source.name)
    for chunk in iter(lambda: source.read(chunk_size), ''):
        destination.write(chunk)
        destination_size = os.path.getsize(destination.name)
        percentage = destination_size * 100. / source_size
        import_file.update_state(
            state='PROGRESS',
            meta={
                'percent_done': '{:.0f}'.format(percentage),
                'current': destination_size,
                'total': source_size
            }
        )


def _copy_file(source_path, destination_path, delete_source=False):
    """Copy file from one absolute file system path to another"""
    _mkdir(os.path.dirname(destination_path))

    try:
        with open(source_path, 'rb') as source, \
                open(destination_path, 'wb') as destination:
            _copy_file_obj(source, destination)
    except IOError as exc:
        _delete_file(destination_path)
        raise RuntimeError("Failed to copy '{}' to '{}': {}".format(
            source_path, destination_path, exc
        ))

    if delete_source:
        _delete_file(source_path)


def _symlink_file(source_path, link_path):
    _mkdir(os.path.dirname(link_path))
    try:
        os.symlink(source_path, link_path)
    except OSError as exc:
        raise RuntimeError("Error creating symlink '%s': %s", link_path, exc)


def _import_path_to_path(source_path, symlink=True):
    """Import file from an absolute file system path into file store"""
    storage = SymlinkedFileSystemStorage()
    source_file_name = os.path.basename(source_path)
    file_store_name = storage.get_name(source_file_name)
    file_store_path = storage.get_path(source_file_name)

    if source_path.startswith((settings.REFINERY_DATA_IMPORT_DIR,
                               get_temp_dir())):
        # move uploaded or temporary file
        logger.debug("Moving file '%s' into file store", source_path)
        _copy_file(source_path, file_store_path, delete_source=True)
        logger.info("Moved file '%s' into file store", source_path)
    else:
        if symlink:
            _symlink_file(source_path, file_store_path)
            logger.info("Created symlink '%s' to '%s'",
                        file_store_path, source_path)
        else:
            logger.debug("Copying file '%s' into file store", source_path)
            _copy_file(source_path, file_store_path)
            logger.info("Copied file '%s' into file store", source_path)

    return file_store_name


def _import_path_to_s3(source_path):
    s3 = boto3.client('s3')
    storage = S3MediaStorage()
    file_store_name = storage.get_name(os.path.basename(source_path))

    try:
        s3.upload_file(source_path, settings.MEDIA_BUCKET, file_store_name,
                       ExtraArgs={'ACL': 'public-read'},
                       Callback=ProgressPercentage(source_path,
                                                   import_file.request.id))
    except botocore.exceptions.ClientError as exc:
        s3_url = 's3://' + settings.MEDIA_BUCKET + '/' + file_store_name
        raise RuntimeError("Error transferring file '%s' to %s: %s",
                           source_path, s3_url, exc)

    if source_path.startswith((settings.REFINERY_DATA_IMPORT_DIR,
                               get_temp_dir())):
        _delete_file(source_path)

    return file_store_name


@task(track_started=True)
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
        try:
            if settings.REFINERY_S3_USER_DATA:
                item.datafile.name = _import_path_to_s3(item.source)
            else:
                item.datafile.name = _import_path_to_path(item.source)
        except RuntimeError as exc:
            import_file.update_state(state=celery.states.FAILURE,
                                     meta=str(exc))
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()

    elif item.source.startswith('s3://'):
        bucket_name, key = parse_s3_url(item.source)
        s3 = boto3.resource('s3')
        uploaded_object = s3.Object(bucket_name, key)
        with NamedTemporaryFile(dir=get_temp_dir()) as download:
            logger.debug("Downloading file from '%s'", item.source)
            try:
                uploaded_object.download_fileobj(download)
            except botocore.exceptions.ClientError as exc:
                logger.error("Failed to download '%s': %s", item.source, exc)
                import_file.update_state(state=celery.states.FAILURE,
                                         meta='Failed to import uploaded file')
                # http://stackoverflow.com/a/33143545
                raise celery.exceptions.Ignore()
            logger.debug("Saving downloaded file '%s'", download.name)
            item.datafile.save(os.path.basename(key), File(download),
                               save=False)  # item is saved below
            logger.info("Saved downloaded file to '%s'", item.datafile.name)
        try:
            s3.Object(bucket_name, key).delete()
        except botocore.exceptions.ClientError as exc:
            logger.error("Failed to delete '%s': %s", item.source, exc)

    else:  # assume that source is a regular URL
        # check if source file can be downloaded
        try:
            response = requests.get(item.source, stream=True)
            response.raise_for_status()
        except HTTPError as exc:
            logger.error("Could not open URL '%s': '%s'", item.source, exc)
            import_file.update_state(state=celery.states.FAILURE,
                                     meta='Failed to import file from URL')
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()
        # FIXME: When importing a tabular file into Refinery, there is a
        # dependence on this ConnectionError below returning `None`!!!!
        except (ConnectionError, ValueError) as exc:
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
            except ContentDecodingError as e:
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
        rel_dst_path = default_storage.get_name(os.path.basename(source_path))
        abs_dst_path = os.path.join(settings.FILE_STORE_BASE_DIR, rel_dst_path)
        # move the temp file into the file store
        try:
            if not os.path.exists(os.path.dirname(abs_dst_path)):
                os.makedirs(os.path.dirname(abs_dst_path))
            os.rename(tmpfile.name, abs_dst_path)
        except OSError as exc:
            logger.error("Error moving temp file '%s' into the file store: %s",
                         tmpfile.name, exc)
            import_file.update_state(state=celery.states.FAILURE,
                                     meta='Failed to import file from URL')
            # http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()
        # temp file is only accessible by the owner by default which prevents
        # access by the web server if it is running as it's own user
        try:
            mode = os.stat(abs_dst_path).st_mode
            os.chmod(abs_dst_path,
                     mode | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH)
        except OSError as e:
            logger.error("Failed changing permissions on %s", abs_dst_path)
            logger.error("OSError: %s, file name %s, error: %s",
                         e.errno, e.filename, e.strerror)
        # assign new path to datafile
        item.datafile.name = rel_dst_path

    item.save()

    return item.uuid


@task_postrun.connect(sender=import_file)
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
        NodeIndex().update_object(node, using="data_set_manager")
        logger.info("Updated Solr index with file import state for Node '%s'",
                    node.uuid)


@task_success.connect(sender=import_file)
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


@task()
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
    except (HTTPError, requests.exceptions.ConnectionError) as exc:
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
