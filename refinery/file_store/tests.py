import os
from urlparse import urljoin

from django.conf import settings
from django.core.files import File
from django.core.files.storage import Storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings

import mock
from rest_framework.test import APIRequestFactory, APITestCase

from .models import (FileExtension, FileStoreItem, FileType,
                     SymlinkedFileSystemStorage, file_path,
                     generate_file_source_translator,
                     _get_extension_from_string, get_file_object, get_temp_dir,
                     _map_source, parse_s3_url)
from .serializers import FileStoreItemSerializer
from .views import FileStoreItems


class FileStoreModuleTest(TestCase):

    def setUp(self):
        self.filename = 'test_file.dat'
        self.path_prefix = '/example/path/'
        self.path_source = os.path.join(self.path_prefix, self.filename)
        self.url_prefix = 'http://example.org/'
        self.url_source = urljoin(self.url_prefix, self.filename)

    def test_file_path(self):
        path = file_path(FileStoreItem(), 'test.fastq')
        self.assertIn('test.fastq', path)

    def test_file_path_underscore_replacement(self):
        filename = 'Kc.dMi-2(Q4443).wig_5.tdf'
        new_filename = 'Kc.dMi-2_Q4443_.wig_5.tdf'
        path = file_path(FileStoreItem(), filename)
        self.assertIn(new_filename, path)
        self.assertNotIn(filename, path)

    def test_get_temp_dir(self):
        self.assertEqual(get_temp_dir(), settings.FILE_STORE_TEMP_DIR)

    @mock.patch('__builtin__.open', new_callable=mock.mock_open)
    def test_get_file_object(self, mock_file_open):
        mock_file_open.return_value = mock.sentinel.file_object
        file_object = get_file_object(self.path_source)
        mock_file_open.assert_called_once_with(self.path_source, 'rb')
        self.assertEqual(file_object, mock.sentinel.file_object)

    def test_get_extension_from_file(self):
        self.assertEqual(_get_extension_from_string('test.fastq'), 'fastq')

    def test_get_multi_extension_from_file(self):
        self.assertEqual(_get_extension_from_string('test.fastq.gz'),
                         'fastq.gz')

    def test_get_blank_extension_from_file(self):
        self.assertEqual(_get_extension_from_string('test'), '')

    def test_get_extension_from_url(self):
        self.assertEqual(
            _get_extension_from_string('http://example.org/test.fastq'),
            'fastq'
        )

    def test_get_multi_extension_from_url(self):
        self.assertEqual(
            _get_extension_from_string('http://example.org/test.fastq.gz'),
            'fastq.gz'
        )

    def test_get_blank_extension_from_url(self):
        self.assertEqual(_get_extension_from_string('http://example.org/test'),
                         '')

    def test_parse_s3_url(self):
        bucket_name, key = parse_s3_url('s3://bucket-name/key')
        self.assertEqual(bucket_name, 'bucket-name')
        self.assertEqual(key, 'key')

    @override_settings(REFINERY_FILE_SOURCE_MAP={})
    def test_mapping_with_empty_file_source_map(self):
        self.assertEqual(_map_source(self.url_source), self.url_source)

    def test_file_source_map(self):
        with override_settings(
                REFINERY_FILE_SOURCE_MAP={self.url_prefix: self.path_prefix}
        ):
            self.assertEqual(_map_source(self.url_source), self.path_source)


class FileStoreItemTest(TestCase):

    def setUp(self):
        # TODO: replace with create() when migrations are no longer required
        self.file_type = FileType.objects.get_or_create(name='TDF')[0]
        self.file_extension = FileExtension.objects.get_or_create(
            name='tdf', filetype=self.file_type
        )[0]
        self.file_name = 'test_file.tdf'
        self.path_source = os.path.join('/example/path', self.file_name)
        self.url_source = urljoin('http://example.org/', self.file_name)

    def test_get_local_file_url(self):
        file_mock = mock.MagicMock(spec=File)
        file_mock.name = 'test.fastq'
        item = FileStoreItem()
        item.datafile = file_mock
        storage_mock = mock.MagicMock(spec=Storage)
        storage_mock.url = mock.MagicMock()
        storage_mock.url.return_value = '/media/file_store/test.fastq'
        with mock.patch('django.core.files.storage.default_storage._wrapped',
                        storage_mock):
            self.assertEqual(item.get_datafile_url(), storage_mock.url())

    def test_get_remote_file_url(self):
        item = FileStoreItem(source=self.url_source)
        self.assertEqual(item.get_datafile_url(), item.source)

    def test_get_local_file_type(self):
        item = FileStoreItem(source=self.path_source, filetype=self.file_type)
        self.assertEqual(item.get_filetype(), self.file_type)

    def test_get_remote_file_type(self):
        item = FileStoreItem(source=self.url_source, filetype=self.file_type)
        self.assertEqual(item.get_filetype(), self.file_type)

    def test_set_remote_file_type(self):
        item = FileStoreItem.objects.create(source=self.url_source)
        self.assertTrue(item.filetype, self.file_type)

    def test_set_local_file_type(self):
        file_mock = mock.MagicMock(spec=File)
        file_mock.name = self.file_name
        item = FileStoreItem()
        item.datafile = file_mock
        # https://joeray.me/mocking-files-and-file-storage-for-testing-django-models.html
        with mock.patch('django.core.files.storage.default_storage._wrapped',
                        mock.MagicMock(spec=Storage)):
            item.save()
        self.assertTrue(item.filetype, self.file_type)

    def test_get_local_file_extension(self):
        file_mock = mock.MagicMock(spec=File)
        file_mock.name = self.file_name
        item = FileStoreItem()
        item.datafile = file_mock
        self.assertEqual(item.get_file_extension(), 'tdf')

    def test_get_remote_file_extension(self):
        item = FileStoreItem(source='http://example.org/test.fastq')
        self.assertEqual(item.get_file_extension(), 'fastq')


class FileStoreItemManagerTest(TestCase):
    """FileStoreItemManager methods test"""

    def setUp(self):
        self.filename = 'test_file.tdf'
        self.path_prefix = '/example/local/path/'
        self.path_source = os.path.join(self.path_prefix, self.filename)
        self.url_prefix = 'http://example.org/web/path/'
        self.url_source = urljoin(self.url_prefix, self.filename)

    def test_file_source_map_translation(self):
        """Test translation from URL to file system path when creating a new
        instance
        """
        settings.REFINERY_FILE_SOURCE_MAP = {self.url_prefix: self.path_prefix}
        item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(self.filename, 'Coffee is delicious!'),
            source=self.path_source
        )
        self.assertEqual(item.source, self.path_source)

    def test_empty_file_source_map_translation(self):
        """Test that empty map doesn't affect creating new FileStoreItem
        instances
        """
        settings.REFINERY_FILE_SOURCE_MAP = {}
        item = FileStoreItem.objects.create(source=self.url_source)
        self.assertEqual(item.source, self.url_source)
        item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(self.filename, 'Coffee is delicious!'),
            source=self.path_source
        )
        self.assertEqual(item.source, self.path_source)


@override_settings(REFINERY_DATA_IMPORT_DIR='/import/path',
                   REFINERY_FILE_SOURCE_MAP={})
class FileSourceTranslationTest(TestCase):
    def setUp(self):
        self.username = 'guest'
        self.base_path = '/test/'
        self.filename = 'test_file.fastq'
        self.abs_path_source = os.path.join('/absolute/path', self.filename)
        self.rel_path_source = os.path.join('relative/path', self.filename)
        self.url_prefix = 'http://example.org/web/path/'
        self.url_source = urljoin(self.url_prefix, self.filename)

    def test_translate_from_url_with_source_map(self):
        with override_settings(
                REFINERY_FILE_SOURCE_MAP={self.url_prefix: '/new/path/'}
        ):
            translate_file_source = generate_file_source_translator()
        self.assertEqual(translate_file_source(self.url_source),
                         self.url_source)

    def test_translate_from_url(self):
        translate_file_source = generate_file_source_translator()
        self.assertEqual(translate_file_source(self.url_source),
                         self.url_source)

    def test_translate_from_absolute_path(self):
        translate_file_source = generate_file_source_translator()
        self.assertEqual(translate_file_source(self.abs_path_source),
                         self.abs_path_source)

    def test_translate_from_relative_path_with_base_bath(self):
        translate_file_source = generate_file_source_translator(
            base_path=self.base_path
        )
        self.assertEqual(translate_file_source(self.rel_path_source),
                         os.path.join(self.base_path, self.rel_path_source))

    def test_translate_from_relative_path_with_username(self):
        translate_file_source = generate_file_source_translator(
            username=self.username
        )
        self.assertEqual(translate_file_source(self.rel_path_source),
                         os.path.join(settings.REFINERY_DATA_IMPORT_DIR,
                                      self.username, self.rel_path_source))

    @override_settings(UPLOAD_BUCKET='refinery-upload')
    def test_translate_from_relative_path_with_cognito_identity_id(self):
        identity_id = 'us-east-1:7cdaf40f-4c4f-4130-9d45-ae8ca56d67e4'
        translate_file_source = generate_file_source_translator(
            identity_id=identity_id
        )
        self.assertEqual(
            translate_file_source(self.rel_path_source),
            "s3://{}/{}/{}".format(
                settings.UPLOAD_BUCKET, identity_id, self.rel_path_source
            )
        )

    def test_translate_from_relative_path_with_no_args(self):
        translate_file_source = generate_file_source_translator()
        with self.assertRaises(ValueError):
            translate_file_source(self.rel_path_source)


class FileStoreItemsAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        # create FileStoreItem instances without any disk operations
        self.url_source = 'http://example.org/test_file.dat'
        self.item_from_url = FileStoreItem.objects.create(
            source=self.url_source
        )
        self.view = FileStoreItems.as_view()
        self.valid_uuid = self.item_from_url.uuid
        self.url_root = '/api/v2/file_store_items/'
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

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
