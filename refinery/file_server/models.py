'''
Created on Apr 21, 2012

@author: nils
'''

from django.db import models
from django_extensions.db.fields import UUIDField
from file_store.models import FileStoreItem

class FileServerItem(models.Model):
    '''Abstract base class representing pairs of files required for visualization.
    
    '''
    #visualization_file = models.ForeignKey(FileStoreItem)
    #data_file = models.ForeignKey(FileStoreItem, blank=True, null=True)

    class Meta:
        abstract = True

class TDFItem(FileServerItem):
    '''Represents TDF file.
    
    '''
    pass
