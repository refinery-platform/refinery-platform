from __future__ import absolute_import
import logging

from .search_indexes import DataSetIndex


logger = logging.getLogger(__name__)


def update_data_set_index(data_set):
    logger.debug('Updated data set (uuid: %s) index', data_set.uuid)
    DataSetIndex().update_object(data_set, using='core')


def delete_data_set_index(data_set):
    logger.debug('Deleted data set (uuid: %s) index', data_set.uuid)
    DataSetIndex().remove_object(data_set, using='core')
