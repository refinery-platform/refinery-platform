'''
Created on Oct 30, 2015

@author: scott
'''

import logging
import time
from datetime import timedelta

from file_store.models import FileType, FileStoreItem
from django.core.management.base import BaseCommand
from django.core import management

from core.utils import get_aware_local_time

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    args = "OPTIONAL(<days_ago>)"
    help = "Updates all FileStoreItem's FileTypes, and then reindexs them so" \
           " that any changes will show up in the dataset view as well as " \
           "the admin console. Can pass optional int argument 'days_ago' to " \
           "only update objects created within the past n day(s)"
    """
    Name: handle
    Description:
    Update FileStoreItem's FileTypes and then reindex DataSetManager. Can
    pass optional int argument 'days_ago' to only update objects created
    within the past n day(s)
    """

    def handle(self, *args, **kwargs):
        """
        Name: update_file_store_item
        Description:
        updates FileStoreItem's filetype's
        """

        def update_file_store_item(item, extension):
            try:
                item.filetype = FileType.objects.get(extension=extension)
                item.save()
                pass
            except Exception as e:
                logger.error("Couldn't update %s with extension: %s, %s" %
                             (item, extension, e))

        num_updated, unknown_ext = 0, 0
        all_known_extensions = [e.extension for e in FileType.objects.all()]

        try:
            days_ago = args[0]
            file_store_query = FileStoreItem.objects.filter(
                created__gt=get_aware_local_time() - timedelta(
                    days=int(days_ago)))
        except Exception:
            file_store_query = FileStoreItem.objects.all()

        for file_store_item in file_store_query:
            f = str(file_store_item.source.rpartition("/")[-1]).split('.',
                                                                      1)[-1]
            if f in all_known_extensions:
                update_file_store_item(file_store_item, f)
                num_updated += 1
            else:
                f = f.split('.', 2)[-1]
                if f in all_known_extensions:
                    update_file_store_item(file_store_item, f)
                    num_updated += 1
                else:
                    f = f.rpartition(".")[-1]
                    if f in all_known_extensions:
                        update_file_store_item(file_store_item, f)
                        num_updated += 1
                    else:
                        update_file_store_item(file_store_item, "unknown")
                        num_updated += 1
                        unknown_ext += 1

        print "%s FileStoreItem objects updated." % num_updated
        print "%s FileStoreItem objects with unknown extensions." % unknown_ext
        print "Updating index... This may take awhile!"
        time.sleep(1)
        management.call_command('update_index', 'data_set_manager', b=25)
