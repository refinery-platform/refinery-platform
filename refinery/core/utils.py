from __future__ import absolute_import
import logging

from .search_indexes import DataSetIndex


logger = logging.getLogger(__name__)


def index_data_set(data_set):
    logger.debug('Indexing data set (uuid: %s)', data_set.uuid)
    DataSetIndex().update_object(data_set, using='core')
