import logging

from django.db.models.deletion import Collector
from django.db.models.fields.related import ForeignKey

from celery.task import task

from file_store.models import FileStoreItem
from file_store.tasks import FileImportTask

from .models import SiteStatistics

logger = logging.getLogger(__name__)


def copy_file(original_item_uuid):
    """Creates a copy of a FileStoreItem with the given UUID"""
    try:
        original_item = FileStoreItem.objects.get(uuid=original_item_uuid)
    except (FileStoreItem.DoesNotExist,
            FileStoreItem.MultipleObjectsReturned) as exc:
        logger.error("Failed to copy FileStoreItem with UUID '%s': %s",
                     original_item_uuid, exc)
        return None
    try:
        new_item = FileStoreItem.objects.create(
            source=original_item.source, filetype=original_item.filetype
        )
    except AttributeError:
        return None
    else:
        FileImportTask().delay(new_item.uuid).get()
        return new_item.uuid


@task()
def collect_site_statistics():
    SiteStatistics.objects.create().collect()
