import os
from urlparse import urljoin

from django.conf import settings
from django.test import SimpleTestCase

import mock

from .utils import S3MediaStorage, SymlinkedFileSystemStorage


class S3MediaStorageTest(SimpleTestCase):

    def setUp(self):
        self.storage = S3MediaStorage(bucket_name='test-bucket')

    @mock.patch('file_store.utils.S3MediaStorage.exists')
    def test_file_name_format(self, mock_exists):
        mock_exists.return_value = False
        name = self.storage.get_available_name('test.fastq')
        self.assertRegexpMatches(name, '[\w]{7}/test\.fastq')

    @mock.patch('file_store.utils.S3MediaStorage.exists')
    def test_leading_dash_removal(self, mock_exists):
        mock_exists.return_value = False
        name = self.storage.get_available_name('--test.fastq')
        self.assertEqual(os.path.basename(name), 'test.fastq')

    @mock.patch('file_store.utils.S3MediaStorage.exists')
    def test_max_name_length(self, mock_exists):
        mock_exists.return_value = False
        name = self.storage.get_available_name(
            ''.join('a' for _ in range(256))
        )
        self.assertEqual(len(os.path.basename(name)), 255)


class SymlinkedFileSystemStorageTest(SimpleTestCase):

    def setUp(self):
        self.storage = SymlinkedFileSystemStorage()

    def test_symlinked_storage_base_url(self):
        self.assertEqual(
            self.storage.base_url,
            urljoin(settings.MEDIA_URL, settings.FILE_STORE_DIR) + "/"
        )

    def test_symlinked_storage_location(self):
        self.assertEqual(
            self.storage.location,
            os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
        )

    @mock.patch('file_store.utils.FileSystemStorage.get_available_name')
    def test_file_name_format(self, mock_get_available_name):
        self.storage.get_available_name('test.fastq')
        mock_get_available_name.assert_called_with('2f/e3/test.fastq')

    @mock.patch('file_store.utils.FileSystemStorage.get_available_name')
    def test_leading_dash_removal(self, mock_get_available_name):
        self.storage.get_available_name('--test.fastq')
        mock_get_available_name.assert_called_with('7b/20/test.fastq')

    @mock.patch('file_store.utils.FileSystemStorage.get_available_name')
    def test_max_name_length(self, mock_get_available_name):
        name = ''.join('a' for _ in range(256))
        self.storage.get_available_name(name)
        mock_get_available_name.assert_called_with('80/4c/' + name[-255:])
