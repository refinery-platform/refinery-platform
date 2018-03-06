import os
from urlparse import urljoin

from django.conf import settings
from django.test import SimpleTestCase

from .utils import SymlinkedFileSystemStorage


class SymlinkedFileSystemStorageTest(SimpleTestCase):

    def setUp(self):
        self.symlinked_storage = SymlinkedFileSystemStorage()

    def test_symlinked_storage_base_url(self):
        self.assertEqual(
            self.symlinked_storage.base_url,
            urljoin(settings.MEDIA_URL, settings.FILE_STORE_DIR) + "/"
        )

    def test_symlinked_storage_location(self):
        self.assertEqual(
            self.symlinked_storage.location,
            os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
        )
