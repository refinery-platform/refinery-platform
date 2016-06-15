import os
import stat
import logging
import requests
from tempfile import NamedTemporaryFile
from urlparse import urlparse

import celery
import zlib
from celery.task import task
from django.core.files import File

from file_store.models import (FileStoreItem, get_temp_dir, file_path,
                               FILE_STORE_BASE_DIR)


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
    :returns: FileStoreItem -- model instance or None if importing failed.

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
            return item

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
        except requests.exceptions.HTTPError as e:
            logger.error("Could not open URL '%s'", item.source)
            return None
        except requests.exceptions.ConnectionError as e:
            logger.error("Could not open URL '%s'. Reason: '%s'",
                         item.source, e.reason)
            return None
        except ValueError as e:
            logger.error("Could not open URL '%s'. Reason: '%s'",
                         item.source, e.message)
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

            for buf in iter(lambda: response.raw.read(block_size), ''):
                local_file_size += len(buf)

                # Check if theres any content-encoding going on and decompress
                # accordingly

                encoding_header = response.headers.get('content-encoding')

                # Choose the correct `wbits` based on the type of encoding
                # See: http://stackoverflow.com/a/22311297
                try:
                    if encoding_header == "deflate":
                        buf = zlib.decompress(buf, -zlib.MAX_WBITS)
                    elif encoding_header in ["gzip", "zlib"]:
                        # `zlib.MAX_WBITS | 32` will auto-detect and
                        # decompress zlib and gzip formats
                        buf = zlib.decompress(buf, zlib.MAX_WBITS | 32)

                except zlib.error as exc:
                    # 'exc' here has been observed to be:
                    # Error -3 while decompressing data: incorrect header check
                    # This occurs when a webserver is misconfigured and
                    # provides a `content-encoding` header without the data
                    # itself being encoded
                    logger.error(
                        "Error while decompressing data from '%s': %s",
                        item.source, exc)
                    import_failure = True
                    break

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
                    percent_done = local_file_size * 100. / remote_file_size
                else:
                    percent_done = 0
                import_file.update_state(
                    state="PROGRESS",
                    meta={
                        "percent_done": "{:.0f}".format(percent_done),
                        "current": local_file_size,
                        "total": remote_file_size
                    })

            # delete temp. file if download failed
            if import_failure:

                logger.error("File import task has failed. Deleting "
                             "temporary file...")

                # Setting the tempfile's delete == True deletes the file
                # upon a `close()`
                tmpfile.delete = True

                # Close the file here even though we are utilizing the
                # "with" keyword since the return happens before the "with"
                # is completed
                tmpfile.close()

                import_file.update_state(task_id=import_file.request.id,
                                         state=celery.states.FAILURE)
                return item

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

    return item


@task()
def read(uuid):
    '''Return a FileStoreItem model instance given a UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :returns: FileStoreItem -- Model instance if reading the file succeeded,
    None if failed.

    '''
    return FileStoreItem.objects.get_item(uuid)


@task()
def delete(uuid):
    '''Delete FileStoreItem given a UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :returns: bool - True if deletion succeeded, False if failed.

    '''
    logger.debug("Deleting FileStoreItem with UUID '%s'", uuid)

    item = FileStoreItem.objects.get_item(uuid)
    if item:
        item.delete()
        logger.info("FileStoreItem deleted")
        return True
    else:
        logger.error("Could not delete FileStoreItem with UUID '%s'", uuid)
        return False


@task()
def update(uuid, source):
    """Replace the file using the new source while keeping the same UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :param source: New source of the FileStoreItem.
    :type source: str.
    :returns: FileStoreItem -- model instance if update succeeded, None if
    failed.
    """
    # TODO: check for number of affected rows to determine if there was an
    # error
    # https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.query.QuerySet.update
    FileStoreItem.objects.filter(uuid=uuid).update(source=source)

    # import new file from updated source
    # TODO: call import_file as subtask?
    return import_file(uuid, refresh=True)


@task()
def rename(uuid, name):
    """Change name of the file on disk and return the updated FileStoreItem
    instance.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :param name: New name of the FileStoreItem specified by the UUID.
    :type name: str.
    :returns: FileStoreItem - updated FileStoreItem instance or None if there
        was an error.
    """

    try:
        item = FileStoreItem.objects.get_item(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.error("Failed to rename FileStoreItem with UUID '%s'", uuid)
        return None
    if item.rename_datafile(name):
        return item
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
    :returns: bool -- True if success, False if failure.

    '''
    # TODO: handle out of disk space condition
    logger.debug("Downloading file from '%s'", url)

    # check if source file can be downloaded
    # TODO: refactor to use requests
    try:
        response = requests.get(url, stream=True)
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
