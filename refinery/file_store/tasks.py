import os
import shutil
import tempfile
import urllib2
import logging
from django.conf import settings
from django.core.files import File
from celery.task import task
from file_store.models import FileStoreItem, file_path, is_local, get_temp_dir, FILE_STORE_BASE_DIR

logger = logging.getLogger('file_store')

@task()
def create(source, sharename='', permanent=False, file_size=1):
    '''
    Create a FileStoreItem instance and return its UUID
    source is either an absolute file system path or a URL
    '''
    logger.debug("Entering file_store.create(), source = %s", source)

    if not source:
        logger.error("Source is required but it was not provided")
        return None

    item = FileStoreItem.objects.create(source=source, sharename=sharename)
    logger.debug("New FileStoreItem created, item.datafile.name: %s", item.datafile.name)

    #TODO: call import_file as subtask?
    if permanent:
        # copy to file store now but don't add to cache
        if not import_file(item.uuid, permanent=True, file_size=file_size):
            logger.error("Could not import file from %s", item.source)
            return None

    logger.debug("Leaving file_store.create()")
    return item.uuid

@task()
def import_file(uuid, permanent=False, refresh=False, file_size=1):
    '''
    Download or copy file specified by UUID
    If permanent=False then add to cache
    '''
    # check if there's a FileStoreItem with this UUID
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None

    # if file is available then return it, else delete if update is requested
    if is_local(uuid):
        if refresh:
            try:
                item.datafile.delete(save=False)
            except OSError as e:
                logger.exception("Error deleting data file. OSError number: %s, file name: %s, error: %s",
                         e.errno, e.filename, e.strerror)
        else:
            return item

    # if source is an absolute file system path then copy, otherwise assume it is URL and download
    if os.path.isabs(item.source):
        # check if source file can be opened
        try:
            srcfo = open(item.source)
        except IOError:
            logger.exception("Could not open fileL %s", item.source)
            return None
        srcfilename = os.path.basename(item.source)
        srcfile = File(srcfo)
        #TODO: copy file in chunks to display progress report (override Storage.save?)
        item.datafile.save(srcfilename, srcfile)  # model is saved by default if FileField is altered
        srcfile.close()
        srcfo.close()
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
    try:
        FileStoreItem.objects.get(uuid=uuid).delete()
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return False
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
    ''' Change name of the file on disk.  Return the name that was assigned by the file storage system. '''
    try:
        item = FileStoreItem.objects.get(uuid=uuid)
    except FileStoreItem.DoesNotExist:
        logger.exception("FileStoreItem with UUID %s does not exist", uuid)
        return None
    
    # get available name based on the provided name
    new_rel_path = item.datafile.storage.get_available_name(file_path(item, name))
    new_abs_path = os.path.join(FILE_STORE_BASE_DIR, new_rel_path)

    # rename file on disk
    try:
        os.renames(item.datafile.path, new_abs_path)
    except OSError as e:
        logger.exception("Error renaming file on disk. OSError: %s, file name: %s, error: %s. Current file name: %s. New file name: %s",
                        e.errno, e.filename, e.strerror, item.datafile.path, new_abs_path)
        return None

    # change the name of the DataFile
    item.datafile.name = new_rel_path
    item.save()

    return os.path.basename(item.datafile.name)
