import os
import shutil
import tempfile
import urllib2
import logging
from celery.task import task
from django.core.files import File
from file_store.models import FileStoreItem, file_path, get_temp_dir, FILE_STORE_BASE_DIR

logger = logging.getLogger('file_store')

@task()
def create(source, sharename='', permanent=False, file_size=1):
    '''
    Create a FileStoreItem instance and return its UUID
    Important: source must be either an absolute file system path or a URL
    '''
    logger.debug("Creating FileStoreItem using source %s", source)

    if not source:
        logger.error("Source is required but was not provided")
        return None

    item = FileStoreItem.objects.create(source=source, sharename=sharename)
    logger.debug("FileStoreItem created with UUID: %s", item.uuid)

    if permanent:
        # copy to file store now and don't add to cache
        #TODO: provide progress update, call import_file as subtask?
        if not import_file(item.uuid, permanent=True, file_size=file_size):
            logger.error("Could not import file from %s", item.source)
            return None
    else:
        if os.path.isabs(item.source):
            if not item.symlink_datafile():
                # if the source is an absolute file system path but symlinking it failed
                return None

    return item.uuid

@task()
def import_file(uuid, permanent=False, refresh=False, file_size=1):
    '''
    Download or copy file specified by UUID
    If permanent=False then add to cache
    Make sure source is either an absolute file system path or a URL before importing
    Return FileStoreItem instance
    '''
    # check if there's a FileStoreItem with this UUID
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None

    # if file is ready to be used then return it, otherwise delete it if update is requested
    if item.is_local():
        if refresh:
            item.delete_datafile()
        else:
            return item

    # if source is an absolute file system path then copy, otherwise assume it is URL and download
    if os.path.isabs(item.source):
        # check if source file can be opened
        try:
            srcfile = File(open(item.source))
        except IOError:
            logger.exception("Could not open file: %s", item.source)
            return None
        srcfilename = os.path.basename(item.source)
        
        #TODO: copy file in chunks to display progress report (override Storage.save?)
        item.datafile.save(srcfilename, srcfile)  # model is saved by default if FileField.save() is called
        srcfile.close()
    else:
        req = urllib2.Request(item.source)
        # check if source file can be downloaded
        try:
            response = urllib2.urlopen(req)
        except urllib2.URLError as e:
            logger.exception("Could not open URL: %s. Reason: %s", item.source, e.reason)
            return None

        tmpfile = tempfile.NamedTemporaryFile(dir=get_temp_dir(), delete=False)
        # get remote file size, provide a default value in case Content-Length is missing
        remotefilesize = int(response.info().getheader("Content-Length", file_size))

        # download and save the file
        #TODO: handle out of disk space condition
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

        response.close()
        tmpfile.flush()
        tmpfile.close()
        
        # move temp file to file store dir to avoid spending time on copying large files
        #TODO: remove query string from source file name
        src_file_name = os.path.basename(item.source)
        # create symlink destination path and check if there's a name conflict
        rel_dst_path = item.datafile.storage.get_available_name(file_path(item, src_file_name))
        # absolute destination path is needed to create the symlink
        abs_dst_path = os.path.join(FILE_STORE_BASE_DIR, rel_dst_path)
        # create intermediate directories if they don't exist
        dst_dir_name = os.path.split(abs_dst_path)[0]
        #TODO: replace this with os.renames()
        if not os.path.isdir(dst_dir_name):
            try:
                os.makedirs(dst_dir_name)
            except OSError as e:
                logger.exception("Error creating file store directory. OSError: %s, file name: %s, error: %s",
                                 e.errno, e.filename, e.strerror)
                return None
        try:
            shutil.move(tmpfile.name, abs_dst_path)
        except:
            logger.exception("Error moving file from temp dir to file store dir")
            return None
        # assign new path to FileField
        item.datafile.name = rel_dst_path
        # save the model instance
        item.save()

    #TODO: if permanent is False then add to cache
    if not permanent:
        pass

    return item

@task()
def read(uuid):
    ''' Return FileStoreItem given UUID '''
    #TODO: call import_file as subtask?
    return import_file(uuid)

@task()
def delete(uuid):
    ''' Delete FileStoreItem given UUID '''
    #TODO: remove from cache
    logger.debug("Deleting FileStoreItem UUID %s", uuid)

    try:
        FileStoreItem.objects.get(uuid=uuid).delete()
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem UUID %s does not exist", uuid)
        return False
    except FileStoreItem.MultipleObjectsReturned:
        logger.exception("More than one FileStoreItem matched UUID %s", uuid)
        return False

    logger.info("FileStoreItem UUID %s deleted", uuid)
    return True

@task()
def update(uuid, source):
    ''' Replace the file while keeping the same UUID '''
    # update file source
    #TODO: check that only one record was updated, handle other cases
    FileStoreItem.objects.filter(uuid=uuid).update(source=source)
    # import new file from updated source
    #TODO: call import_file as subtask?
    return import_file(uuid, refresh=True)

@task()
def rename(uuid, name):
    ''' Change name of the file on disk and return the new name '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None

    return item.rename_datafile(name)
