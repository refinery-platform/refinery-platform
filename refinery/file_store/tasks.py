
import logging
import os
import stat
from tempfile import NamedTemporaryFile
from urlparse import urlparse

from django.core.files import File

import celery
from celery.signals import task_success
from celery.task import task
import requests
from requests.exceptions import (ContentDecodingError, ConnectionError,
                                 HTTPError)

from .models import (file_path, FILE_STORE_BASE_DIR, FileStoreItem,
                     get_temp_dir)
from data_set_manager.models import Node


logger = logging.getLogger(__name__)


@task()
def create(source, sharename='', filetype='', file_size=1):
    """Create a FileStoreItem instance and return its UUID
    Important: source must be either an absolute file system path or a URL
    :param source: URL or absolute file system path to a file.
    :type source: str.
    :param sharename: Group share name.
    :type sharename: str.
    :param filetype: File extension
    :type filetype: str.
    :param file_size: For cases when the remote site specified by source URL
        doesn't provide file size in the HTTP headers.
    :type file_size: int.
    :returns: FileStoreItem UUID if success, None if failure.

    """
    # TODO: move to file_store/models.py since it's never used as a task
    logger.info("Creating FileStoreItem using source '%s'", source)

    item = FileStoreItem.objects.create_item(
        source=source, sharename=sharename, filetype=filetype)
    if not item:
        logger.error("Failed to create FileStoreItem using source '%s'",
                     source)
        return None

    logger.info("FileStoreItem created with UUID %s", item.uuid)

    return item.uuid


@task(track_started=True)
def import_file(uuid, refresh=False, file_size=0):
    """Download or copy file specified by UUID.
    :param refresh: Flag for forcing update of the file.
    :type refresh: bool.
    :param file_size: size of the remote file.
    :type file_size: int.
    :returns: FileStoreItem UUID or None if importing failed.

    """
    logger.debug("Importing FileStoreItem with UUID '%s'", uuid)

    item = FileStoreItem.objects.get_item(uuid=uuid)
    if not item:
        logger.error("FileStoreItem with UUID '%s' not found", uuid)
        return None

    # save task ID for looking up file import status
    item.import_task_id = import_file.request.id
    item.save()

    # if file is ready to be used then return it,
    # otherwise delete it if update is requested
    if item.is_local():
        if refresh:
            item.delete_datafile()
        else:
            logger.info("File already exists: '%s'", item.get_absolute_path())
            return item.uuid

    # if source is an absolute file system path then copy,
    # otherwise assume it is a URL and download
    if os.path.isabs(item.source):
        if os.path.isfile(item.source):
            # check if source file can be opened
            try:
                srcfile = File(open(item.source))
            except IOError:
                logger.error("Could not open file: %s", item.source)
                return None
            srcfilename = os.path.basename(item.source)

            # TODO: copy file in chunks to display progress report
            # model is saved by default if FileField.save() is called
            item.datafile.save(srcfilename, srcfile)
            srcfile.close()
            logger.info("File copied")
        else:
            logger.error("Copying failed: source is not a file")
            return None
    else:
        # check if source file can be downloaded
        try:
            response = requests.get(item.source, stream=True)
            response.raise_for_status()
        except HTTPError as e:
            logger.error("Could not open URL '%s'. Reason: '%s'",
                         item.source, e)

            import_file.update_state(
                state=celery.states.FAILURE,
                meta='Analysis Failed during import_file subtask'
            )

            # ignore the task so no other state is recorded
            # See: http://stackoverflow.com/a/33143545
            raise celery.exceptions.Ignore()

        # FIXME: When importing a tabular file into Refinery, there is a
        # dependance on this ConnectionError below returning `None`!!!!
        except(ConnectionError, ValueError) as e:
            logger.error("Could not open URL '%s'. Reason: '%s'",
                         item.source, e)
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
            block_size = 10 * 1024 * 1024  # 10MB

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
                        percent_done = local_file_size * 100. / \
                                       remote_file_size
                    else:
                        percent_done = 0

                    import_file.update_state(
                        state="PROGRESS",
                        meta={
                            "percent_done": "{:.0f}".format(percent_done),
                            "current": local_file_size,
                            "total": remote_file_size
                        })

            except ContentDecodingError as e:
                logger.error("Error while decoding response content:%s" % e)
                import_failure = True

            if import_failure:
                # delete temp. file if download failed
                logger.error("File import task has failed. Deleting "
                             "temporary file...")

                # Setting the tempfile's delete == True deletes the file
                # upon a `close()`
                tmpfile.delete = True

                import_file.update_state(
                    state=celery.states.FAILURE,
                    meta='Analysis Failed during import_file subtask'
                )

                # ignore the task so no other state is recorded
                # See: http://stackoverflow.com/a/33143545
                raise celery.exceptions.Ignore()

        logger.debug("Finished downloading from '%s'", item.source)

        # get the file name from URL (remove query string)
        u = urlparse(item.source)
        src_file_name = os.path.basename(u.path)
        # construct destination path based on source file name
        rel_dst_path = item.datafile.storage.get_available_name(
            file_path(item, src_file_name)
        )
        abs_dst_path = os.path.join(FILE_STORE_BASE_DIR, rel_dst_path)
        # move the temp file into the file store
        try:
            if not os.path.exists(os.path.dirname(abs_dst_path)):
                os.makedirs(os.path.dirname(abs_dst_path))
            os.rename(tmpfile.name, abs_dst_path)
        except OSError as e:
            logger.error(
                "Error moving temp file into the file store. "
                "OSError: %s, file name: %s, error: %s",
                e.errno, e.filename, e.strerror)
            return False
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
        # save the model instance
        item.save()

    return item.uuid


@task_success.connect(sender=import_file)
def begin_auxiliary_node_generation(**kwargs):
    # NOTE: Celery docs suggest to access these fields through kwargs as the
    # structure of celery signal handlers changes often
    # See: http://bit.ly/2cbTy3k

    file_store_item_uuid = kwargs['result']

    try:
        Node.objects.get(
            file_uuid=file_store_item_uuid
        ).run_generate_auxiliary_node_task()
    except (Node.DoesNotExist,
            Node.MultipleObjectsReturned) \
            as e:
        logger.error("Couldn't properly fetch Node: %s", e)


@task()
def rename(uuid, name):
    """Change name of the file on disk and return the updated FileStoreItem
    UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :param name: New name of the FileStoreItem specified by the UUID.
    :type name: str.
    :returns: FileStoreItem UUID or None if there
        was an error.
    """

    try:
        item = FileStoreItem.objects.get_item(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.error("Failed to rename FileStoreItem with UUID '%s'", uuid)
        return None
    if item.rename_datafile(name):
        return item.uuid
    else:
        return None


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
    # TODO: refactor to use requests
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
    except HTTPError as e:
        logger.error(e)
    except requests.exceptions.ConnectionError as e:
        raise DownloadError(
            "Could not open URL '{}'. Reason: '{}'".format(url, e.reason))
    except ValueError as e:
        raise DownloadError("Could not open URL '{}'".format(url))

    # get remote file size, provide a default value in case Content-Length is
    # missing
    remotefilesize = int(
        response.headers.get("Content-Length", file_size))

    # TODO: handle IOError
    with open(target_path, 'wb+') as destination:
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
                import_file.update_state(
                    state="PROGRESS",
                    meta={"percent_done": "%3.2f%%" % (percent_done),
                          'current': localfilesize,
                          'total': remotefilesize}
                    )
        # cleanup
        # TODO: delete temp file if download failed
        destination.flush()

    response.close()
    logger.debug("Finished downloading")


class DownloadError(StandardError):
    '''Exception raised for download errors

    '''
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)
