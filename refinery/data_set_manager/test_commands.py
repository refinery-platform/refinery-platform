import logging
import os

from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings

from override_storage import override_storage

from core.models import DataSet
from file_store.models import FileStoreItem

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"

logger = logging.getLogger(__name__)


@override_storage()
@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TestManagementCommands(TestCase):
    def setUp(self):
        self.test_data_base_path = os.path.join(TEST_DATA_BASE_PATH,
                                                "single-file")
        self.args = [
            "--username", "guest",
            "--source_column_index", "2",
            "--data_file_column", "2",
        ]

    def test_process_metadata_table_csv(self):
        two_line_csv = os.path.join(self.test_data_base_path,
                                    "two-line-local.csv")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test csv",
                "--file_name", two_line_csv,
            ]
        )
        call_command(
            "process_metadata_table",
            *self.args,
            base_path=self.test_data_base_path,
            is_public=True,
            delimiter="comma"
        )
        self.assertEqual(DataSet.objects.count(), 1)

        # One metadata file & two data files referenced in the metadata
        self.assertEqual(FileStoreItem.objects.count(), 3)

    def test_process_metadata_table_tsv(self):
        two_line_tsv = os.path.join(self.test_data_base_path,
                                    "two-line-local.tsv")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test csv",
                "--file_name", two_line_tsv,
            ]
        )
        call_command(
            "process_metadata_table",
            *self.args,
            base_path=self.test_data_base_path,
            is_public=True
        )
        self.assertEqual(DataSet.objects.count(), 1)

    def test_process_metadata_table_custom_delimiter(self):
        two_line_custom = os.path.join(self.test_data_base_path,
                                       "two-line-local.custom")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test custom delimiter",
                "--file_name", two_line_custom,
            ]
        )
        call_command(
            "process_metadata_table",
            *self.args,
            base_path=self.test_data_base_path,
            is_public=True,
            delimiter="custom",
            custom_delimiter_string="@"
        )
        self.assertEqual(DataSet.objects.count(), 1)

    def test_process_metadata_table_custom_delimiter_none_specified(self):
        two_line_custom = os.path.join(self.test_data_base_path,
                                       "two-line-local.custom")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test custom delimiter",
                "--file_name", two_line_custom,
            ]
        )
        with self.assertRaises(CommandError) as context:
            call_command(
                "process_metadata_table",
                *self.args,
                base_path=self.test_data_base_path,
                is_public=True,
                delimiter="custom"
            )
        self.assertIn("custom_delimiter_string was not specified",
                      context.exception.message)
        self.assertEqual(DataSet.objects.count(), 0)
