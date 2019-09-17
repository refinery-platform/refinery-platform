import logging
import os
import shutil

from django.contrib.auth.models import User
from django.test import TestCase, override_settings

import mock

from core.models import DataSet
from file_store.models import FileStoreItem

from .models import Assay, Investigation, Study

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"

logger = logging.getLogger(__name__)


class IsaTabTestBase(TestCase):
    def setUp(self):
        logging.getLogger(
            "data_set_manager.isa_tab_parser"
        ).setLevel(logging.ERROR)

        # no need to update Solr index in tests
        self.update_node_index_mock = mock.patch(
            "data_set_manager.search_indexes.NodeIndex.update_object"
        ).start()

        test_user = "test_user"
        self.user = User.objects.create_user(test_user)
        self.user.set_password(test_user)
        self.user.save()
        self.isa_tab_import_url = "/data_set_manager/import/isa-tab-form/"
        self.client.login(username=self.user.username, password=test_user)

    def tearDown(self):
        mock.patch.stopall()
        FileStoreItem.objects.all().delete()

    def post_isa_tab(self, isa_tab_url=None, isa_tab_file=None,
                     data_set_uuid=None):
        post_data = {
            "isa_tab_url": isa_tab_url,
            "isa_tab_file": isa_tab_file
        }
        url = self.isa_tab_import_url
        if data_set_uuid is not None:
            url += "?data_set_uuid={}".format(data_set_uuid)

        response = self.client.post(
            url,
            data=post_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        return response


@override_settings(
    REFINERY_DATA_IMPORT_DIR=os.path.abspath(TEST_DATA_BASE_PATH)
)
class MetadataImportTestBase(IsaTabTestBase):
    def setUp(self):
        super(MetadataImportTestBase, self).setUp()
        self.test_user_directory = os.path.join(
            TEST_DATA_BASE_PATH, self.user.username
        )
        os.mkdir(self.test_user_directory)

    def tearDown(self):
        with mock.patch.object(FileStoreItem, "terminate_file_import_task"):
            super(MetadataImportTestBase, self).tearDown()
        shutil.rmtree(self.test_user_directory)

    def successful_import_assertions(self):
        self.assertEqual(DataSet.objects.count(), 1)
        self.assertEqual(Study.objects.count(), 1)
        self.assertEqual(Investigation.objects.count(), 1)
        self.assertEqual(Assay.objects.count(), 1)

    def unsuccessful_import_assertions(self):
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(Study.objects.count(), 0)
        self.assertEqual(Investigation.objects.count(), 0)
        self.assertEqual(Assay.objects.count(), 0)

    def get_test_file_path(self, file_name):
        return os.path.join(TEST_DATA_BASE_PATH, file_name)

    def post_tabular_meta_data_file(self,
                                    meta_data_file_path=None,
                                    data_set_uuid=None,
                                    title="Test Tabular File",
                                    data_file_column=2,
                                    species_column=1,
                                    source_column_index=0,
                                    delimiter="comma"):
        with open(meta_data_file_path) as f:
            post_data = {
                "file": f,
                "file_name": os.path.basename(meta_data_file_path),
                "title": title,
                "data_file_column": data_file_column,
                "species_column": species_column,
                "source_column_index": source_column_index,
                "delimiter": delimiter
            }
            url = "/data_set_manager/import/metadata-table-form/"
            if data_set_uuid is not None:
                url += "?data_set_uuid={}".format(data_set_uuid)

            response = self.client.post(
                url,
                data=post_data,
                HTTP_X_REQUESTED_WITH='XMLHttpRequest'
            )
        return response
