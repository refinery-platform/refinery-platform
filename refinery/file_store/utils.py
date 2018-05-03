import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.crypto import get_random_string
from django.utils.deconstruct import deconstructible
from django.utils.text import get_valid_filename

from storages.backends.s3boto3 import S3Boto3Storage


class S3MediaStorage(S3Boto3Storage):
    """Django media (user data) files storage"""
    bucket_name = settings.MEDIA_BUCKET
    custom_domain = settings.MEDIA_BUCKET + '.s3.amazonaws.com'
    file_overwrite = False

    def get_available_name(self, name, max_length=None):
        while True:
            # remove leading '-' characters to make file management easier
            # limit file name length to 255 to make "fully portable" in POSIX
            name = os.path.join(get_random_string(7), name.lstrip('-')[-255:])
            if not self.exists(name):
                return name


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

    def get_available_name(self, name, max_length=None):
        # remove './' that is added by FileField.get_directory_name() when
        # upload_to is set to '' by default
        # TODO: remove this when get_directory_name() is removed in Django 2.0
        name = os.path.normpath(name)
        # create a hashed directory structure
        hashcode = hash(name)
        mask = 255  # bitmask
        # use the first and second bytes of the hash code represented as
        # zero-padded hex numbers as directory names
        # provides 256 * 256 = 65,536 of possible directory combinations
        dir1 = "{:0>2x}".format(hashcode & mask)
        dir2 = "{:0>2x}".format((hashcode >> 8) & mask)
        # remove leading '-' characters to make file management easier
        # limit file name length to 255 to make "fully portable" in POSIX
        name = os.path.join(dir1, dir2, name.lstrip('-')[-255:])
        return super(SymlinkedFileSystemStorage, self).get_available_name(name)

    def get_name(self, name):
        return self.get_available_name(get_valid_filename(name))
