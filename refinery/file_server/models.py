'''
Created on Apr 21, 2012

@author: Ilya Sytchev
'''

import logging
from django.db import models, transaction
from django.db.utils import IntegrityError
from file_store.models import FileStoreItem


logger = logging.getLogger('file_server')

# list of the available file server models; update if new models are added
FILE_SERVER_MODELS = ('bamitem', 'tdfitem',)


class _FileServerItemManager(models.Manager):
    '''Custom model manager to handle retrieval of _FileServerItems.

    '''
    def get_item(self, uuid):
        '''Handles potential exceptions when retrieving a _FileServerItem.

        :param uuid: UUID of the data_file of a _FileServerItem.
        :type uuid: str.
        :returns: _FileServerItem -- model instance if exactly one match is found, None otherwise.

        '''
        try:
            item = _FileServerItem.objects.get(data_file__uuid=uuid)
        except _FileServerItem.DoesNotExist:
            logger.warn("_FileServerItem with data_file UUID '%s' does not exist", uuid)
            return None
        except _FileServerItem.MultipleObjectsReturned:
            logger.warn("More than one _FileServerItem matched UUID '%s'", uuid)
            return None

        return item


class _FileServerItem(models.Model):
    '''Private base class representing files required for visualization.

    '''
    data_file = models.ForeignKey(FileStoreItem, unique=True)

    objects = _FileServerItemManager()


class TDFItem(_FileServerItem):
    '''Represents a TDF file that is not linked to a data file.
    
    '''
    def __unicode__(self):
        return self.data_file.uuid


class BAMItem(_FileServerItem):
    '''Represents a BAM file and optionally links it to a TDF file.

    '''
    tdf_file = models.ForeignKey(FileStoreItem, blank=True, null=True)

    def __unicode__(self):
        if self.tdf_file:
            return self.data_file.uuid + ' - ' + self.tdf_file.uuid
        else:
            return self.data_file.uuid

    def update(self, tdf_uuid):
        '''Associate BAM file with a TDF file.

        :param tdf_uuid: UUID of the TDF file.
        :type tdf_uuid: str.
        :returns: bool -- True if update succeeded, False if failed.
        
        '''
        logger.debug("Updating BAMFileItem using TDF UUID '%s'", tdf_uuid)

        item = FileStoreItem.objects.get_item(uuid=tdf_uuid)

        if item:
            self.tdf_file = item
            try:
                self.save()
            except IntegrityError as e:
                logger.error("Failed updating BAMFileItem\n%s", e.message)
                return False
        else:
            logger.error("Failed updating BAMFileItem: specified UUID does not belong to any file.")
            return False

        logger.info("BAMFileItem updated")
        return True


def add(data_file_uuid, aux_file_uuid=None, index=False, update=False):
    '''Create a file server item of an appropriate type.

    :param data_file_uuid: UUID of a data file.
    :type data_file_uuid: str.
    :param aux_file_uuid: UUID of an auxiliary file.
    :type aux_file_uuid: str.
    :param index: Flag indicating whether to create and load auxiliary file index into the cache.
    :type index: bool.
    :param update: ?
    :type update: bool. 
    :returns: a child of the FileStoreItem -- new model instance or None if there was an error.

    '''
    data_file = FileStoreItem.objects.get_item(uuid=data_file_uuid)
    if not data_file:
        logger.error("Could not create _FileServerItem: data_file_uuid doesn't exist")
        return None

    file_type = data_file.get_filetype()
    if file_type == 'bam':
        return _add_bam(data_file=data_file, tdf_file_uuid=aux_file_uuid, index=index) 
    elif file_type == 'tdf':
        return _add_tdf(data_file=data_file, index=index)
    else:
        logger.error("Could not create _FileStoreItem: unknown file type")
        return None


def get(uuid):
    '''Returns an instance of a child of the FileServerItem that has a data_file with the specified UUID.

    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: a child of the FileServerItem or None if not found. 

    '''
    item = _FileServerItem.objects.get_item(uuid=uuid)

    # return appropriate model instance by iterating over list of available model names
    if item:
        for model in FILE_SERVER_MODELS:
            if hasattr(item, model):
                return getattr(item, model)
    return None


def delete(uuid):
    '''Deletes an instance of a child of the FileServerItem that has a data_file with the specified UUID.

    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: bool -- True if success, False if failure.

    '''
    

def index(uuid, update=bool):
    '''Create indices for data and auxiliary files as appropriate.

    :param uuid: UUID of a data file.
    :type uuid: str.
    :param update: Flag indicating whether to update an existing index.
    :type update: bool.
    :returns: a child of the FileServerItem or None if there was an error.

    '''


@transaction.commit_manually
def _add_bam(data_file, tdf_file_uuid=None, index=False):
    '''Create a new BAMItem instance.
    Manual transaction control is required when using PostgreSQL and save() or create() raise an exception.
    See: https://docs.djangoproject.com/en/dev/topics/db/transactions/#handling-exceptions-within-postgresql-transactions

    :param data_file_uuid: UUID of the BAM file.
    :type data_file_uuid: str.
    :param tdf_file_uuid: UUID of the TDF file.
    :type tdf_file_uuid: str.
    :param index: Flag indicating whether to create and load TDF index into the cache.
    :type index: bool.
    :returns: BAMItem -- newly created BAMItem model instance or None if there was an error.
    
    '''

    if tdf_file_uuid:
        tdf_file = FileStoreItem.objects.get_item(tdf_file_uuid)
    else:
        tdf_file = None
        logger.debug("TDF file UUID was not provided")

    try:
        item = BAMItem.objects.create(data_file=data_file, tdf_file=tdf_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create BAMItem\n%s", e.message)
        return None

    #TODO: indexing and caching

    transaction.commit()
    logger.info("BAMItem created")
    return item


@transaction.commit_manually()
def _add_tdf(data_file, index=False):
    '''Create a new TDFItem instance.

    :param data_file_uuid: UUID of the TDF file.
    :type data_file_uuid: str.
    :param index: Flag indicating whether to create and load TDF index into the cache.
    :type index: bool.
    :returns: TDFItem -- newly created TDFItem model instance or None if there was an error.

    '''
    try:
        item = TDFItem.objects.create(data_file=data_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create TDFItem\n%s", e.message)
        return None

    #TODO: indexing and caching

    transaction.commit()
    logger.info("TDFItem created")
    return item
