'''
Created on Apr 21, 2012

@author: Ilya Sytchev
'''

import logging
from django.db import models, transaction
from django.db.utils import IntegrityError
from file_store.models import FileStoreItem


logger = logging.getLogger('file_server')


class FileServerItem(models.Model):
    '''Abstract base class representing pairs of files required for visualization.
    
    '''
    data_file = models.ForeignKey(FileStoreItem, unique=True,
                                 related_name="%(app_label)s_%(class)s_data_file_related")
    # related_name argument is required and must be unique; see below for details:
    # http://stackoverflow.com/questions/1142378/django-why-some-fields-clashes-with-other
    # https://docs.djangoproject.com/en/dev/ref/models/fields/#foreignkey
    # https://docs.djangoproject.com/en/dev/topics/db/models/#abstract-related-name

    class Meta:
        abstract = True


class TDFItem(FileServerItem):
    '''Represents a TDF file that is not linked to a data file.
    
    '''
    def __unicode__(self):
        return self.data_file.uuid


class BAMFileItem(FileServerItem):
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
    '''Create a file store item of an appropriate type.

    :param data_file_uuid: UUID of a data file.
    :type data_file_uuid: str.
    :param aux_file_uuid: UUID of an auxiliary file.
    :type aux_file_uuid: str.
    :param index: Flag indicating whether to create and load auxiliary file index into the cache.
    :type index: bool.
    :returns: a child of the FileStoreItem -- new model instance or None if there was an error.
    
    '''
    #TODO: check if there is already a FileStoreItem with this data_file UUID


def get(uuid):
    '''Returns an instance of a child of the FileServerItem that has a data_file with the specified UUID.

    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: a child of the FileServerItem.

    '''


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
def _add_bam(data_file_uuid, tdf_file_uuid=None, index=False):
    '''Create a new BAMFileItem instance.
    Manual transaction control is required when using PostgreSQL and save() or create() raise an exception.
    See: https://docs.djangoproject.com/en/dev/topics/db/transactions/#handling-exceptions-within-postgresql-transactions

    :param data_file_uuid: UUID of the BAM file.
    :type data_file_uuid: str.
    :param tdf_file_uuid: UUID of the TDF file.
    :type tdf_file_uuid: str.
    :param index: Flag indicating whether to create and load TDF index into the cache.
    :type index: bool.
    :returns: BAMFileItem -- newly created BAMFileItem model instance or None if there was an error.
    
    '''

    data_file = FileStoreItem.objects.get_item(data_file_uuid)
    if not data_file:
        logger.error("Failed to create BAMFileItem: BAM file must exist")
        return None

    if tdf_file_uuid:
        tdf_file = FileStoreItem.objects.get_item(tdf_file_uuid)
    else:
        tdf_file = None
        logger.debug("TDF file UUID was not provided")

    try:
        item = BAMFileItem.objects.create(data_file=data_file, tdf_file=tdf_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create BAMFileItem\n%s", e.message)
        return None

    #TODO: indexing and caching

    transaction.commit()
    logger.info("BAMFileItem created")
    return item


def _get_bam(uuid):
    '''Return BAMFileItem given UUID of a BAM file.

    :param uuid: UUID of a BAM file.
    :type uuid: str.
    :returns: BAMFileItem or None if there was an error.

    '''
    try:
        item = BAMFileItem.objects.get(data_file__uuid=uuid)
    except BAMFileItem.DoesNotExist:
        logger.error("BAMFileItem with UUID '%s' does not exist", uuid)
        return None
    except BAMFileItem.MultipleObjectsReturned:
        logger.error("More than one BAMFileItem matched UUID '%s'", uuid)
        return None

    return item
