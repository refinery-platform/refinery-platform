from django import template
from file_store.models import FileStoreItem, FileStoreItem
import logging
import os.path

logger = logging.getLogger(__name__)
register = template.Library()

@register.filter(name='simple_name')
def simple_name(arg):
    '''
    Takes a file_store UUID and returns only the basename of the file. 
    
    :param arg: FilestoreItem UUID
    :type arg: str.
    :returns: Returns on file name from file_store UUID

    '''
    #logger.debug("simple_name template function called")
    return os.path.basename( FileStoreItem.objects.get(uuid=arg).get_file_object().name ) 