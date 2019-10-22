import logging
import os

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from celery.states import PENDING, STARTED, SUCCESS

from factory_boy.utils import (create_dataset_with_necessary_models,
                               make_analyses_with_single_dataset)

from core.models import Analysis, DataSet, InvestigationLink
from file_store.models import FileStoreItem

from .models import (Assay, Investigation, Node, Study)
from .tests import IsaTabTestBase

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"

logger = logging.getLogger(__name__)


class AssayClassTests(TestCase):
    def setUp(self):
        self.filestore_item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bam',
                'Coffee is delicious!')
        )
        self.filestore_item_1 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bed',
                'Coffee is delicious!')
        )
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

        Node.objects.create(assay=self.assay, study=self.study,
                            file_item=self.filestore_item)
        Node.objects.create(assay=self.assay, study=self.study,
                            file_item=self.filestore_item_1)

    def test_get_file_count(self):
        self.assertEqual(self.assay.get_file_count(), 2)

    def test_get_file_count_does_not_count_aux_nodes(self):
        Node.objects.create(assay=self.assay, study=self.study,
                            is_auxiliary_node=True,
                            file_item=self.filestore_item_1)
        self.assertEqual(self.assay.get_file_count(), 2)


class NodeClassMethodTests(TestCase):
    def setUp(self):
        self.username = 'coffee_tester'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)

        self.filestore_item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bam',
                b'Coffee is delicious!')
        )
        self.filestore_item_1 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bed',
                b'Coffee is delicious!')
        )
        self.filestore_item_2 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.seg',
                b'Coffee is delicious!')
        )
        self.dataset = DataSet.objects.create()
        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()
        self.investigation_link = InvestigationLink.objects.create(
            investigation=self.investigation,
            data_set=self.dataset)

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

        self.node = Node.objects.create(assay=self.assay, study=self.study)
        self.another_node = Node.objects.create(assay=self.assay,
                                                study=self.study)
        self.file_node = Node.objects.create(assay=self.assay,
                                             study=self.study,
                                             file_item=self.filestore_item_1)

    # Parents and Children:

    def test_get_children(self):
        self.assertEqual(self.node.get_children(), [])
        self.node.add_child(self.another_node)
        child_uuid = self.node.get_children()[0]
        self.assertIsNotNone(child_uuid)
        self.assertEqual(child_uuid, self.another_node.uuid)

        # Check inverse relationship:
        self.assertEqual(self.node.uuid, self.another_node.get_parents()[0])

    def test_get_parents(self):
        self.assertEqual(self.another_node.get_parents(), [])
        self.node.add_child(self.another_node)
        parent_uuid = self.another_node.get_parents()[0]
        self.assertIsNotNone(parent_uuid)
        self.assertEqual(parent_uuid, self.node.uuid)

        # Check inverse relationship:
        self.assertEqual(self.another_node.uuid, self.node.get_children()[0])

    def test_is_orphan(self):
        self.assertTrue(self.another_node.is_orphan())
        self.node.add_child(self.another_node)
        self.assertFalse(self.another_node.is_orphan())

    # Auxiliary nodes:

    def test_create_and_associate_auxiliary_node(self):
        self.assertEqual(self.node.get_children(), [])
        self.node._create_and_associate_auxiliary_node(self.filestore_item)
        self.assertIsNotNone(self.node.get_children())
        self.assertIsNotNone(Node.objects.get(file_item=self.filestore_item))
        self.assertEqual(self.node.get_children()[0],
                         Node.objects.get(file_item=self.filestore_item).uuid)
        self.assertEqual(
            Node.objects.get(file_item=self.filestore_item).get_parents()[0],
            self.node.uuid
        )
        self.assertTrue(Node.objects.get(
            uuid=self.node.get_children()[0]
        ).is_auxiliary_node)

    def test_get_auxiliary_nodes(self):
        self.assertEqual(self.node.get_children(), [])
        for i in range(2):
            self.node._create_and_associate_auxiliary_node(self.filestore_item)
            # Still just one child even on second time
            self.assertEqual(len(self.node.get_children()), 1)

    def test_get_auxiliary_file_generation_task_state(self):
        # Normal nodes will always return None
        self.assertIsNone(self.node.get_auxiliary_file_generation_task_state())
        # Auxiliary nodes will have a task state
        self.node._create_and_associate_auxiliary_node(self.filestore_item)
        auxiliary = Node.objects.get(uuid=self.node.get_children()[0])
        state = auxiliary.get_auxiliary_file_generation_task_state()
        # Values from:
        # http://docs.celeryproject.org/en/latest/_modules/celery/result.html#AsyncResult
        self.assertIn(state, [PENDING, STARTED, SUCCESS])

    def test_get_analysis(self):
        make_analyses_with_single_dataset(1, self.user)
        analysis = Analysis.objects.all()[0]

        node_with_analysis = Node.objects.create(
            assay=self.assay,
            study=self.study,
            analysis_uuid=analysis.uuid
        )
        self.assertEqual(node_with_analysis.get_analysis(), analysis)

    def test_get_analysis_no_analysis(self):
        self.assertIsNone(self.node.get_analysis())


class InvestigationTests(IsaTabTestBase):
    def setUp(self):
        super(InvestigationTests, self).setUp()
        self.isa_tab_dataset = create_dataset_with_necessary_models(
            is_isatab_based=True
        )
        self.isa_tab_investigation = self.isa_tab_dataset.get_investigation()

        self.tabular_dataset = create_dataset_with_necessary_models()
        self.tabular_investigation = self.tabular_dataset.get_investigation()

    def test_get_isa_archive_file_store_item(self):
        self.assertIsNotNone(self.isa_tab_investigation.get_file_store_item())

    def test_get_pre_isa_archive_file_store_item(self):
        self.assertIsNotNone(self.tabular_investigation.get_file_store_item())

    def test_get_identifier(self):
        self.assertEqual(self.isa_tab_investigation.get_identifier(),
                         self.isa_tab_investigation.identifier)

    def test_get_identifier_no_identifier(self):
        # Investigations without identifiers should resort to using the
        # info from their Study
        self.isa_tab_investigation.identifier = None
        self.isa_tab_investigation.save()
        self.assertEqual(self.isa_tab_investigation.get_identifier(),
                         self.isa_tab_dataset.get_latest_study().identifier)

    def test_get_description(self):
        self.assertEqual(self.isa_tab_investigation.get_description(),
                         self.isa_tab_investigation.description)

    def test_get_description_no_description(self):
        # Investigations without descriptions should resort to using the
        # info from their Study
        self.isa_tab_investigation.description = None
        self.isa_tab_investigation.save()
        self.assertEqual(self.isa_tab_investigation.get_description(),
                         self.isa_tab_dataset.get_latest_study().description)

    def test_get_study_count(self):
        self.assertEqual(self.isa_tab_investigation.get_study_count(), 1)

    def test_get_assay_count(self):
        self.assertEqual(self.isa_tab_investigation.get_assay_count(), 1)

    def test_get_datafile_names(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip"), 'rb') \
                as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(
            investigation.get_datafile_names(),
            ['rfc-test.zip', 'rfc111.txt', 'rfc125.txt', 'rfc126.txt',
             'rfc134.txt', 'rfc174.txt', 'rfc177.txt', 'rfc178.txt',
             'rfc86.txt', 'rfc94.txt']
        )

    def test_get_datafile_names_local_only(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip"), 'rb') \
                as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(investigation.get_datafile_names(local_only=True),
                         ['rfc-test.zip'])

    def test_get_datafile_names_exclude_metadata_file(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip"), 'rb') \
                as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(investigation.get_datafile_names(
            exclude_metadata_file=True),
            ['rfc111.txt', 'rfc125.txt', 'rfc126.txt', 'rfc134.txt',
             'rfc174.txt', 'rfc177.txt', 'rfc178.txt', 'rfc86.txt',
             'rfc94.txt'])

    def test_get_file_store_items(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip"), 'rb') \
                as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(len(investigation.get_file_store_items()), 10)

    def test_get_file_store_items_exclude_metadata_file(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip"), 'rb') \
                as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(len(investigation.get_file_store_items(
            exclude_metadata_file=True)), 9)

    def test_get_file_store_items_local_only(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip"), 'rb') \
                as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(len(investigation.get_file_store_items(
            local_only=True)), 1)
