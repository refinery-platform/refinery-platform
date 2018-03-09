import os
from urlparse import urljoin
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models.fields.files import FieldFile
from django.test import TestCase, override_settings

import mock
from override_storage import override_storage

from .models import (FileExtension, FileStoreItem, FileType, file_path,
                     generate_file_source_translator,
                     _get_extension_from_string, get_file_object, get_temp_dir,
                     _map_source, parse_s3_url)


class FileStoreModuleTest(TestCase):

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
        file_object = get_file_object('/example/path/test_file.dat')
        mock_file_open.assert_called_once_with('/example/path/test_file.dat',
                                               'rb')
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
        self.assertEqual(_map_source('http://example.org/test_file.dat'),
                         'http://example.org/test_file.dat')

    @override_settings(
        REFINERY_FILE_SOURCE_MAP={'http://example.org/': '/example/path/'}
    )
    def test_file_source_map(self):
        self.assertEqual(_map_source('http://example.org/test_file.dat'),
                         '/example/path/test_file.dat')


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

    def test_get_remote_file_url_with_url_source(self):
        item = FileStoreItem(source=self.url_source)
        self.assertEqual(item.get_datafile_url(), self.url_source)

    def test_get_remote_file_url_with_path_source(self):
        item = FileStoreItem(source=self.path_source)
        self.assertEqual(item.get_datafile_url(), None)

    def test_get_remote_file_url_with_s3_source(self):
        item = FileStoreItem(source='s3://upload-bucket-name/key-name')
        self.assertEqual(item.get_datafile_url(), None)

    def test_set_remote_file_type(self):
        item = FileStoreItem.objects.create(source=self.url_source)
        self.assertEqual(item.filetype, self.file_type)

    def test_set_remote_file_type_with_multiple_period_file_name(self):
        item = FileStoreItem.objects.create(
            source='http://example.org/test.name.tdf'
        )
        self.assertEqual(item.filetype, self.file_type)

    def test_get_remote_file_extension(self):
        item = FileStoreItem(source=self.url_source)
        self.assertEqual(item.get_file_extension(), self.file_extension)

    def test_get_remote_file_multi_extension(self):
        # TODO: replace with create() when migrations are no longer required
        file_type = FileType.objects.get_or_create(name='FASTQ.GZ')[0]
        file_extension = FileExtension.objects.get_or_create(
            name='fastq.gz', filetype=file_type
        )[0]
        item = FileStoreItem(source='http://example.org/test.fastq.gz')
        self.assertEqual(item.get_file_extension(), file_extension)

    def test_get_remote_file_extension_with_multiple_period_file_name(self):
        item = FileStoreItem(source='http://example.org/test.name.tdf')
        self.assertEqual(item.get_file_extension(), self.file_extension)

    def test_get_invalid_remote_file_extension(self):
        item = FileStoreItem(source='http://example.org/test.name.invalid')
        self.assertRaises(RuntimeError, item.get_file_extension)

    def test_file_source_map_translation(self):
        with override_settings(
                REFINERY_FILE_SOURCE_MAP={
                    'http://example.org/web/path/': '/new/path/'
                }
        ):
            item = FileStoreItem.objects.create(
                source='http://example.org/web/path/' + self.file_name
            )
            self.assertEqual(item.source, '/new/path/' + self.file_name)

    @override_settings(REFINERY_FILE_SOURCE_MAP={})
    def test_empty_file_source_map_translation_with_url_source(self):
        item = FileStoreItem.objects.create(source=self.url_source)
        self.assertEqual(item.source, self.url_source)

    @override_settings(REFINERY_FILE_SOURCE_MAP={})
    def test_empty_file_source_map_translation_with_path_source(self):
        item = FileStoreItem.objects.create(source=self.path_source)
        self.assertEqual(item.source, self.path_source)


class FileStoreItemLocalFileTest(TestCase):
    def setUp(self):
        self.file_type = FileType.objects.get_or_create(name='TDF')[0]
        self.file_extension = FileExtension.objects.get_or_create(
            name='tdf', filetype=self.file_type
        )[0]
        self.file_name = 'test_file.tdf'
        self.item = FileStoreItem()
        # test storage backend does not support absolute paths
        self.item.is_local = mock.MagicMock(return_value=True)

    @override_storage()
    @override_settings(MEDIA_URL='')
    def test_get_local_file_url(self):
        self.item.datafile.save(self.file_name, ContentFile(''))
        self.assertEqual(self.item.get_datafile_url(),
                         file_path(self.item, self.file_name))

    @override_storage()
    def test_set_local_file_type(self):
        self.item.datafile.save(self.file_name, ContentFile(''))
        self.assertEqual(self.item.filetype, self.file_type)

    @override_storage()
    def test_get_local_file_extension(self):
        self.item.datafile.save(self.file_name, ContentFile(''))
        self.assertEqual(self.item.get_file_extension(), self.file_extension)

    @override_storage()
    def test_delete_local_file_on_instance_delete(self):
        self.item.datafile.save(self.file_name, ContentFile(''))
        with mock.patch.object(FieldFile, 'delete') as mock_delete:
            self.item.delete()
            mock_delete.assert_called_with(save=False)

    @override_storage()
    def test_delete_local_file_on_instance_update(self):
        self.item.datafile.save(self.file_name, ContentFile(''))
        self.item.datafile = ''
        with mock.patch.object(FieldFile, 'delete') as mock_delete:
            self.item.save()
            mock_delete.assert_called_with(save=False)


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
        identity_id = 'us-east-1:{}'.format(uuid.uuid4())
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
