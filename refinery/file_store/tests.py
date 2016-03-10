"""This file contains tests for file_store.models and file_store.tasks
"""

import os
import mock
from urlparse import urljoin

from django.conf import settings
from django.test import SimpleTestCase

from file_store.models import file_path, get_temp_dir, get_file_object, \
    FileStoreItem, FileExtension, FILE_STORE_TEMP_DIR, \
    generate_file_source_translator, FileType


class FileStoreModuleTest(SimpleTestCase):
    """File store module functions test"""

    def setUp(self):
        self.filename = 'test_file.dat'
        self.sharename = 'labname'

        # create FileStoreItem instances without any disk operations
        self.path_source = os.path.join('/example/path', self.filename)
        self.item_from_path = FileStoreItem.objects.create(
            source=self.path_source, sharename=self.sharename)
        self.url_source = urljoin('http://example.org/', self.filename)
        self.item_from_url = FileStoreItem.objects.create(
            source=self.url_source, sharename=self.sharename)

    def test_file_path(self):
        """Check that the file store path contains share name and file name"""
        # TODO: replace with assertRegexpMatches()?
        path = file_path(self.item_from_url, self.filename)
        self.assertIn(self.sharename, path)
        self.assertIn(self.filename, path)
        path = file_path(self.item_from_path, self.filename)
        self.assertIn(self.sharename, path)
        self.assertIn(self.filename, path)

    def test_file_path_parens(self):
        """Check if the parentheses are replaced with underscores in the file
        name
        """
        filename = 'Kc.dMi-2(Q4443).wig_5.tdf'
        new_filename = 'Kc.dMi-2_Q4443_.wig_5.tdf'
        path_source = os.path.join('/example/path', filename)
        item_from_path = FileStoreItem.objects.create(
            source=path_source, sharename=self.sharename)
        url_source = urljoin('http://example.org/', filename)
        item_from_url = FileStoreItem.objects.create(
            source=url_source, sharename=self.sharename)
        path = file_path(item_from_url, filename)
        self.assertIn(self.sharename, path)
        self.assertIn(new_filename, path)
        path = file_path(item_from_path, filename)
        self.assertIn(self.sharename, path)
        self.assertIn(new_filename, path)

    def test_get_temp_dir(self):
        """Check that the file store temp dir is reported correctly"""
        self.assertEqual(get_temp_dir(), FILE_STORE_TEMP_DIR)

    def test_get_file_object(self):
        """Check if the correct file is opened"""
        m = mock.MagicMock(spec=file, return_value=mock.sentinel.file_object)
        with mock.patch('__builtin__.open', m):
            file_object = get_file_object(self.path_source)
        m.assert_called_once_with(self.path_source, 'rb')
        # check if an expected object is returned
        self.assertEqual(file_object, mock.sentinel.file_object)

    @mock.patch('__builtin__.open', spec=file)
    def test_get_file_object_2(self, m):
        """Decorator version of the test_get_file_obejct()"""
        m.return_value = mock.sentinel.file_object
        # check if the correct file is opened
        file_object = get_file_object(self.path_source)
        m.assert_called_once_with(self.path_source, 'rb')
        # check if an expected object is returned
        self.assertEqual(file_object, mock.sentinel.file_object)


class FileStoreItemTest(SimpleTestCase):
    """FileStoreItem methods test"""

    def setUp(self):
        self.filename = 'test_file.tdf'
        self.sharename = 'labname'
        self.path_source = os.path.join('/example/path', self.filename)
        self.url_source = urljoin('http://example.org/', self.filename)

    def test_get_full_url_remote_file(self):
        """Check if the source URL is returned for files that have not been
        imported
        """
        # create FileStoreItem instances without any disk operations
        item_from_url = FileStoreItem.objects.create(source=self.url_source,
                                                     sharename=self.sharename)
        self.assertEqual(item_from_url.get_full_url(), item_from_url.source)

    def test_get_file_extension(self):
        """Check that the correct file extension is returned"""
        # create FileStoreItem instances without any disk operations
        item_from_url = FileStoreItem.objects.create(source=self.url_source,
                                                     sharename=self.sharename)
        item_from_path = FileStoreItem.objects.create(source=self.path_source,
                                                      sharename=self.sharename)
        # data file doesn't exist on disk and source is an abs file system path
        self.assertEqual(item_from_path.get_file_extension(),
                         os.path.splitext(self.filename)[1])
        # data file doesn't exist on disk and source is a URL
        self.assertEqual(item_from_url.get_file_extension(),
                         os.path.splitext(self.filename)[1])
        # TODO: data file exists on disk

    def test_get_file_type(self):
        """Check that the correct file type is returned"""
        filetype = FileExtension.objects.get(name='bb').filetype
        item_from_path = FileStoreItem.objects.create(source=self.url_source,
                                                      sharename=self.sharename,
                                                      filetype=filetype)
        item_from_url = FileStoreItem.objects.create(source=self.path_source,
                                                     sharename=self.sharename,
                                                     filetype=filetype)
        self.assertEqual(item_from_path.get_filetype(), filetype)
        self.assertEqual(item_from_url.get_filetype(), filetype)

    def test_set_valid_file_type(self):
        """Check that a valid file type is set correctly"""
        item_from_path = FileStoreItem.objects.create(source=self.url_source,
                                                      sharename=self.sharename)
        item_from_url = FileStoreItem.objects.create(source=self.path_source,
                                                     sharename=self.sharename)
        filetype = FileExtension.objects.get(name='wig').filetype
        self.assertTrue(item_from_path.set_filetype(filetype))
        self.assertNotEqual(item_from_path.filetype, filetype)
        self.assertTrue(item_from_url.set_filetype(filetype))
        self.assertNotEqual(item_from_url.filetype, filetype)

    def test_set_unknown_file_type(self):
        """Check that an unknown file type is not set"""
        item_from_url = FileStoreItem.objects.create(source=self.path_source,
                                                     sharename=self.sharename)
        item_from_path = FileStoreItem.objects.create(source=self.url_source,
                                                      sharename=self.sharename)
        filetype = FileExtension.objects.get(name='unknown').filetype
        self.assertTrue(item_from_path.set_filetype(filetype))
        self.assertNotEqual(item_from_path.filetype, filetype)
        self.assertTrue(item_from_url.set_filetype(filetype))
        self.assertNotEqual(item_from_url.filetype, filetype)

    def test_set_file_type_automatically(self):
        """Check that a file type is set automatically"""
        item_from_url = FileStoreItem.objects.create(source=self.path_source,
                                                     sharename=self.sharename)
        item_from_path = FileStoreItem.objects.create(source=self.url_source,
                                                      sharename=self.sharename)
        item_from_path.set_filetype()
        self.assertTrue(item_from_path.filetype,
                        os.path.splitext(self.filename)[1])
        item_from_url.set_filetype()
        self.assertTrue(item_from_url.filetype,
                        os.path.splitext(self.filename)[1])


class FileStoreItemManagerTest(SimpleTestCase):
    """FileStoreItemManager methods test"""

    def setUp(self):
        self.filename = 'test_file.tdf'
        self.sharename = 'labname'
        self.path_prefix = '/example/local/path/'
        self.path_source = os.path.join(self.path_prefix, self.filename)
        self.url_prefix = 'http://example.org/web/path/'
        self.url_source = urljoin(self.url_prefix, self.filename)

    def test_file_source_map_translation(self):
        """Test translation from URL to file system path when creating a new
        instance
        """
        settings.REFINERY_FILE_SOURCE_MAP = {self.url_prefix: self.path_prefix}
        item = FileStoreItem.objects.create_item(self.url_source)
        self.assertEqual(item.source, self.path_source)

    def test_empty_file_source_map_translation(self):
        """Test that empty map doesn't affect creating new FileStoreItem
        instances
        """
        settings.REFINERY_FILE_SOURCE_MAP = {}
        item = FileStoreItem.objects.create_item(self.url_source)
        self.assertEqual(item.source, self.url_source)
        item = FileStoreItem.objects.create_item(self.path_source)
        self.assertEqual(item.source, self.path_source)


class FileSourceTranslationTest(SimpleTestCase):
    def setUp(self):
        self.username = 'guest'
        self.base_path = '/test/'
        self.filename = 'test_file.fastq'
        self.abs_path_source = os.path.join('/absolute/path', self.filename)
        self.rel_path_source = os.path.join('relative/path', self.filename)
        self.url_prefix = 'http://example.org/web/path/'
        self.url_source = urljoin(self.url_prefix, self.filename)

    def test_translate_with_map(self):
        settings.REFINERY_FILE_SOURCE_MAP = {self.url_prefix: '/new/path/'}
        translate_file_source = generate_file_source_translator()
        source = translate_file_source(self.url_source)
        self.assertEqual(source, os.path.join('/new/path/', self.filename))

    def test_translate_from_url(self):
        translate_file_source = generate_file_source_translator()
        source = translate_file_source(self.url_source)
        self.assertEqual(source, self.url_source)

    def test_translate_from_absolute_path(self):
        translate_file_source = generate_file_source_translator()
        source = translate_file_source(self.abs_path_source)
        self.assertEqual(source, self.abs_path_source)

    def test_translate_from_relative_path_with_base_bath(self):
        translate_file_source = \
            generate_file_source_translator(base_path=self.base_path)
        source = translate_file_source(self.rel_path_source)
        self.assertEqual(source,
                         os.path.join(self.base_path, self.rel_path_source))

    def test_translate_from_relative_path_without_base_path(self):
        translate_file_source = \
            generate_file_source_translator(username=self.username)
        source = translate_file_source(self.rel_path_source)
        self.assertEqual(source, os.path.join(
            settings.REFINERY_DATA_IMPORT_DIR,
            self.username,
            self.rel_path_source))

    def test_translate_from_relative_path_without_username_or_base_path(self):
        translate_file_source = generate_file_source_translator()
        with self.assertRaises(ValueError):
            translate_file_source(self.rel_path_source)


class UnknownFileTypeTest(SimpleTestCase):
    def setUp(self):
        self.filetype = FileType.objects.get(name="UNKNOWN")

    def tearDown(self):
        FileType.objects.get(name="UNKNOWN").delete()

    def test_filetype_persistence_after_deletion(self):
        self.filetype.delete()
        self.assertIsNotNone(self.filetype)


class UnknownFileExtensionTest(SimpleTestCase):
    def setUp(self):
        self.filetype = FileType.objects.get(name="UNKNOWN")
        self.fileextension = FileExtension.objects.get(name="unknown")

    def tearDown(self):
        FileType.objects.get(name="UNKNOWN").delete()
        FileExtension.objects.get(name="unknown").delete()

    def test_file_extension_persistence_after_deletion(self):
        self.fileextension.delete()
        self.assertIsNotNone(self.fileextension)
