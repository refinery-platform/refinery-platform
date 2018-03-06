import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible

from storages.backends.s3boto3 import S3Boto3Storage


@deconstructible
class SymlinkedFileSystemStorage(FileSystemStorage):
    """Custom file system storage class with support for symlinked files"""

    # Allow for SymlinkedFileSystemStorage to be settings-agnostic
    # SEE: http://stackoverflow.com/a/32349636/6031066
    def __init__(self):
        super(SymlinkedFileSystemStorage, self).__init__(
            location=settings.FILE_STORE_BASE_DIR,
            base_url=settings.FILE_STORE_BASE_URL
        )

    def exists(self, name):
        # takes broken symlinks into account
        return os.path.lexists(self.path(name))


class S3MediaStorage(S3Boto3Storage):
    """Django media (user data) files storage"""
    bucket_name = settings.MEDIA_BUCKET
    custom_domain = settings.MEDIA_BUCKET + '.s3.amazonaws.com'
    file_overwrite = False
