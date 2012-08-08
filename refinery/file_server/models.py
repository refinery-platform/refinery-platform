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
    vis_file = models.ForeignKey(FileStoreItem, unique=True,
                                 related_name="%(app_label)s_%(class)s_visfile_related",
                                 verbose_name="visualization file")
    data_file = models.ForeignKey(FileStoreItem, blank=True, null=True,
                                  related_name="%(app_label)s_%(class)s_datafile_related")
    # related_name argument is required and must be unique; see below for more details:
    # http://stackoverflow.com/questions/1142378/django-why-some-fields-clashes-with-other
    # https://docs.djangoproject.com/en/dev/ref/models/fields/#foreignkey
    # https://docs.djangoproject.com/en/dev/topics/db/models/#abstract-related-name
    
    class Meta:
        abstract = True


class TDFItem(FileServerItem):
    '''Represents TDF file and optionally links it to the data file from which it was created.

    '''
    def __unicode__(self):
        if self.data_file:
            return self.vis_file.uuid + ' - ' + self.data_file.uuid
        else:
            return self.vis_file.uuid

    def update(self, uuid):
        '''Associate a data file with a visualization file.
        
        :param uuid: UUID of the visualization file.
        :type uuid: str.
        :returns: bool -- True if update succeeded, False if failed.
        
        '''
        logger.debug("Updating TDFItem using UUID '%s'", uuid)

        item = FileStoreItem.objects.get_item(uuid=uuid)

        if item:
            self.data_file = item
            try:
                self.save()
            except IntegrityError:
                logger.error("Failed updating TDFItem")
                return False
        else:
            logger.error("Failed updating TDFItem")
            return False

        logger.info("TDFItem updated")
        return True


@transaction.commit_manually
def add_tdf(vis_file_uuid, data_file_uuid=None, index=False):
    '''Create a new TDFItem instance.
    Manual transaction control is required when using PostgreSQL and save() or create() raise an exception.
    See: https://docs.djangoproject.com/en/dev/topics/db/transactions/#handling-exceptions-within-postgresql-transactions

    :param vis_file_uuid: UUID of the visualization file.
    :param type: str.
    :param data_file_uuid: UUID of the data file.
    :param type: str.
    :param index: Flag indicating whether to create and load TDF index into the cache.
    :type index: bool.
    :returns: TDFItem -- newly created TDFItem model instance or None if there was an error.
    
    '''
    logger.debug("Creating TDFItem")

    vis_file = FileStoreItem.objects.get_item(vis_file_uuid)
    if not vis_file:
        logger.error("Failed to create TDFItem: visualization file must exist")
        return None

    if data_file_uuid:
        data_file = FileStoreItem.objects.get_item(data_file_uuid)
    else:
        data_file = None
        logger.debug("Data file UUID was not provided")

    try:
        item = TDFItem.objects.create(vis_file=vis_file, data_file=data_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create TDFItem\n%s", e.message)
        return None

    #TODO: indexing and caching

    transaction.commit()
    logger.info("TDFItem created")
    return item


def get_tdf(uuid):
    '''Return TDFItem given UUID of a visualization file.

    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: TDFItem or None if there was an error.

    '''
    try:
        item = TDFItem.objects.get(vis_file__uuid=uuid)
    except TDFItem.DoesNotExist:
        logger.error("TDFItem with UUID '%s' does not exist", uuid)
        return None
    except TDFItem.MultipleObjectsReturned:
        logger.error("More than one TDFItem matched UUID '%s'", uuid)
        return None

    return item
