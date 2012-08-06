'''
Created on Apr 21, 2012

@author: nils
'''

from django.db import models
from file_store.models import FileStoreItem


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
    '''Represents TDF file.
    
    '''
    def add(self, viz_file_uuid, data_file_uuid=None, index=False):
        '''Create a new FileServerItem instance.
        
        :param viz_file_uuid: UUID of the visualization file.
        :param type: str.
        :param data_file_uuid: UUID of the data file.
        :param type: str.
        
        :returns: 
        
        '''
        pass

    def get(self, uuid):
        '''
        
        :param uuid:
        :returns: FileServerItem or None if not found
        '''
        pass
