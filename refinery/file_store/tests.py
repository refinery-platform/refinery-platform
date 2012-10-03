"""
This file contains tests for file_store.models and file_store.tasks

"""

import os
import StringIO
from urlparse import urljoin
from django.test import SimpleTestCase
import file_store.models as models


class FileStoreModuleTest(SimpleTestCase):
    '''File store module functions test.

    '''
    def setUp(self):
        self.filename = 'test_file.dat'
        self.sharename = 'labname'

        self.path_source = os.path.join('/example/path', self.filename)
        # create a FileStoreItem instance without symlinking it
        self.item_from_url = models.FileStoreItem.objects.create(source=self.path_source,
                                                                 sharename=self.sharename)
        self.url_source = urljoin('http://example.org/', self.filename)
        self.item_from_path = models.FileStoreItem.objects.create(source=self.url_source,
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

    def test_get_file_object(self):
        '''Check that a file object is returned if a valid UUID is provided.

        '''
        content = 'test'
        models.FileStoreItem.get_file_object = lambda self: StringIO.StringIO(content)
        # test with an existing UUID
        fh = models.get_file_object(self.item_from_path.uuid)
        self.assertEqual(fh.read(), content)
        # test with an invalid UUID
        fh = models.get_file_object('invalid-uuid')
        self.assertIsNone(fh)


class FileStoreItemTest(SimpleTestCase):
    '''FileStoreItem methods test.

    '''
    def setUp(self):
        self.filename = 'test_file.dat'
        self.sharename = 'labname'

        self.path_source = os.path.join('/example/path', self.filename)
        # create a FileStoreItem instance without symlinking it
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
