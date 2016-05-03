import os
import logging

logger = logging.getLogger(__name__)


def get_url_for_filestore_item(filestore_item):
    from core.utils import get_full_url
    """ This returns the url for a given FileStoreItem. If the FileStoreItem
    `is_local` then the url is constructed using the get_full_url method.
    :param filestore_item: the FileStoreItem that we want a url for
    :type filestore_item: A FileStoreItem instance
    :returns: A url for the given FileStoreItem or None
    """

    if filestore_item.is_local():
        # Call get_full_url with relative url of the filestore_item
        return get_full_url(filestore_item.datafile.url)
    else:
        # data file doesn't exist on disk
        if os.path.isabs(filestore_item.source):
            # source is a file system path
            logger.error("File not found at '%s'",
                         filestore_item.datafile.name)
            return None
        else:
            # source is a URL
            return filestore_item.source
