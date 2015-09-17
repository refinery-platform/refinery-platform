import logging
import os

from django import template

from file_store.models import FileStoreItem


logger = logging.getLogger(__name__)
register = template.Library()


@register.filter(name='simple_name')
def simple_name(arg):
    """Takes a file_store UUID and returns only the basename of the file.
    :param arg: FilestoreItem UUID
    :type arg: str.
    :returns: Returns on file name from file_store UUID
    """
    try:
        path = FileStoreItem.objects.get(uuid=arg).get_absolute_path()
    except FileStoreItem.DoesNotExist:
        logger.error("file store item with UUID '%s' does not exist", arg)
        return ''
    try:
        return os.path.basename(path)
    except AttributeError:
        logger.error("file path '%s' is invalid [UUID: '%s']", path, arg)
        return ''
