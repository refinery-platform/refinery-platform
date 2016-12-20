"""This file contains tests for file_store.models and file_store.tasks
"""

import os
import mock
from urlparse import urljoin

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from rest_framework.test import APIRequestFactory
from rest_framework.test import APITestCase

from core.utils import get_full_url
from .models import (file_path, get_temp_dir, get_file_object, FileStoreItem,
                     FileExtension, FILE_STORE_TEMP_DIR,
                     generate_file_source_translator, FileType,
                     SymlinkedFileSystemStorage)
from .views import FileStoreItems
from .serializers import FileStoreItemSerializer


class FileStoreModuleTest(SimpleTestCase):
    """File store module functions test"""

    def setUp(self):
        self.filename = 'test_file.dat'
        self.sharename = 'labname'

        # create FileStoreItem instances without any disk operations
        self.path_source = os.path.join('/example/path', self.filename)
        self.item_from_path = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )
        self.url_source = urljoin('http://example.org/', self.filename)
        self.item_from_url = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )

    def tearDown(self):
        FileType.objects.all().delete()
        FileExtension.objects.all().delete()
        FileStoreItem.objects.all().delete()

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
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=path_source,
            sharename=self.sharename
        )
        url_source = urljoin('http://example.org/', filename)
        item_from_url = FileStoreItem.objects.create(
            source=url_source,
            sharename=self.sharename
        )
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
        self.tdf_filetype = FileType.objects.create(
            name="TDF", description="TDF file")
        self.tdf_fileextension = FileExtension.objects.create(
            name="tdf", filetype=self.tdf_filetype)

        self.filename = 'test_file.tdf'
        self.sharename = 'labname'
        self.path_source = os.path.join('/example/path', self.filename)
        self.url_source = urljoin('http://example.org/', self.filename)

    def tearDown(self):
        FileType.objects.all().delete()
        FileExtension.objects.all().delete()
        FileStoreItem.objects.all().delete()

    def test_get_full_url_local_file(self):
        """Check if the full URL is properly returned for files that exist
        in Refinery
        """
        # create FileStoreItem instances without any disk operations
        local_file = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )

        self.assertEqual(
            get_full_url(local_file.get_datafile_url()),
            '{}://{}{}'.format(
                settings.REFINERY_URL_SCHEME,
                Site.objects.get_current().domain,
                local_file.datafile.url
            )
        )

    def test_get_full_url_remote_file(self):
        """Check if the source URL is returned for files that have not been
        imported
        """
        # create FileStoreItem instances without any disk operations
        item_from_url = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )
        self.assertEqual(get_full_url(item_from_url.get_datafile_url()),
                         item_from_url.source)

    def test_get_file_extension(self):
        """Check that the correct file extension is returned"""
        # create FileStoreItem instances without any disk operations
        item_from_url = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename,
            filetype=self.tdf_filetype
        )
        item_from_path = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename,
            filetype=self.tdf_filetype
        )
        # data file doesn't exist on disk and source is an abs file system path
        self.assertEqual(item_from_path.get_file_extension(),
                         self.filename.split(".")[-1])
        # data file doesn't exist on disk and source is a URL
        self.assertEqual(item_from_url.get_file_extension(),
                         self.filename.split(".")[-1])
        # TODO: data file exists on disk

    def test_get_file_type(self):
        """Check that the correct file type is returned"""
        self.bigbed_filetype = FileType.objects.create(
            name="BIGBED", description="BIGBED File")
        self.bigbed_fileextension = FileExtension.objects.create(
            name="bb", filetype=self.bigbed_filetype)

        item_from_path = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bb',
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename,
            filetype=self.bigbed_filetype
        )
        item_from_url = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename,
            filetype=self.bigbed_filetype
        )
        self.assertEqual(item_from_path.get_filetype(), self.bigbed_filetype)
        self.assertEqual(item_from_url.get_filetype(), self.bigbed_filetype)

    def test_set_valid_file_type(self):
        """Check that a valid file type is set correctly"""
        self.wig_filetype = FileType.objects.create(
            name="WIG", description="WIG File")
        self.wig_fileextension = FileExtension.objects.create(
            name="wig", filetype=self.wig_filetype)
        item_from_path = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )
        item_from_url = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )
        self.assertTrue(item_from_path.set_filetype(self.wig_filetype))
        self.assertNotEqual(item_from_path.filetype, self.wig_filetype)
        self.assertTrue(item_from_url.set_filetype(self.wig_filetype))
        self.assertNotEqual(item_from_url.filetype, self.wig_filetype)

    def test_set_unknown_file_type(self):
        """Check that an unknown file type is not set"""
        item_from_url = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )
        item_from_path = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )
        self.assertIsNone(item_from_url.filetype)
        self.assertIsNone(item_from_path.filetype)

    def test_set_file_type_automatically(self):
        """Check that a file type is set automatically"""
        item_from_url = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )
        item_from_path = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )
        item_from_path.set_filetype()
        self.assertTrue(item_from_path.filetype,
                        os.path.splitext(self.filename)[1])
        item_from_url.set_filetype()
        self.assertTrue(item_from_url.filetype,
                        os.path.splitext(self.filename)[1])

    def test_get_fileextension(self):
        """Check that the correct FileExtension is returned"""
        # create FileStoreItem instances without any disk operations
        item_from_url = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )
        item_from_path = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )

        item_from_url.set_filetype()
        item_from_path.set_filetype()

        self.assertEqual(item_from_path.get_file_extension(),
                         self.filename.split(".")[-1])
        # data file doesn't exist on disk and source is a URL
        self.assertEqual(item_from_url.get_file_extension(),
                         self.filename.split(".")[-1])


class FileStoreItemManagerTest(SimpleTestCase):
    """FileStoreItemManager methods test"""

    def setUp(self):
        self.filename = 'test_file.tdf'
        self.sharename = 'labname'
        self.path_prefix = '/example/local/path/'
        self.path_source = os.path.join(self.path_prefix, self.filename)
        self.url_prefix = 'http://example.org/web/path/'
        self.url_source = urljoin(self.url_prefix, self.filename)

    def tearDown(self):
        FileType.objects.all().delete()
        FileExtension.objects.all().delete()

    def test_file_source_map_translation(self):
        """Test translation from URL to file system path when creating a new
        instance
        """
        settings.REFINERY_FILE_SOURCE_MAP = {self.url_prefix: self.path_prefix}
        item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )
        self.assertEqual(item.source, self.path_source)

    def test_empty_file_source_map_translation(self):
        """Test that empty map doesn't affect creating new FileStoreItem
        instances
        """
        settings.REFINERY_FILE_SOURCE_MAP = {}
        item = FileStoreItem.objects.create(
            source=self.url_source,
            sharename=self.sharename
        )
        self.assertEqual(item.source, self.url_source)
        item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                self.filename,
                'Coffee is delicious!'
            ),
            source=self.path_source,
            sharename=self.sharename
        )
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


class FileStoreItemsAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        # create FileStoreItem instances without any disk operations
        self.url_source = 'http://example.org/test_file.dat'
        self.item_from_url = FileStoreItem.objects.create(
            source=self.url_source, sharename='labname')
        self.view = FileStoreItems.as_view()
        self.valid_uuid = self.item_from_url.uuid
        self.url_root = '/api/v2/file_store_items/'
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

    def tearDown(self):
        FileType.objects.all().delete()
        FileExtension.objects.all().delete()

    def test_get_valid(self):
        # valid_uuid
        file_store_item_obj = FileStoreItem.objects.get(
            uuid=self.item_from_url.uuid)
        expected_response = FileStoreItemSerializer(file_store_item_obj)
        request = self.factory.get('%s/%s/' % (self.url_root, self.valid_uuid))
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)

        responseKeys = response.data.keys()
        for field in responseKeys:
            self.assertEqual(response.data[field],
                             expected_response.data[field])

    def test_get_invalid(self):
        # invalid_uuid
        request = self.factory.get('%s/%s/' % (self.url_root,
                                               self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_format(self):
        # invalid_format_uuid
        request = self.factory.get('%s/%s/'
                                   % (self.url_root, self.invalid_format_uuid))
        response = self.view(request, self.invalid_format_uuid)
        self.assertEqual(response.status_code, 404)


class SymlinkedFileSystemStorageTest(SimpleTestCase):
    """SymlinkedFileSystemStorage test"""

    def setUp(self):
        self.symlinked_storage = SymlinkedFileSystemStorage()

    def test_symlinked_storage(self):
        self.assertIsNotNone(self.symlinked_storage)
        self.assertEqual(
            self.symlinked_storage.base_url,
            urljoin(settings.MEDIA_URL, settings.FILE_STORE_DIR) + "/"
        )
        self.assertEqual(
            self.symlinked_storage.location,
            os.path.join(settings.MEDIA_ROOT, settings.FILE_STORE_DIR)
        )
