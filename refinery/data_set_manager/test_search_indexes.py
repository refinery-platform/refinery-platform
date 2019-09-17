import logging
import re
import uuid

from django.contrib.auth.models import User

from celery.states import FAILURE, PENDING
from djcelery.models import TaskMeta

from core.utils import build_absolute_url
from factory_boy.utils import make_analyses_with_single_dataset
from haystack.exceptions import SkipDocument
import mock
from rest_framework.test import APITestCase

import constants
from core.models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                         AnalysisNodeConnection, DataSet, InvestigationLink)
from file_store.models import FileStoreItem

from .models import Assay, Investigation, Node, Study
from .search_indexes import NodeIndex

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"

logger = logging.getLogger(__name__)


class NodeIndexTests(APITestCase):

    def setUp(self):
        data_set = DataSet.objects.create()
        investigation = Investigation.objects.create()
        InvestigationLink.objects.create(investigation=investigation,
                                         data_set=data_set)
        study = Study.objects.create(investigation=investigation)
        self.assay = Assay.objects.create(study=study, technology='whizbang')

        self.file_store_item = FileStoreItem.objects.create(
            import_task_id=str(uuid.uuid4())
        )
        self.import_task = TaskMeta.objects.create(
            task_id=self.file_store_item.import_task_id
        )
        self.node = Node.objects.create(assay=self.assay, study=study,
                                        file_item=self.file_store_item,
                                        name='http://example.com/fake.txt',
                                        type='Raw Data File')
        self.data_set_uuid = data_set.uuid
        self.study_uuid = study.uuid
        self.file_uuid = self.file_store_item.uuid
        self.node_uuid = self.node.uuid
        self.maxDiff = None

    def test_skip_types(self):
        self.node.type = 'Unknown File Type'
        with self.assertRaises(SkipDocument):
            NodeIndex().prepare(self.node)

    def _prepare_node_index(self, node):
        data = NodeIndex().prepare(node)
        data = dict(
            (
                re.sub(r'\d+', '#', key),
                re.sub(r'\d+', '#', value) if
                type(value) in (str, str) and
                key != 'REFINERY_DOWNLOAD_URL_s' and
                'uuid' not in key
                else value
            )
            for (key, value) in list(data.items())
        )
        return data

    def _assert_node_index_prepared_correctly(self, data_to_be_indexed,
                                              expected_download_url=None,
                                              expected_filetype=None,
                                              expected_datafile=''):
        self.assertEqual(
            data_to_be_indexed,
            {
                'REFINERY_ANALYSIS_UUID_#_#_s': 'N/A',
                'REFINERY_DATAFILE_s': expected_datafile,
                'REFINERY_DOWNLOAD_URL_s': expected_download_url,
                'REFINERY_FILETYPE_#_#_s': expected_filetype,
                'REFINERY_NAME_#_#_s': 'http://example.com/fake.txt',
                'REFINERY_SUBANALYSIS_#_#_s': -1,
                'REFINERY_TYPE_#_#_s': 'Raw Data File',
                'REFINERY_WORKFLOW_OUTPUT_#_#_s': 'N/A',
                'analysis_uuid': None,
                'assay_uuid': str(self.assay.uuid),
                'data_set_uuid': self.data_set_uuid,
                'django_ct': 'data_set_manager.node',
                'django_id': '#',
                'file_uuid': self.file_uuid,
                'filetype_Characteristics_generic_s': expected_filetype,
                'genome_build': None,
                'id': 'data_set_manager.node.#',
                'is_annotation': False,
                'measurement_Characteristics_generic_s': '',
                'measurement_accession_Characteristics_generic_s': '',
                'measurement_source_Characteristics_generic_s': '',
                'name': 'http://example.com/fake.txt',
                'platform_Characteristics_generic_s': '',
                'species': None,
                'study_uuid': self.study_uuid,
                'subanalysis': None,
                'technology_Characteristics_generic_s': 'whizbang',
                'technology_accession_Characteristics_generic_s': '',
                'technology_source_Characteristics_generic_s': '',
                'text': '',
                'type': 'Raw Data File',
                'uuid': self.node_uuid,
                'workflow_output': None
            }
        )

    def test_prepare_node_with_valid_datafile(self):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=build_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_remote_datafile_source(self):
        self.file_store_item.source = 'http://www.example.org/test.txt'
        self.file_store_item.save()
        self._assert_node_index_prepared_correctly(
            self._prepare_node_index(self.node),
            expected_download_url=self.file_store_item.source,
            expected_filetype=self.file_store_item.filetype,
            expected_datafile=self.file_store_item.datafile
        )

    def test_prepare_node_pending_yet_existing_file_import_task(self):
        with mock.patch.object(FileStoreItem, 'get_import_status',
                               return_value=PENDING):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=constants.NOT_AVAILABLE
            )

    def test_prepare_node_pending_non_existent_file_import_task(self):
        self.import_task.delete()
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value=None):
            with mock.patch.object(FileStoreItem, 'get_import_status',
                                   return_value=FAILURE):
                self._assert_node_index_prepared_correctly(
                    self._prepare_node_index(self.node),
                    expected_download_url=constants.NOT_AVAILABLE
                )

    def test_prepare_node_no_file_import_task_id_yet(self):
        self.file_store_item.import_task_id = ""
        self.file_store_item.save()
        self.import_task.delete()
        self._assert_node_index_prepared_correctly(
            self._prepare_node_index(self.node),
            expected_download_url=PENDING,
            expected_datafile=self.file_store_item.datafile
        )

    def test_prepare_node_no_file_store_item(self):
        with mock.patch('celery.result.AsyncResult'):
            self.file_store_item.delete()
        self._assert_node_index_prepared_correctly(
            self._prepare_node_index(self.node),
            expected_download_url=constants.NOT_AVAILABLE
        )

    def test_prepare_node_s3_file_store_item_source_no_datafile(self):
        self.file_store_item.source = 's3://test/test.txt'
        self.file_store_item.save()
        with mock.patch.object(FileStoreItem, 'get_import_status',
                               return_value=FAILURE):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=constants.NOT_AVAILABLE,
                expected_filetype=self.file_store_item.filetype,
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_s3_file_store_item_source_with_datafile(self):
        self.file_store_item.source = 's3://test/test.txt'
        self.file_store_item.save()
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test.txt'):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=build_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_filetype=self.file_store_item.filetype,
                expected_datafile=self.file_store_item.datafile
            )

    def _create_analysis_node_connection(self, direction, is_refinery_file):
        user = User.objects.create_user("test", "", "test")
        make_analyses_with_single_dataset(1, user)

        AnalysisNodeConnection.objects.create(
            analysis=Analysis.objects.first(),
            node=self.node,
            direction=direction,
            step=1,
            name="{} Analysis Node Connection".format(direction),
            filename="test.txt",
            is_refinery_file=is_refinery_file
        )

    def test_prepare_node_with_non_exposed_input_node_connection_isnt_skipped(
            self
    ):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._create_analysis_node_connection(INPUT_CONNECTION, False)
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=build_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_with_exposed_input_node_connection_isnt_skipped(
            self
    ):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._create_analysis_node_connection(INPUT_CONNECTION, True)
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=build_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_with_non_exposed_output_node_connection_is_skipped(
            self
    ):
        self._create_analysis_node_connection(OUTPUT_CONNECTION, False)
        with self.assertRaises(SkipDocument):
            self._prepare_node_index(self.node)

    def test_prepare_node_with_exposed_output_node_connection_isnt_skipped(
        self
    ):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._create_analysis_node_connection(OUTPUT_CONNECTION, True)
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=build_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )
