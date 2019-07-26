from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from cuser.middleware import CuserMiddleware
from guardian.shortcuts import get_perms
import mock
from override_storage import override_storage

from analysis_manager.models import AnalysisStatus
from data_set_manager.models import (AnnotatedNode, Assay, Investigation,
                                     Node, NodeCollection, Study)
from factory_boy.django_model_factories import (AnalysisNodeConnectionFactory,
                                                FileRelationshipFactory,
                                                FileStoreItemFactory,
                                                GalaxyInstanceFactory,
                                                NodeFactory,
                                                ToolDefinitionFactory,
                                                ToolFactory)
from factory_boy.utils import (create_dataset_with_necessary_models,
                               create_tool_with_necessary_models,
                               make_analyses_with_single_dataset)
from file_store.models import FileStoreItem, FileType
from file_store.tasks import FileImportTask
from tool_manager.models import ToolDefinition

from .management.commands.create_user import init_user
from .models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                     AnalysisNodeConnection, AnalysisResult, BaseResource,
                     DataSet, Event, ExtendedGroup, InvestigationLink,
                     Project, SiteProfile, SiteStatistics, SiteVideo,
                     Tutorials, UserProfile, Workflow, WorkflowEngine)
from .tasks import collect_site_statistics


class AnalysisDeletionTest(TestCase):
    """Testing for the deletion of Analyses"""
    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.analyses, self.dataset = make_analyses_with_single_dataset(
                1, self.user
        )
        self.analysis = self.analyses[0]

    def test_transaction_rollback_on_analysis_delete_failure(self):
        with mock.patch.object(BaseResource, "delete", side_effect=Exception):
            self.analysis.delete()

        self.assertGreater(Analysis.objects.count(), 0)
        self.assertGreater(AnalysisNodeConnection.objects.count(), 0)
        self.assertGreater(AnalysisResult.objects.count(), 0)
        self.assertGreater(AnalysisStatus.objects.count(), 0)
        self.assertGreater(Node.objects.count(), 0)

    def test_analysis_deletion_removes_related_objects(self):
        self.analysis.delete()

        self.assertEqual(Analysis.objects.count(), 0)
        self.assertEqual(AnalysisNodeConnection.objects.count(), 0)
        self.assertEqual(AnalysisResult.objects.count(), 0)
        self.assertEqual(AnalysisStatus.objects.count(), 0)

        # analysis deletion should only remove derived Nodes
        total_dataset_nodes = \
            sum([d.get_nodes().count() for d in DataSet.objects.all()])
        total_nodes = Node.objects.count()

        self.assertGreater(total_dataset_nodes, 0)
        self.assertEqual(total_dataset_nodes, total_nodes)

    def test_analysis_bulk_deletion_removes_related_objects(self):
        # make a second Analysis
        make_analyses_with_single_dataset(1, self.user)
        with mock.patch('celery.result.AsyncResult'):
            Analysis.objects.all().delete()

        self.assertEqual(Analysis.objects.count(), 0)
        self.assertEqual(AnalysisNodeConnection.objects.count(), 0)
        self.assertEqual(AnalysisResult.objects.count(), 0)
        self.assertEqual(AnalysisStatus.objects.count(), 0)

        # analysis deletion should only remove derived Nodes
        total_dataset_nodes = \
            sum([d.get_nodes().count() for d in DataSet.objects.all()])
        total_nodes = Node.objects.count()

        self.assertGreater(total_dataset_nodes, 0)
        self.assertEqual(total_dataset_nodes, total_nodes)


class AnalysisTests(TestCase):

    def setUp(self):

        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.project = Project.objects.create()
        self.project1 = Project.objects.create()
        self.galaxy_instance = GalaxyInstanceFactory()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            name='Workflow1', workflow_engine=self.workflow_engine
        )
        self.workflow1 = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine
        )
        self.file_store_item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile('test_file.txt',
                                        'Coffee is delicious!'),
            filetype=FileType.objects.get(name="TXT")
        )
        self.file_store_item1 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile('test_file.txt',
                                        'Coffee is delicious!')
        )
        self.dataset_with_analysis = DataSet.objects.create()
        self.dataset_with_analysis1 = DataSet.objects.create()
        self.dataset_without_analysis = DataSet.objects.create()
        self.analysis = Analysis.objects.create(
            name='analysis_without_node_analyzed_further',
            summary='This is a summary', project=self.project,
            data_set=self.dataset_with_analysis, workflow=self.workflow,
            status="SUCCESS"
        )
        self.analysis_status = AnalysisStatus.objects.create(
            analysis=self.analysis
        )
        self.analysis_with_node_analyzed_further = Analysis.objects.create(
            name='analysis_with_node_analyzed_further',
            summary='This is a summary', project=self.project1,
            data_set=self.dataset_with_analysis1, workflow=self.workflow1,
            status="SUCCESS"
        )
        self.analysis.set_owner(self.user)
        self.analysis_with_node_analyzed_further.set_owner(self.user)
        self.investigation = Investigation.objects.create()
        self.investigation_link = InvestigationLink.objects.create(
            investigation=self.investigation,
            data_set=self.dataset_with_analysis
        )
        self.investigation1 = Investigation.objects.create()
        self.investigation_link1 = InvestigationLink.objects.create(
            investigation=self.investigation1,
            data_set=self.dataset_with_analysis1
        )
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)
        self.study1 = Study.objects.create(investigation=self.investigation1)
        self.assay1 = Assay.objects.create(study=self.study1)
        self.node = Node.objects.create(assay=self.assay, study=self.study,
                                        name='test_node',
                                        analysis_uuid=self.analysis.uuid,
                                        file_uuid=self.file_store_item.uuid)
        self.node2 = Node.objects.create(
            assay=self.assay1, study=self.study,
            analysis_uuid=self.analysis_with_node_analyzed_further.uuid,
            file_uuid=self.file_store_item1.uuid
        )
        self.node_filename = "{}.{}".format(self.node.name,
                                            self.node.file.get_extension())
        self.analysis_node_connection_a = \
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis, node=self.node, step=1,
                filename=self.node_filename, direction=OUTPUT_CONNECTION,
                is_refinery_file=True, galaxy_dataset_name='Galaxy File Name'
            )
        self.analysis_node_connection_b = \
            AnalysisNodeConnection.objects.create(analysis=self.analysis,
                                                  node=self.node, step=2,
                                                  filename=self.node_filename,
                                                  direction=OUTPUT_CONNECTION,
                                                  is_refinery_file=False)
        self.analysis_node_connection_c = \
            AnalysisNodeConnection.objects.create(analysis=self.analysis,
                                                  node=self.node, step=3,
                                                  filename=self.node_filename,
                                                  direction=OUTPUT_CONNECTION,
                                                  is_refinery_file=True)
        self.analysis_node_connection_with_node_analyzed_further = \
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis_with_node_analyzed_further,
                node=self.node2, step=0, direction=INPUT_CONNECTION
            )

    def test_verify_analysis_deletion_if_nodes_not_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'out'
        query = Analysis.objects.get(
            name='analysis_without_node_analyzed_further'
        )
        self.assertIsNotNone(query)
        self.analysis.delete()
        self.assertRaises(Analysis.DoesNotExist, Analysis.objects.get,
                          name='analysis_without_node_analyzed_further')

    def test_verify_analysis_remains_if_nodes_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'in'
        self.analysis_with_node_analyzed_further.delete()
        self.assertIsNotNone(Analysis.objects.get(
            name='analysis_with_node_analyzed_further')
        )

    def test_has_nodes_used_in_downstream_analyses(self):
        self.assertTrue(self.analysis_with_node_analyzed_further
                        .has_nodes_used_in_downstream_analyses())
        self.assertFalse(self.analysis.has_nodes_used_in_downstream_analyses())

    def test_galaxy_tool_file_import_state_returns_data_when_it_should(self):
        self.analysis_status.galaxy_import_state = AnalysisStatus.PROGRESS
        self.analysis_status.galaxy_import_progress = 96

        self.assertEqual(
            self.analysis_status.galaxy_file_import_state(),
            [
                {
                    'state': self.analysis_status.galaxy_import_state,
                    'percent_done': self.analysis_status.galaxy_import_progress
                }
            ]
        )

    def test_galaxy_tool_file_import_state_is_empty_without_an_import_state(
            self):
        self.analysis_status.galaxy_import_progress = 96
        self.assertEqual(self.analysis_status.galaxy_file_import_state(), [])

    def test_galaxy_tool_file_import_state_is_empty_without_import_progress(
            self):
        self.analysis_status.galaxy_import_state = AnalysisStatus.PROGRESS
        self.assertEqual(self.analysis_status.galaxy_file_import_state(), [])

    def test_facet_name(self):
        self.assertRegexpMatches(
            self.analysis_with_node_analyzed_further.facet_name(),
            'REFINERY_ANALYSIS_UUID_' + r'\d+_\d+' + '_s'
        )

    @mock.patch("core.models.index_annotated_nodes_selection")
    @mock.patch.object(Analysis, "rename_results")
    def test__prepare_annotated_nodes_calls_methods_in_proper_order(
            self, rename_results_mock, index_annotated_nodes_selection_mock
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(rename_results_mock, "rename_results_mock")
        mock_manager.attach_mock(index_annotated_nodes_selection_mock,
                                 "index_annotated_nodes_selection_mock")
        self.analysis._prepare_annotated_nodes(node_uuids=None)
        # Assert that `rename_results` is called before
        # `index_annotated_nodes_selection`
        self.assertEqual(
            mock_manager.mock_calls,
            [
                mock.call.rename_results_mock(),
                mock.call.index_annotated_nodes_selection_mock(None)
            ]
        )

    def create_analysis_results(self, include_faulty_result=False):
        common_params = {
            'analysis': self.analysis,
            'file_store_uuid': self.node.file_uuid,
            'file_name': self.node_filename,
            'file_type': self.node.file.filetype
        }
        analysis_result_0 = AnalysisResult.objects.create(**common_params)

        if include_faulty_result:
            # This analysis result has a filename that doesn't correspond to
            #  any specified AnalysisNodeConnection Output filenames
            AnalysisResult.objects.create(
                **dict(common_params, file_name='Bad Filename')
            )
        else:
            AnalysisResult.objects.create(**common_params)

        analysis_result_1 = AnalysisResult.objects.create(**common_params)

        return analysis_result_0, analysis_result_1

    def test___get_output_connection_to_analysis_result_mapping(self):
        analysis_result_0, analysis_result_1 = self.create_analysis_results()
        output_mapping = (
            self.analysis._get_output_connection_to_analysis_result_mapping()
        )
        self.assertEqual(
            output_mapping,
            [
                (self.analysis_node_connection_c, analysis_result_0),
                (self.analysis_node_connection_b, None),
                (self.analysis_node_connection_a, analysis_result_1)
            ]
        )

    def test___get_output_connection_to_analysis_result_mapping_failure_state(
        self
    ):
        self.create_analysis_results(include_faulty_result=True)
        with self.assertRaises(IndexError):
            self.analysis._get_output_connection_to_analysis_result_mapping()

    def test_analysis_node_connection_input_id(self):
        self.assertEqual(
            self.analysis_node_connection_a.get_input_connection_id(),
            '{}_{}'.format(self.analysis_node_connection_a.step,
                           self.analysis_node_connection_a.filename)
        )

    def test_analysis_node_connection_output_id(self):
        self.assertEqual(
            self.analysis_node_connection_a.get_output_connection_id(),
            '{}_{}'.format(self.analysis_node_connection_a.step,
                           self.analysis_node_connection_a.name)
        )

    def test__create_derived_data_file_node(self):
        derived_data_file_node = self.analysis._create_derived_data_file_node(
            self.study, self.assay, self.analysis_node_connection_a
        )
        self.assertEqual(derived_data_file_node.name, 'Galaxy File Name')
        self.assertEqual(derived_data_file_node.study, self.study)
        self.assertEqual(derived_data_file_node.assay, self.assay)
        self.assertEqual(derived_data_file_node.type, Node.DERIVED_DATA_FILE)
        self.assertEqual(derived_data_file_node.analysis_uuid,
                         self.analysis.uuid)
        self.assertEqual(derived_data_file_node.subanalysis,
                         self.analysis_node_connection_a.subanalysis)
        self.assertEqual(derived_data_file_node.workflow_output,
                         self.analysis_node_connection_a.name)

    def test__get_input_nodes(self):
        analysis = self.analysis_with_node_analyzed_further
        self.assertEqual(analysis._get_input_nodes(), [self.node2])

    def test__get_input_file_store_items(self):
        analysis = self.analysis_with_node_analyzed_further
        self.assertEqual(analysis.get_input_file_store_items(),
                         [self.node2.file])

    def test_has_all_local_input_files_non_local_inputs(self):
        analysis = self.analysis_with_node_analyzed_further
        node = analysis._get_input_nodes()[0]
        node.file.delete_datafile()
        self.assertFalse(analysis.has_all_local_input_files())

    def test_has_all_local_input_files(self):
        self.assertTrue(self.analysis.has_all_local_input_files())

    def test_get_refinery_import_task_signatures(self):
        # Create and associate an AnalysisNodeConnection with a remote file
        file_store_item = FileStoreItemFactory(
            source='http://www.example.com/analysis_input.txt'
        )
        node = NodeFactory(assay=self.assay, study=self.study,
                           name='Input Node', analysis_uuid=self.analysis.uuid,
                           file_uuid=file_store_item.uuid)
        AnalysisNodeConnectionFactory(analysis=self.analysis, node=node,
                                      step=0, filename=self.node_filename,
                                      direction=INPUT_CONNECTION,
                                      is_refinery_file=False)
        self.assertEqual(
            self.analysis.get_refinery_import_task_signatures(),
            [FileImportTask().subtask(
                (self.analysis.get_input_file_store_items()[0].uuid,)
            )]
        )

    @override_storage()
    def test_get_refinery_import_task_signatures_inputs_all_local(self):
        # Create and associate an AnalysisNodeConnection with a "local" file
        file_store_item = FileStoreItem()
        file_store_item.datafile.save('test_file.txt', ContentFile(''))
        node = NodeFactory(assay=self.assay, study=self.study,
                           name='Input Node', analysis_uuid=self.analysis.uuid,
                           file_uuid=file_store_item.uuid)
        AnalysisNodeConnectionFactory(analysis=self.analysis, node=node,
                                      step=0, filename=self.node_filename,
                                      direction=INPUT_CONNECTION,
                                      is_refinery_file=False)
        self.assertEqual(self.analysis.get_refinery_import_task_signatures(),
                         [])


class BaseResourceSlugTest(TestCase):
    """Tests for BaseResource Slugs"""
    def setUp(self):
        # make some data
        for index, item in enumerate(range(0, 10)):
            DataSet.objects.create(slug="TestSlug%d" % index)
        self.project = Project.objects.create(name="project")
        self.project_with_slug = Project.objects.create(
            name="project2",
            slug="project_slug"
        )
        self.project_with_empty_slug = Project.objects.create(
            name="project3",
            slug=None
        )

    def test_duplicate_slugs(self):
        # Try to create DS with existing slug
        DataSet.objects.create(slug="TestSlug1")
        self.assertEqual(DataSet.objects.filter(slug="TestSlug1")
                         .count(), 1)

    def test_empty_slug(self):
        DataSet.objects.create(slug="")
        dataset_empty_slug = DataSet.objects.get(slug="")
        self.assertIsNotNone(dataset_empty_slug)
        DataSet.objects.create(slug=None)
        dataset_none_slug = DataSet.objects.get(slug=None)
        self.assertIsNotNone(dataset_none_slug)

    def test_edit_existing_slug(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance.summary = "Edited Summary"
        instance.save()
        data_set_edited = DataSet.objects.get(summary="Edited Summary")
        self.assertIsNotNone(data_set_edited)

    def test_save_slug_no_change(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance_again = DataSet.objects.get(slug="TestSlug1")
        instance_again.save()

        self.assertEqual(instance, instance_again)

    def test_save_slug_with_change(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance_again = DataSet.objects.get(slug="TestSlug1")
        instance_again.slug = "CHANGED"
        instance_again.save()

        self.assertNotEqual(instance.slug, instance_again.slug)

    def test_save_slug_when_another_model_with_same_slug_exists(self):
        dataset_with_same_slug_as_project = DataSet.objects.create(
            slug=self.project_with_slug.slug)
        self.assertIsNotNone(dataset_with_same_slug_as_project)

    def test_save_empty_slug_when_another_model_with_same_slug_exists(self):
        dataset_no_slug = DataSet.objects.create(
            slug=self.project_with_empty_slug.slug)

        self.assertIsNotNone(dataset_no_slug)

    def test_save_slug_when_same_model_with_same_slug_exists(self):
        Project.objects.create(name="project", slug="TestSlug4")
        Project.objects.create(name="project_duplicate", slug="TestSlug4")
        self.assertRaises(Project.DoesNotExist,
                          Project.objects.get,
                          name="project_duplicate")

    def test_save_empty_slug_when_same_model_with_same_slug_exists(self):
        project_with_no_slug = Project.objects.create(name="project2",
                                                      slug=None)
        self.assertIsNotNone(project_with_no_slug)

    def test_save_empty_slug_when_same_model_with_same_empty_slug_exists(
            self):

        Project.objects.create(name="project_no_slug", slug="")
        Project.objects.create(name="project_no_slug_duplicate", slug="")
        self.assertIsNotNone(Project.objects.get(
            name="project_no_slug_duplicate"))

        Project.objects.create(name="project_no_slug2", slug=None)
        Project.objects.create(name="project_no_slug_duplicate2", slug=None)

        self.assertIsNotNone(Project.objects.get(
            name="project_no_slug_duplicate2"))

        Project.objects.create(name="project_no_slug3", slug="            ")
        Project.objects.create(name="project_no_slug_duplicate3",
                               slug="            ")
        self.assertIsNotNone(Project.objects.get(
            name="project_no_slug_duplicate3"))


class DataSetDeletionTest(TestCase):
    """Testing for the deletion of Datasets"""
    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.analyses, self.dataset = \
            make_analyses_with_single_dataset(
                1,
                self.user
            )

    def test_transaction_rollback_on_dataset_delete_failure(self):
        with mock.patch.object(BaseResource, "delete", side_effect=Exception):
            self.dataset.delete()

        self.assertGreater(Analysis.objects.count(), 0)
        self.assertGreater(AnnotatedNode.objects.count(), 0)
        self.assertGreater(Assay.objects.count(), 0)
        self.assertGreater(DataSet.objects.count(), 0)
        self.assertGreater(FileStoreItem.objects.count(), 0)
        self.assertGreater(Investigation.objects.count(), 0)
        self.assertGreater(InvestigationLink.objects.count(), 0)
        self.assertGreater(Node.objects.count(), 0)
        self.assertGreater(NodeCollection.objects.count(), 0)
        self.assertGreater(Study.objects.count(), 0)

    def test_dataset_deletion_removes_related_objects(self):
        self.dataset.delete()

        self.assertEqual(Analysis.objects.count(), 0)
        self.assertEqual(AnnotatedNode.objects.count(), 0)
        self.assertEqual(Assay.objects.count(), 0)
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(FileStoreItem.objects.count(), 0)
        self.assertEqual(Investigation.objects.count(), 0)
        self.assertEqual(InvestigationLink.objects.count(), 0)
        self.assertEqual(Node.objects.count(), 0)
        self.assertEqual(NodeCollection.objects.count(), 0)
        self.assertEqual(Study.objects.count(), 0)

    def test_dataset_bulk_deletion_removes_related_objects(self):
        # make a second DataSet
        create_dataset_with_necessary_models(is_isatab_based=True)
        DataSet.objects.all().delete()

        self.assertEqual(Analysis.objects.count(), 0)
        self.assertEqual(AnnotatedNode.objects.count(), 0)
        self.assertEqual(Assay.objects.count(), 0)
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(FileStoreItem.objects.count(), 0)
        self.assertEqual(Investigation.objects.count(), 0)
        self.assertEqual(InvestigationLink.objects.count(), 0)
        self.assertEqual(Node.objects.count(), 0)
        self.assertEqual(NodeCollection.objects.count(), 0)
        self.assertEqual(Study.objects.count(), 0)

    def test_isa_archive_deletion(self):
        isatab_dataset = create_dataset_with_necessary_models(
            is_isatab_based=True
        )
        isatab_file_store_item_uuid = \
            isatab_dataset.get_investigation().get_file_store_item().uuid
        isatab_dataset.delete()
        with self.assertRaises(FileStoreItem.DoesNotExist):
            FileStoreItem.objects.get(uuid=isatab_file_store_item_uuid)

    def test_pre_isa_archive_deletion(self):
        tabular_file_store_item_uuid = \
            self.dataset.get_investigation().get_file_store_item().uuid
        self.dataset.delete()
        with self.assertRaises(FileStoreItem.DoesNotExist):
            FileStoreItem.objects.get(uuid=tabular_file_store_item_uuid)


class DataSetTests(TestCase):
    """ Testing of the DataSet model"""

    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(
            self.username2, '', self.password2
        )
        self.project = Project.objects.create()
        self.user_catch_all_project = UserProfile.objects.get(
            user=self.user
        ).catch_all_project

        self.isa_tab_dataset = create_dataset_with_necessary_models(
            is_isatab_based=True,
            user=self.user
        )
        self.latest_tabular_dataset_version = 3
        self.tabular_dataset = create_dataset_with_necessary_models(
            user=self.user2,
            latest_version=self.latest_tabular_dataset_version
        )

    def test_get_studies(self):
        studies = self.isa_tab_dataset.get_studies()
        self.assertEqual(len(studies), 1)

    def test_get_assays(self):
        assays = self.isa_tab_dataset.get_assays()
        self.assertEqual(len(assays), 1)

    def test_get_file_store_items(self):
        file_store_items = self.isa_tab_dataset.get_file_store_items()
        self.assertEqual(len(file_store_items), 3)

    def test_dataset_complete(self):
        self.assertTrue(self.isa_tab_dataset.is_valid)

    def test_dataset_incomplete(self):
        dataset = create_dataset_with_necessary_models(user=self.user)
        # Delete InvestigationLink to simulate a Dataset that hasn't
        # finished being created
        dataset.get_latest_investigation_link().delete()
        dataset.save()
        self.assertFalse(dataset.is_valid)

    def test_solr_called_on_post_save(self):
        with mock.patch(
            "core.models.update_data_set_index"
        ) as solr_mock:
            self.isa_tab_dataset.save()
            self.assertTrue(solr_mock.called)

    def test_get_latest_investigation_link(self):
        self.assertEqual(
            self.tabular_dataset.get_latest_investigation_link().version,
            self.latest_tabular_dataset_version
        )

    def test_get_latest_investigation(self):
        self.assertEqual(
            self.isa_tab_dataset.get_latest_investigation_link().investigation,
            self.isa_tab_dataset.get_investigation()
        )

    def test_get_latest_study(self):
        self.assertEqual(
            self.isa_tab_dataset.get_latest_study(),
            Study.objects.get(
                investigation=self.isa_tab_dataset.
                get_latest_investigation_link().investigation
            )
        )

    def test_get_latest_study_no_studies(self):
        self.isa_tab_dataset.get_latest_study().delete()
        with self.assertRaises(RuntimeError) as context:
            self.isa_tab_dataset.get_latest_study()
            self.assertIn("Couldn't fetch Study", context.exception.message)

    def test_get_nodes(self):
        nodes = Node.objects.all()
        self.assertGreater(nodes.count(), 0)
        for node in self.isa_tab_dataset.get_nodes():
            self.assertIn(node, nodes)

    def test_get_nodes_no_nodes_available(self):
        Node.objects.all().delete()
        self.assertQuerysetEqual(self.isa_tab_dataset.get_nodes(), [])

    def test_get_node_uuids(self):
        node_uuids = Node.objects.all().values_list("uuid", flat=True)
        self.assertGreater(node_uuids.count(), 0)
        for node_uuid in self.isa_tab_dataset.get_node_uuids():
            self.assertIn(node_uuid, node_uuids)

    def test_get_node_uuids_no_nodes_available(self):
        Node.objects.all().delete()
        self.assertQuerysetEqual(self.isa_tab_dataset.get_node_uuids(), [])

    def test_get_metadata_as_file_store_item(self):
        self.assertIsNotNone(
            self.isa_tab_dataset.get_investigation().get_file_store_item()
        )
        self.assertIsNotNone(
            self.tabular_dataset.get_investigation().get_file_store_item()
        )

    def test_is_isatab_based(self):
        self.assertTrue(
            self.isa_tab_dataset.get_investigation().is_isa_tab_based()
        )
        self.assertFalse(
            self.tabular_dataset.get_investigation().is_isa_tab_based()
        )

    def test_cached_is_valid_property_is_invalidated_on_save(self):
        # Trigger load into cache
        self.assertTrue(self.tabular_dataset.is_valid)
        with mock.patch(
            "core.models.DataSet._invalidate_cached_properties"
        ) as invalidate_cached_props_mock:
            self.tabular_dataset.save()
            invalidate_cached_props_mock.assert_called()

    def test_is_clean_on_clean_dataset(self):
        self.assertTrue(self.isa_tab_dataset.is_clean())

    def test_is_clean_if_dataset_has_analyses(self):
        analyses, dataset = make_analyses_with_single_dataset(1, self.user)
        self.assertFalse(dataset.is_clean())

    def test_is_clean_if_dataset_has_failed_analyses(self):
        analyses, dataset = make_analyses_with_single_dataset(1, self.user)
        for analysis in analyses:
            analysis.set_status(Analysis.FAILURE_STATUS)
        self.assertTrue(dataset.is_clean())

    def test_is_clean_if_dataset_has_visualizations(self):
        tool = create_tool_with_necessary_models("VISUALIZATION")
        self.assertFalse(tool.dataset.is_clean())

    def test_is_clean_if_data_set_is_shared(self):
        data_set = create_dataset_with_necessary_models()
        data_set.share(ExtendedGroup.objects.public_group())
        self.assertTrue(data_set.is_clean())


class ExtendedGroupModelTests(TestCase):
    def setUp(self):
        self.group = ExtendedGroup.objects.create(name="Test Group")
        self.user = User.objects.create_user('managerUser')
        self.non_manager = User.objects.create_user('regularUser')
        self.group.user_set.add(self.user)
        self.group.manager_group.user_set.add(self.user)

    def test_is_user_a_group_manager_returns_true_for_group(self):
        self.assertTrue(self.group.is_user_a_group_manager(self.user))

    def test_is_user_a_group_manager_returns_true_for_manager_group(self):
        self.assertTrue(
            self.group.manager_group.is_user_a_group_manager(self.user)
        )

    def test_is_user_a_group_manager_returns_false_for_group(self):
        self.assertFalse(self.group.is_user_a_group_manager(self.non_manager))

    def test_is_user_a_group_manager_returns_false_for_manager_group(self):
        self.assertFalse(
            self.group.manager_group.is_user_a_group_manager(self.non_manager)
        )


class EventTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser')
        CuserMiddleware.set_user(self.user)
        self.pre_re = u'^\d{2}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}: testuser '
        self.post_re = u' data set Test DataSet - [0-9a-f-]+$'

    def test_data_set_create(self):
        create_dataset_with_necessary_models()
        events = Event.objects.all()
        self.assertEqual(len(events), 1)
        self.assertRegexpMatches(
            str(events[0]),
            self.pre_re + u'created data set Test DataSet - [0-9a-f-]+$'
        )

    # DataSetPermissionsUpdateTests covers data_set_permissions_change.

    def test_data_set_metadata_reupload(self):
        pass  # TODO

    def test_data_set_file_link(self):
        pass  # TODO

    def test_data_set_metadata_edit(self):
        pass  # TODO

    def test_data_set_visualization_creation(self):
        create_tool_with_necessary_models("VISUALIZATION")

        events = Event.objects.all()
        self.assertEqual(len(events), 2)
        self.assertRegexpMatches(
            str(events[0]),
            self.pre_re + r'created' + self.post_re
        )
        self.assertRegexpMatches(
            str(events[1]),
            self.pre_re +
            r'launched visualization Test VISUALIZATION Tool: [0-9a-f-]+ on' +
            self.post_re
        )

    def test_data_set_visualization_deletion(self):
        pass  # TODO

    def test_data_set_analysis_creation(self):
        create_tool_with_necessary_models("WORKFLOW")

        events = Event.objects.all()
        self.assertEqual(len(events), 2)
        self.assertRegexpMatches(
            unicode(events[0]),
            self.pre_re + u'created' + self.post_re
        )
        self.assertRegexpMatches(
            unicode(events[1]),
            self.pre_re +
            u'launched analysis Test WORKFLOW Tool: [0-9a-f-]+ on' +
            self.post_re
        )

    def test_data_set_analysis_deletion(self):
        pass  # TODO

    def test_group_permissions_change(self):
        pass  # TODO

    def test_group_invitation_sent(self):
        pass  # TODO

    def test_group_invitation_accepted(self):
        pass  # TODO

    def test_group_invitation_revoked(self):
        pass  # TODO

    def test_group_invitation_resent(self):
        pass  # TODO

    def test_group_user_promotion(self):
        pass  # TODO

    def test_group_user_demotion(self):
        pass  # TODO

    def test_group_user_removal(self):
        pass  # TODO

    def test_get_details_as_dict(self):
        tool = create_tool_with_necessary_models("VISUALIZATION",
                                                 user=self.user)
        event = Event.objects.last()
        self.assertEqual(
            event.get_details_as_dict(),
            {
                u'display_name': tool.display_name
            }
        )


class OwnableResourceTest(TestCase):
    def setUp(self):
        self.username = 'TestUser'
        self.user = User.objects.create_user(
            self.username, '', self.username
        )
        self.data_set = create_dataset_with_necessary_models()
        self.owned_data_set = create_dataset_with_necessary_models(
            user=self.user
        )

        self.tool_def = ToolDefinitionFactory(
            tool_type=ToolDefinition.WORKFLOW,
            name='Analysis Test',
            file_relationship=FileRelationshipFactory()
        )
        self.tool = ToolFactory(
            dataset=self.data_set,
            tool_definition=self.tool_def
        )
        # utility method create_tools calls on the set_owner method for tools
        self.tool.set_owner(self.user)

    # For tools which are ownable but not sharable
    def test_get_owner_returns_owner(self):
        self.assertEqual(self.tool.get_owner(), self.user)

    # For data sets
    def test_remove_owner_removes(self):
        self.owned_data_set.remove_owner(self.user)
        self.assertEqual(self.data_set.get_owner(), None)

    def test_remove_owner_removes_all_perms(self):
        self.owned_data_set.remove_owner(self.user)
        user_perms = get_perms(self.user, self.owned_data_set)
        self.assertEqual(user_perms, [])

    def test_set_owner_data_set_adds_owner(self):
        self.data_set.set_owner(self.user)
        self.assertEqual(self.data_set.get_owner(), self.user)

    def test_set_owner_data_sets_add_perms(self):
        self.data_set.set_owner(self.user)
        user_perms = get_perms(self.user, self.data_set)
        self.assertTrue('add_dataset' in user_perms)

    def test_set_owner_data_sets_change_perms(self):
        self.data_set.set_owner(self.user)
        user_perms = get_perms(self.user, self.data_set)
        self.assertTrue('change_dataset' in user_perms)

    def test_set_owner_data_sets_delete_perms(self):
        self.data_set.set_owner(self.user)
        user_perms = get_perms(self.user, self.data_set)
        self.assertTrue('delete_dataset' in user_perms)

    def test_set_owner_data_sets_read_perms(self):
        self.data_set.set_owner(self.user)
        user_perms = get_perms(self.user, self.data_set)
        self.assertTrue('read_dataset' in user_perms)

    def test_set_owner_data_sets_read_meta_perms(self):
        self.data_set.set_owner(self.user)
        user_perms = get_perms(self.user, self.data_set)
        self.assertTrue('read_meta_dataset' in user_perms)


class ShareableResourceTest(TestCase):
    def setUp(self):
        self.username = 'TestUser'
        self.user = User.objects.create_user(
            self.username, '', self.username
        )
        self.data_set = create_dataset_with_necessary_models()
        self.owned_data_set = create_dataset_with_necessary_models(
            user=self.user
        )

    def test_get_owner_returns_owner(self):
        self.assertEqual(self.owned_data_set.get_owner(), self.user)

    def test_remove_owner_removes(self):
        self.owned_data_set.remove_owner(self.user)
        self.assertEqual(self.owned_data_set.get_owner(), None)

    def test_remove_owner_removes_share_perms(self):
        self.owned_data_set.remove_owner(self.user)
        user_perms = get_perms(self.user, self.owned_data_set)
        self.assertFalse('share_dataset' in user_perms)

    def test_set_owner_data_set_adds_owner(self):
        self.data_set.set_owner(self.user)
        self.assertEqual(self.data_set.get_owner(), self.user)

    def test_set_owner_data_set_adds_share_perms(self):
        self.data_set.set_owner(self.user)
        user_perms = get_perms(self.user, self.data_set)
        self.assertTrue('share_dataset' in user_perms)


class SiteProfileUnitTests(TestCase):
    def setUp(self):
        self.current_site = Site.objects.get_current()
        self.site_profile = SiteProfile.objects.create(site=self.current_site)

    def test_site_profile_created_fk(self):
        self.assertEqual(self.site_profile.site, self.current_site)

    def test_site_profile_creates_blank_fields(self):
        self.assertEqual(self.site_profile.about_markdown, '')
        self.assertEqual(self.site_profile.twitter_username, '')


class SiteVideoUnitTests(TestCase):
    def setUp(self):
        self.current_site = Site.objects.get_current()
        self.site_profile = SiteProfile.objects.create(site=self.current_site)
        self.source_id_1 = 'yt_id_5'
        self.site_video = SiteVideo.objects.create(
            site_profile=self.site_profile, source_id=self.source_id_1
        )

    def test_site_profile_creates_blank_fields(self):
        self.assertEqual(self.site_video.caption, '')
        self.assertEqual(self.site_video.source, '')

    def test_site_returns_videos(self):
        self.site_profile.refresh_from_db()
        self.assertEqual(self.site_profile.sitevideo_set.all()[0],
                         self.site_video)


class SiteStatisticsUnitTests(TestCase):
    def setUp(self):
        # Simulate a day of user activity
        test_group = ExtendedGroup.objects.create(name="Test Group",
                                                  is_public=True)
        user_a = User.objects.create_user("user_a", "", "user_a")
        user_b = User.objects.create_user("user_b", "", "user_b")
        self.client.login(username="user_a", password="user_a")
        self.client.login(username="user_b", password="user_b")
        self.client.login(username="user_b", password="user_b")
        self.client.login(username="user_b", password="user_b")
        create_dataset_with_necessary_models(user=user_a)
        create_dataset_with_necessary_models(user=user_a).share(test_group)
        create_dataset_with_necessary_models(user=user_b).share(test_group)
        create_tool_with_necessary_models("VISUALIZATION")  # creates a DataSet
        create_tool_with_necessary_models("WORKFLOW")  # creates a DataSet
        self.site_statistics = SiteStatistics.objects.create()
        self.site_statistics.collect()

    def test__get_previous_instance(self):
        self.assertNotEqual(self.site_statistics._get_previous_instance(),
                            self.site_statistics)

    def test__get_datasets_shared(self):
        self.assertEqual(self.site_statistics._get_datasets_shared(), 2)

    def test__get_datasets_uploaded(self):
        self.assertEqual(self.site_statistics._get_datasets_uploaded(), 5)

    def test__get_total_visualization_launches(self):
        self.assertEqual(
            self.site_statistics._get_total_visualization_launches(),
            1
        )

    def test__get_total_workflow_launches(self):
        self.assertEqual(
            self.site_statistics._get_total_workflow_launches(),
            1
        )

    def test__get_unique_user_logins(self):
        self.assertEqual(self.site_statistics._get_unique_user_logins(), 2)

    def test__get_users_created(self):
        # 3 instead of the expected 2 because the emission of
        # the post_migrate signal creates the AnonymousUser
        self.assertEqual(self.site_statistics._get_users_created(), 3)

    def test__get_groups_created(self):
        self.assertEqual(self.site_statistics._get_groups_created(), 1)

    def test__get_total_user_logins(self):
        self.assertEqual(self.site_statistics._get_total_user_logins(), 4)

    def test_get_csv_row(self):
        self.assertEqual(
            self.site_statistics.get_csv_row(),
            [self.site_statistics.id, 2, 5, 1,
             self.site_statistics.formatted_run_date, 4, 1, 1, 3, 2]
        )

    def test_get_csv_row_aggregates(self):
        test_group_b = ExtendedGroup.objects.create(name="Test Group B",
                                                    is_public=True)
        user_c = User.objects.create_user("user_c", "", "user_c")
        self.client.login(username="user_c", password="user_c")
        create_dataset_with_necessary_models(user=user_c)
        create_dataset_with_necessary_models(user=user_c).share(test_group_b)
        create_tool_with_necessary_models("VISUALIZATION")  # creates a DataSet
        create_tool_with_necessary_models("WORKFLOW")  # creates a DataSet
        site_statistics = SiteStatistics.objects.create()
        site_statistics.collect()

        self.assertEqual(
            site_statistics.get_csv_row(aggregates=True),
            [site_statistics.id, 3, 9, 3,
             site_statistics.formatted_run_date, 5, 2, 2, 4, 3]
        )


class SiteStatisticsIntegrationTests(TestCase):
    def setUp(self):
        test_group = ExtendedGroup.objects.create(name="Test Group A")

        # Simulate a day of user activity
        user_a = User.objects.create_user("user_a", "", "user_a")
        self.client.login(username="user_a", password="user_a")
        self.dataset_a = create_dataset_with_necessary_models(user=user_a)
        self.dataset_b = create_dataset_with_necessary_models(user=user_a)
        self.dataset_b.share(test_group)
        self.site_statistics_a = SiteStatistics.objects.create()
        self.site_statistics_a.collect()

        # Simulate a day where nothing happened
        self.site_statistics_b = SiteStatistics.objects.create()
        self.site_statistics_b.collect()

        # Simulate another day of user activity
        user_b = User.objects.create_user("user_b", "", "user_b")
        user_c = User.objects.create_user("user_c", "", "user_c")
        self.client.login(username="user_b", password="user_b")
        self.client.login(username="user_c", password="user_c")
        self.client.login(username="user_c", password="user_c")
        self.client.login(username="user_c", password="user_c")
        self.dataset_c = create_dataset_with_necessary_models(user=user_b)
        self.dataset_d = create_dataset_with_necessary_models(user=user_b)
        self.dataset_d.share(test_group)
        self.dataset_e = create_dataset_with_necessary_models(user=user_c)
        self.dataset_e.share(test_group)
        ExtendedGroup.objects.create(name="Test Group B")
        create_tool_with_necessary_models("VISUALIZATION")  # creates a DataSet
        create_tool_with_necessary_models("WORKFLOW")  # creates a DataSet
        self.site_statistics_c = SiteStatistics.objects.create()
        self.site_statistics_c.collect()

    def test__get_previous_instance(self):
        self.assertEqual(
            (self.site_statistics_a._get_previous_instance().id,
             self.site_statistics_b._get_previous_instance().id,
             self.site_statistics_c._get_previous_instance().id),
            (SiteStatistics.objects.first().id,
             self.site_statistics_a.id,
             self.site_statistics_b.id)
        )

    def test_datasets_uploaded(self):
        self.assertEqual(
            (self.site_statistics_a.datasets_uploaded,
             self.site_statistics_b.datasets_uploaded,
             self.site_statistics_c.datasets_uploaded),
            (2, 0, 5)
        )

    def test_datasets_shared(self):
        self.assertEqual(
            (self.site_statistics_a.datasets_shared,
             self.site_statistics_b.datasets_shared,
             self.site_statistics_c.datasets_shared),
            (1, 0, 2)
        )

    def test_users_created(self):
        self.assertEqual(
            (self.site_statistics_a.users_created,
             self.site_statistics_b.users_created,
             self.site_statistics_c.users_created),
            # + 2 instead of the expected 1 because the emission of
            # the post_migrate signal creates the AnonymousUser
            (self.site_statistics_a._get_previous_instance().users_created + 2,
             0,
             self.site_statistics_c._get_previous_instance().users_created + 2)
        )

    def test_groups_created(self):
        self.assertEqual(
            (self.site_statistics_a.groups_created,
             self.site_statistics_b.groups_created,
             self.site_statistics_c.groups_created),
            (1, 0, 1)
        )

    def test_unique_user_logins(self):
        self.assertEqual(
            (self.site_statistics_a.unique_user_logins,
             self.site_statistics_b.unique_user_logins,
             self.site_statistics_c.unique_user_logins),
            (1, 0, 2)
        )

    def test_total_user_logins(self):
        self.assertEqual(
            (self.site_statistics_a.total_user_logins,
             self.site_statistics_b.total_user_logins,
             self.site_statistics_c.total_user_logins),
            (1, 0, 4)
        )

    def test_total_workflow_launches(self):
        self.assertEqual(
            (self.site_statistics_a.total_workflow_launches,
             self.site_statistics_b.total_workflow_launches,
             self.site_statistics_c.total_workflow_launches),
            (0, 0, 1)
        )

    def test_total_visualization_launches(self):
        self.assertEqual(
            (self.site_statistics_a.total_visualization_launches,
             self.site_statistics_b.total_visualization_launches,
             self.site_statistics_c.total_visualization_launches),
            (0, 0, 1)
        )

    def test__get_previous_instance_returns_itself_if_only_instance(self):
        SiteStatistics.objects.all().delete()
        site_statistics = SiteStatistics.objects.create()
        self.assertEqual(site_statistics._get_previous_instance(),
                         site_statistics)

    def test_periodic_task_is_scheduled_for_daily_runs(self):
        self.assertEqual(
            settings.CELERYBEAT_SCHEDULE["collect_site_statistics"],
            {
                'task': 'core.tasks.collect_site_statistics',
                'schedule': timedelta(days=1),
                'options': {
                    'expires': 30,  # seconds
                }
            }
        )

    def test_collect_site_statistics_creates_new_instance(self):
        initial_site_statistics_count = SiteStatistics.objects.count()
        collect_site_statistics()
        self.assertEqual(initial_site_statistics_count + 1,
                         SiteStatistics.objects.count())


class UserCreateTest(TestCase):
    """Test User instance creation"""

    def setUp(self):
        self.username = "testuser"
        self.password = "password"
        self.email = "test@example.com"
        self.first_name = "John"
        self.last_name = "Sample"
        self.affiliation = "University"
        self.public_group_name = ExtendedGroup.objects.public_group().name

    def test_add_new_user_to_public_group(self):
        """Test if User accounts are added to Public group"""
        new_user = User.objects.create_user(self.username)
        self.assertEqual(
            new_user.groups.filter(name=self.public_group_name).count(), 1)

    def test_init_user(self):
        """Test if User account are created correctly using the management
        command
        """
        init_user(self.username, self.password, self.email, self.first_name,
                  self.last_name, self.affiliation)
        new_user = User.objects.get(username=self.username)
        self.assertEqual(
            new_user.groups.filter(name=self.public_group_name).count(), 1)


class UserProfileTest(TestCase):
    def setUp(self):
        self.username = self.password = 'test_user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.group = ExtendedGroup.objects.create(name="Mock Primary Group",
                                                  is_public=True)
        self.userprofile = UserProfile.objects.get(user=self.user)
        self.userprofile.primary_group = self.group
        self.userprofile.save()
        self.group.user_set.add(self.user)

    def test_deleting_a_primary_group_nulls_the_primary_group_field(self):
        self.assertEqual(self.userprofile.primary_group, self.group)
        ExtendedGroup.objects.get(id=self.group.id).delete()
        self.userprofile.refresh_from_db()
        self.assertEqual(self.userprofile.primary_group, None)

    def test_nulling_primary_group_field_does_not_effect_group(self):
        self.userprofile.primary_group = None
        self.userprofile.save()
        self.userprofile.refresh_from_db()
        self.assertEqual(self.userprofile.primary_group, None)
        self.assertEqual(1,
                         len(ExtendedGroup.objects.filter(id=self.group.id)))


class UserTutorialsTest(TestCase):
    """
    This test ensures that whenever a UserProfile instance is created,
    there is a Tutorial object associated with it
    """
    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.userprofile = UserProfile.objects.get(user=self.user)

    def test_tutorial_creation(self):
        self.assertIsNotNone(
            Tutorials.objects.get(user_profile=self.userprofile)
        )


class WorkflowDeletionTest(TestCase):
    """Testing for the deletion of Workflows"""

    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.project = Project.objects.create()
        self.galaxy_instance = GalaxyInstanceFactory()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow_used_by_analyses = Workflow.objects.create(
            name="workflow_used_by_analyses",
            workflow_engine=self.workflow_engine)
        self.workflow_not_used_by_analyses = Workflow.objects.create(
            name="workflow_not_used_by_analyses",
            workflow_engine=self.workflow_engine)
        self.dataset = DataSet.objects.create()
        self.analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset,
            workflow=self.workflow_used_by_analyses,
            status="SUCCESS"
        )
        self.analysis.set_owner(self.user)

    def test_verify_workflow_used_by_analysis(self):
        self.assertEqual(self.analysis.workflow.name,
                         "workflow_used_by_analyses")

    def test_verify_no_deletion_if_workflow_used_in_analysis(self):
        self.workflow_used_by_analyses.delete()
        self.assertIsNotNone(self.workflow_used_by_analyses)
        self.assertFalse(self.workflow_used_by_analyses.is_active)

    def test_verify_deletion_if_workflow_not_used_in_analysis(self):
        self.assertIsNotNone(Workflow.objects.get(
            name="workflow_not_used_by_analyses"))
        self.workflow_not_used_by_analyses.delete()
        self.assertRaises(Workflow.DoesNotExist,
                          Workflow.objects.get,
                          name="workflow_not_used_by_analyses")
