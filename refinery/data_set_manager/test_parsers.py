import contextlib
import logging
import os
import shutil
import tempfile

from django.test import TestCase

import mock

from core.models import DataSet
from file_store.models import FileStoreItem, generate_file_source_translator
from file_store.tasks import FileImportTask

from .isa_tab_parser import IsaTabParser, ParserException
from .models import AnnotatedNode, Investigation, Node
from .single_file_column_parser import process_metadata_table
from .tasks import parse_isatab

from .tests import IsaTabTestBase

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"

logger = logging.getLogger(__name__)


@contextlib.contextmanager
def temporary_directory(*args, **kwargs):
    d = tempfile.mkdtemp(*args, **kwargs)
    try:
        yield d
    finally:
        shutil.rmtree(d)


class IsaTabParserTests(IsaTabTestBase):
    def failed_isatab_assertions(self):
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(AnnotatedNode.objects.count(), 0)
        self.assertEqual(Node.objects.count(), 0)
        self.assertEqual(FileStoreItem.objects.count(), 0)
        self.assertEqual(Investigation.objects.count(), 0)

    def parse(self, dir_name):
        file_source_translator = generate_file_source_translator(
            username=self.user.username
        )
        dir = os.path.join(TEST_DATA_BASE_PATH, dir_name)
        return IsaTabParser(
            file_source_translator=file_source_translator
        ).run(dir)

    def test_empty(self):
        with temporary_directory() as tmp:
            with self.assertRaises(ParserException):
                self.parse(tmp)

    def test_minimal(self):
        investigation = self.parse('minimal')

        studies = investigation.study_set.all()
        self.assertEqual(len(studies), 1)

        assays = studies[0].assay_set.all()
        self.assertEqual(len(assays), 1)

    def test_mising_investigation(self):
        with self.assertRaises(ParserException):
            self.parse('missing-investigation')

    def test_mising_study(self):
        with self.assertRaises(IOError):
            self.parse('missing-study')

    def test_mising_assay(self):
        with self.assertRaises(IOError):
            self.parse('missing-assay')

    def test_multiple_investigation(self):
        # TODO: I think this should fail?
        self.parse('multiple-investigation')

    def test_multiple_study(self):
        investigation = self.parse('multiple-study')

        studies = investigation.study_set.all()
        self.assertEqual(len(studies), 2)

        assays0 = studies[0].assay_set.all()
        self.assertEqual(len(assays0), 1)

        assays1 = studies[1].assay_set.all()
        self.assertEqual(len(assays1), 1)

    def test_multiple_study_missing_assay(self):
        with self.assertRaises(IOError):
            self.parse('multiple-study-missing-assay')

    def test_multiple_assay(self):
        investigation = self.parse('multiple-assay')

        studies = investigation.study_set.all()
        self.assertEqual(len(studies), 1)

        assays = studies[0].assay_set.all()
        self.assertEqual(len(assays), 2)

    def test_bad_isatab_rollback_from_parser_exception_a(self):
        with self.assertRaises(IOError):
            parse_isatab(self.user.username, False,
                         os.path.join(TEST_DATA_BASE_PATH,
                                      "HideLabBrokenA.zip"))
        self.failed_isatab_assertions()

    def test_bad_isatab_rollback_from_parser_exception_b(self):
        with self.assertRaises(IOError):
            parse_isatab(self.user.username, False,
                         os.path.join(TEST_DATA_BASE_PATH,
                                      "HideLabBrokenB.zip"))
        self.failed_isatab_assertions()


class SingleFileColumnParserTests(TestCase):
    def setUp(self):
        self.file_import_mock = mock.patch.object(FileImportTask,
                                                  'delay').start()

    def tearDown(self):
        mock.patch.stopall()

    def process_csv(self, filename):
        path = os.path.join(
            TEST_DATA_BASE_PATH,
            'single-file',
            filename
        )
        with open(path) as f:
            dataset_uuid = process_metadata_table(
                username='guest',
                title='fake',
                metadata_file=f,
                source_columns=[0],
                data_file_column=2,
            )
        return DataSet.objects.get(uuid=dataset_uuid)

    def assert_expected_nodes(self, dataset, node_count):
        assays = dataset.get_assays()
        self.assertEqual(len(assays), 1)
        data_nodes = Node.objects.filter(assay=assays[0], type='Raw Data File')
        self.assertEqual(len(data_nodes), node_count)

    def test_one_line_csv(self):
        dataset = self.process_csv('one-line.csv')
        self.assert_expected_nodes(dataset, 1)

    def test_two_line_csv(self):
        dataset = self.process_csv('two-line.csv')
        self.assert_expected_nodes(dataset, 2)

    def test_reindex_triggered_for_nodes_missing_datafiles(self):
        with mock.patch(
            "data_set_manager.search_indexes.NodeIndex.update_object"
        ) as update_object_mock:
            dataset = self.process_csv('two-line-local.csv')

        self.assert_expected_nodes(dataset, 2)
        self.assertEqual(2, update_object_mock.call_count)

    def test_reindex_triggered_for_s3_nodes_missing_datafiles(self):
        with mock.patch(
                "data_set_manager.search_indexes.NodeIndex.update_object"
        ) as update_object_mock:
            dataset = self.process_csv('two-line-s3.csv')

        self.assert_expected_nodes(dataset, 2)
        self.assertEqual(2, update_object_mock.call_count)

    def test_without_dataset_raises_exception(self):
        path = os.path.join(
            TEST_DATA_BASE_PATH,
            'single-file',
            'one-line.csv'
        )
        with self.assertRaises(DataSet.DoesNotExist):
            with open(path) as f:
                process_metadata_table(
                    username='guest',
                    title='fake',
                    metadata_file=f,
                    source_columns=[0],
                    data_file_column=2,
                    existing_data_set_uuid='foo'
                )
