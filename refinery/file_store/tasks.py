import os
import stat
import logging
import urllib2
from urlparse import urlparse
from tempfile import NamedTemporaryFile
from celery.task import task
from django.core.files import File
from file_store.models import FileStoreItem, get_temp_dir, file_path, FILE_STORE_BASE_DIR


logger = logging.getLogger('file_store')


@task()
def create(source, sharename='', filetype='', permanent=False, file_size=1):
    '''
    Create a FileStoreItem instance and return its UUID
    Important: source must be either an absolute file system path or a URL
    
    :param source: URL or absolute file system path to a file.
    :type source: str.
    :param sharename: Group share name.
    :type sharename: str.
    :param filetype: File type (must be one of the types declared in models.py).
    :type filetype: str.
    :param permanent: Flag indicating whether to add this instance to the cache or not.
    :type permanent: bool.
    :param file_size: For cases when the remote site specified by source URL doesn't provide file size in the HTTP headers.
    :type file_size: int.
    :returns: FileStoreItem UUID if success, None if failure.

    '''
    logger.info("Creating FileStoreItem using source '%s'", source)

    item = FileStoreItem.objects.create_item(source=source, sharename=sharename, filetype=filetype)
    if not item:
        logger.error("Failed to create FileStoreItem")
        return None

    logger.info("FileStoreItem created with UUID %s", item.uuid)

    if permanent:
        # copy to file store now and don't add to cache
        #TODO: provide progress update, call import_file as subtask?
        if not import_file(item.uuid, permanent=True, refresh=True, file_size=file_size):
            logger.error("Could not import file from '%s'", item.source)

    return item.uuid


@task()
def import_file(uuid, permanent=False, refresh=False, file_size=1):
    '''Download or copy file specified by UUID.

    :param permanent: Flag for adding the FileStoreItem to cache.
    :type permanent: bool.
    :param refresh: Flag for forcing update of the file.
    :type refresh: bool.
    :param file_size: size of the remote file.
    :type file_size: int.
    :returns: FileStoreItem -- model instance or None if importing failed.

    '''
    logger.debug("Importing FileStoreItem with UUID '%s'", uuid)

    item = FileStoreItem.objects.get_item(uuid=uuid)
    if not item:
        logger.error("Failed to import FileStoreItem with UUID '%s'", uuid)
        return None

    # if file is ready to be used then return it,
    # otherwise delete it if update is requested
    if item.is_local():
        if refresh:
            item.delete_datafile()
        else:
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

            #TODO: copy file in chunks to display progress report
            # model is saved by default if FileField.save() is called
            item.datafile.save(srcfilename, srcfile)
            srcfile.close()
            logger.info("File copied")
        else:
            logger.error("Copying failed: source is not a file")
            return None
    else:
        req = urllib2.Request(item.source)
        # check if source file can be downloaded
        try:
            response = urllib2.urlopen(req)
        except urllib2.HTTPError as e:
            logger.error("Could not open URL '%s'", item.source)
            return None
        except urllib2.URLError as e:
            logger.error("Could not open URL '%s'. Reason: '%s'", item.source, e.reason)
            return None
        except ValueError as e:
            logger.error("Could not open URL '%s'. Reason: '%s'", item.source, e.message)
            return None

        tmpfile = NamedTemporaryFile(dir=get_temp_dir(), delete=False)

        # get remote file size, provide a default value in case Content-Length is missing
        remotefilesize = int(response.info().getheader("Content-Length", file_size))

        logger.debug("Starting download from '%s'", item.source)

        # download and save the file
        localfilesize = 0
        blocksize = 8 * 2 ** 10    # 8 Kbytes
        for buf in iter(lambda: response.read(blocksize), ''):
            localfilesize += len(buf)
            tmpfile.write(buf)
            # check if we have a sane value for file size
            if remotefilesize > 0:
                percent_done = localfilesize * 100. / remotefilesize
            else:
                percent_done = 0
            import_file.update_state(
                state="PROGRESS",
                meta={"percent_done": "%3.2f%%" % (percent_done), 'current': localfilesize, 'total': remotefilesize}
                )

        # cleanup
        #TODO: delete temp file if download failed 
        tmpfile.flush()
        tmpfile.close()
        response.close()

        logger.debug("Finished downloading from '%s'", item.source)

        # get the file name from URL (remove query string)
        u = urlparse(item.source)
        src_file_name = os.path.basename(u.path)
        # construct destination path based on source file name
        rel_dst_path = item.datafile.storage.get_available_name(file_path(item, src_file_name))
        abs_dst_path = os.path.join(FILE_STORE_BASE_DIR, rel_dst_path)
        
        
        logger.debug( "u.path = " + u.path + "\nsrc_file_name = " + src_file_name + "\nrel_dst_path = " + rel_dst_path + "abs_dst_path = " + abs_dst_path + "\ntmpfile.name = " + tmpfile.name )

        # move the temp file into the file store
        try:
            if not os.path.exists(os.path.dirname(abs_dst_path)):
                os.makedirs(os.path.dirname(abs_dst_path))
            os.rename(tmpfile.name, abs_dst_path)
        except OSError as e:
            logger.error("Error moving temp file into the file store\nOSError: %s, file name: %s, error: %s",
                         e.errno, e.filename, e.strerror)
            return False

        # temp file is only accessible by the owner by default
        # which prevents access by the web server if it is running as it's own user
        try:
            mode = os.stat(abs_dst_path).st_mode
            os.chmod(abs_dst_path, mode | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH)
        except OSError as e:
            logger.error("Failed changing permissions on %s", abs_dst_path)
            logger.error("OSError: %s, file name %s, error: %s", e.errno, e.filename, e.strerror)

        # assign new path to datafile
        item.datafile.name = rel_dst_path
        # save the model instance
        item.save()

    if not permanent:
        #TODO: if permanent is False then add to cache
        pass

    return item


@task()
def read(uuid):
    '''Return a FileStoreItem model instance given a UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :returns: FileStoreItem -- Model instance if reading the file succeeded, None if failed. 
    
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
    '''Replace the file using the new source while keeping the same UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :param source: New source of the FileStoreItem.
    :type source: str.
    :returns: FileStoreItem -- model instance if update succeeded, None if failed. 

    '''
    #TODO: check for number of affected rows to determine if there was an error
    # https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.query.QuerySet.update
    FileStoreItem.objects.filter(uuid=uuid).update(source=source)

    # import new file from updated source
    #TODO: call import_file as subtask?
    return import_file(uuid, refresh=True)


@task()
def rename(uuid, name):
    '''Change name of the file on disk and return the updated FileStoreItem instance.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :param name: New name of the FileStoreItem specified by the UUID.
    :type name: str.
    :returns: FileStroreItem - updated FileStoreItem instance or None if there was an error.

    '''
    logger.debug("Renaming FileStoreItem with UUID '%s'", uuid)

    item = FileStoreItem.objects.get_item(uuid=uuid)

    if item:
        if item.rename_datafile(name):
            return item

    logger.error("Failed to rename FileStoreItem with UUID '%s'", uuid)
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
    #TODO: handle out of disk space condition
    logger.debug("Downloading file from '%s'", url)

    req = urllib2.Request(url)
    # check if source file can be downloaded
    try:
        response = urllib2.urlopen(req)
    except (urllib2.URLError, ValueError) as e:
        raise DownloadError("Could not open URL '{}'. Reason: '{}'".format(url, e.reason))

    # get remote file size, provide a default value in case Content-Length is missing
    remotefilesize = int(response.info().getheader("Content-Length", file_size))

    with open(target_path, 'wb+') as destination:
        # download and save the file
        localfilesize = 0
        blocksize = 8 * 2 ** 10    # 8 Kbytes
        for buf in iter(lambda: response.read(blocksize), ''):
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
        #TODO: delete temp file if download failed 
        destination.flush()

    response.close()
    logger.debug("Finished downloading")


class DownloadError(StandardError):
    '''Exception raised for download errors

    '''
    def __init__(self, value):
        self.value = value
    def __str__(self):
#        return StandardError.__str__(self, *args, **kwargs)
        return repr(self.value)
