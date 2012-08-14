import os
import logging
from celery.task import task
from file_store.models import FileStoreItem


logger = logging.getLogger('file_store')


@task()
def create(source, sharename='', filetype='', permanent=False, file_size=1):
    '''
    Create a FileStoreItem instance and return its UUID
    Important: source must be either an absolute file system path or a URL
    '''
    logger.debug("Creating FileStoreItem using source '%s'", source)

    item = FileStoreItem.objects.create_item(source=source, sharename=sharename, filetype=filetype)
    if not item:
        logger.error("Failed to create FileStoreItem")
        return None

    logger.debug("FileStoreItem created with UUID %s", item.uuid)

    if permanent:
        # copy to file store now and don't add to cache
        #TODO: provide progress update, call import_file as subtask?
        if not import_file(item.uuid, permanent=True, file_size=file_size):
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

    # if file is ready to be used then return it, otherwise delete it if update is requested
    if item.is_local():
        if refresh:
            item.delete_datafile()
        else:
            return item

    # if source is an absolute file system path then copy, otherwise assume it is a URL and download
    if os.path.isabs(item.source):
        item.copy_datafile()
    else:
        item.download_datafile(file_size)

    if not permanent:
        #TODO: if permanent is False then add to cache
        pass

    return item


@task()
def read(uuid):
    '''Return a FileStoreItem model instance given a UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :returns: FileStoreItem -- model instance if reading the file succeeded, None if failed. 
    
    '''
    #TODO: call import_file as subtask?
    return import_file(uuid)


@task()
def delete(uuid):
    '''Delete FileStoreItem given a UUID.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :returns: bool - True if deletion succeeded, False if failed.

    '''
    logger.debug("Deleting FileStoreItem with UUID '%s'", uuid)

    item = FileStoreItem.objects.get_item(uuid=uuid)

    if item:
        #TODO: remove from cache
        item.delete()
        logger.info("FileStoreItem UUID '%s' deleted", uuid)
        return True
    else:
        logger.error("Failed to delete FileStoreItem with UUID '%s'", uuid)
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
    # update file source
    #TODO: check for number of affected rows to determine if there was an error
    # https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.query.QuerySet.update
    FileStoreItem.objects.filter(uuid=uuid).update(source=source)

    # import new file from updated source
    #TODO: call import_file as subtask?
    return import_file(uuid, refresh=True)


@task()
def rename(uuid, name):
    '''Change name of the file on disk and return the new name.

    :param uuid: UUID of a FileStoreItem.
    :type uuid: str.
    :param name: New name of the FileStoreItem specified by the UUID.
    :type name: str.
    :returns: str - new name of the FileStoreItem or None if there was an error.

    '''
    logger.debug("Renaming FileStoreItem with UUID '%s'", uuid)

    item = FileStoreItem.objects.get_item(uuid=uuid)

    if item:
        return item.rename_datafile(name)
    else:
        logger.error("Failed to rename FileStoreItem with UUID '%s'", uuid)
        return None
