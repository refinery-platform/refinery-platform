'''
Created on Apr 21, 2012

@author: nils
'''

import logging
from django.db import models
from file_store.models import FileStoreItem


logger = logging.getLogger('file_server')


class FileServerItem(models.Model):
    '''Abstract base class representing pairs of files required for visualization.
    
    '''
    viz_file = models.ForeignKey(FileStoreItem, related_name="%(class)s_vizfile_related")
    data_file = models.ForeignKey(FileStoreItem, blank=True, null=True, related_name="%(class)s_datafile_related")
    # related_name argument is required and must be unique; see below for more details:
    # http://stackoverflow.com/questions/1142378/django-why-some-fields-clashes-with-other
    # https://docs.djangoproject.com/en/dev/ref/models/fields/#foreignkey
    # https://docs.djangoproject.com/en/dev/topics/db/models/#abstract-related-name
    
    class Meta:
        abstract = True



class TDFItem(FileServerItem):
    '''Represents TDF file and links it to the data file from which it was created.

    '''
    def update(self, uuid):
        '''Associate a data file with a visualization file.
        
        :param uuid: UUID of the visualization file.
        :type uuid: str.
        :returns: bool -- True if update succeeded, False if failed.
        
        '''
        logger.debug("Updating TDFItem")

        item = FileStoreItem.objects.get_item(uuid=uuid)
        
        if item:
            self.data_file = item
            logger.debug("TDFItem updated")
            return True
        else:
            logger.debug("Failed updating TDFItem")
            return False


def add_tdf(viz_file_uuid, data_file_uuid=None, index=False):
    '''Create a new FileServerItem instance.

    :param viz_file_uuid: UUID of the visualization file.
    :param type: str.
    :param data_file_uuid: UUID of the data file.
    :param type: str.
    :param index: Flag indicating whether to create and load TDF index into the cache.
    :type index: bool.
    :returns: TDFItem -- newly created TDFItem model instance or None if there was an error.
    
    '''
    logger.debug("Creating a TDFItem")

    #TODO: check if there is already a TDFItem associated with a FileStoreItem with viz_file_uuid

    viz_file = FileStoreItem.objects.get_item(viz_file_uuid)
    data_file = FileStoreItem.objects.get_item(data_file_uuid)
    #TODO: error checking
    item = TDFItem.objects.create(viz_file=viz_file, data_file=data_file)

    #TODO: indexing and caching

    logger.info("TDFItem created")
    return item


def get_tdf(uuid):
    '''Return TDFItem given UUID of a data file.

    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: TDFItem or None if not found

    '''
