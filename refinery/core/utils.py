import logging
from core.models import DataSet, Project
from core.search_indexes import DataSetIndex

logger = logging.getLogger(__name__)


def update_data_set_index():
    data_set_index = DataSetIndex()
    data_set_index.update_object(data_set, using="core")
