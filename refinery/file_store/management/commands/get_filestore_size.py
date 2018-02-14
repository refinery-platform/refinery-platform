from __future__ import absolute_import

import logging
from subprocess import check_output

from django.core.management.base import BaseCommand

from ...models import FileStoreItem

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    help = "Provides user with the Size of the FileStore"
    """
    Name: handle
    Description:
    Provides user with the Size of the FileStore
    """

    def handle(self, *args, **options):
        # Format the FileStore size from bytes
        def sizeof_fmt(num, suffix='B'):
            for unit in ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z']:
                if abs(num) < 1024.0:
                    return "%3.1f%s%s" % (num, unit, suffix)
                num /= 1024.0
            return "%.1f%s%s" % (num, 'Y', suffix)

        # Find the total size in bytes of the FileStore
        # This size represents the total size on disk of the file_store
        # Items that are in the file store that have persisted from previous
        # anlayses etc.
        def get_filestore_size():
            for item in FileStoreItem.objects.all():
                if item.get_absolute_path():
                    file_store_dir = item.get_absolute_path().split(
                        "file_store")[0] + "file_store"
                    size_in_bytes = check_output(["du", "-sb",
                                                 file_store_dir]).split(
                                                                  "\t")[0]
                    return int(size_in_bytes)
        try:
            return sizeof_fmt(get_filestore_size())
        except Exception as e:
            return e
