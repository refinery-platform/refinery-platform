"""
This file contains tests for file_store.models and file_store.tasks

"""

import os
import mock
from urlparse import urljoin
from django.test import SimpleTestCase
import file_store.models as models
from django.core.files.base import File, ContentFile


class FileStoreModuleTest(SimpleTestCase):
    '''File store module functions test.

    '''
    def setUp(self):
        self.filename = 'test_file.dat'
        self.sharename = 'labname'

        # create FileStoreItem instances without any disk operations
        self.path_source = os.path.join('/example/path', self.filename)
        self.item_from_path = models.FileStoreItem.objects.create(source=self.path_source,
                                                                  sharename=self.sharename)
        self.url_source = urljoin('http://example.org/', self.filename)
        self.item_from_url = models.FileStoreItem.objects.create(source=self.url_source,
                                                                     sharename=self.sharename)

    def test_file_path(self):
        '''Check that the file store path contains share name and file name.

        '''
        #TODO: replace with assertRegexpMatches()?
        path = models.file_path(self.item_from_url, self.filename)
        self.assertIn(self.sharename, path)
        self.assertIn(self.filename, path)
        path = models.file_path(self.item_from_path, self.filename)
        self.assertIn(self.sharename, path)
        self.assertIn(self.filename, path)

    def test_get_temp_dir(self):
        '''Check that the file store temp dir is reported correctly.

        '''
        self.assertEqual(models.get_temp_dir(), models.FILE_STORE_TEMP_DIR)

    @mock.patch.object(models.FileStoreItem, 'get_file_object')
    def test_get_file_object_with_existing_uuid(self, mock_get_file_object):
        '''Check that a file object is returned if a valid UUID is provided.

        '''
        mock_get_file_object.return_value = mock.sentinel.file_object 
        file_object = models.get_file_object(self.item_from_path.uuid)
        mock_get_file_object.assert_called_once_with()
        self.assertEqual(file_object, mock.sentinel.file_object)

    def test_get_file_object_with_nonexisting_uuid(self):
        '''Check that None is returned if a UUID that doesn't exist is provided.

        '''
        file_object = models.get_file_object('non-existing-uuid')
        self.assertIsNone(file_object)


class FileStoreItemTest(SimpleTestCase):
    '''FileStoreItem methods test.

    '''
    def setUp(self):
        self.filename = 'test_file.dat'
        self.sharename = 'labname'

        # create FileStoreItem instances without any disk operations
        self.path_source = os.path.join('/example/path', self.filename)
        self.item_from_url = models.FileStoreItem.objects.create(source=self.path_source,
                                                                 sharename=self.sharename)
        self.url_source = urljoin('http://example.org/', self.filename)
        self.item_from_path = models.FileStoreItem.objects.create(source=self.url_source,
                                                                  sharename=self.sharename)

    def test_get_file_extension(self):
        '''Check that the correct file extension is returned.

        '''
        # data file doesn't exist on disk and source is an abs file system path
        self.assertEqual(self.item_from_path.get_file_extension(),
                         os.path.splitext(self.filename)[1])
        # data file doesn't exist on disk and source is a URL
        self.assertEqual(self.item_from_url.get_file_extension(),
                         os.path.splitext(self.filename)[1])
        #TODO: data file exists on disk
