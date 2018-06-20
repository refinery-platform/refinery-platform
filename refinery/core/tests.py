from datetime import timedelta
import re

from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import AnonymousUser, Group, User
from django.contrib.sites.models import Site
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase
from django.utils import timezone

from cuser.middleware import CuserMiddleware
from guardian.shortcuts import get_objects_for_group
import mock
import mockcache as memcache

from analysis_manager.models import AnalysisStatus
from data_set_manager.models import (AnnotatedNode, Assay, Contact,
                                     Investigation, Node, NodeCollection,
                                     Study)
from factory_boy.django_model_factories import GalaxyInstanceFactory
from factory_boy.utils import (create_dataset_with_necessary_models,
                               create_tool_with_necessary_models,
                               make_analyses_with_single_dataset)
from file_store.models import FileStoreItem, FileType

from .management.commands.create_user import init_user
from .management.commands.import_annotations import \
    Command as ImportAnnotationsCommand
from .models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                     AnalysisNodeConnection, AnalysisResult, BaseResource,
                     DataSet, Event, ExtendedGroup, InvestigationLink, Project,
                     SiteStatistics, Tutorials, UserProfile, Workflow,
                     WorkflowEngine, invalidate_cached_object)
from .search_indexes import DataSetIndex
from .tasks import collect_site_statistics
from .utils import (filter_nodes_uuids_in_solr, get_aware_local_time,
                    get_resources_for_user, move_obj_to_front,
                    which_default_read_perm)

cache = memcache.Client(["127.0.0.1:11211"])


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


class CachingTest(TestCase):
    """Testing the addition and deletion of cached objects"""

    def setUp(self):
        # make some data
        self.username = self.password = 'Cool'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.username1 = self.password1 = 'Cool1'
        self.user1 = User.objects.create_user(
            self.username1, '', self.password1
        )
        self.public_group_name = ExtendedGroup.objects.public_group().name
        for index, item in enumerate(range(0, 6)):
            create_dataset_with_necessary_models(slug="TestSlug%d" % index)
        # Adding to cache
        cache.add("{}-DataSet".format(self.user.id), DataSet.objects.all())

        # Initial data that is cached, to test against later
        self.initial_cache = cache.get("{}-DataSet".format(self.user.id))

    def tearDown(self):
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

    def test_verify_cache_invalidation(self):
        # Grab a DataSet and see if we can invalidate the cache
        ds = DataSet.objects.get(slug="TestSlug5")
        self.cache = invalidate_cached_object(ds, True)
        self.assertIsNone(self.cache.get("{}-DataSet".format(self.user.id)))

    def test_verify_data_after_save(self):
        # Grab, alter, and save an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.slug = "NewSlug"
        ds.save()

        # Invalidate cache
        self.cache = invalidate_cached_object(ds, True)

        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)
        self.assertTrue(DataSet.objects.get(slug="NewSlug"))

    def test_verify_data_after_delete(self):
        # Grab and delete an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.delete()

        # Invalidate cache
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

        self.assertFalse(self.cache.get("{}-DataSet".format(self.user.id)))
        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)

    def test_verify_data_after_perms_change(self):
        # Grab and change sharing an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.share(group=Group.objects.get(name="Public"))

        # Invalidate cache
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

        self.assertFalse(self.cache.get("{}-DataSet".format(self.user.id)))
        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)


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


class AnalysisDeletionTest(TestCase):
    """Testing for the deletion of Analyses"""
    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.analyses, self.dataset = \
            make_analyses_with_single_dataset(
                1,
                self.user
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
        # Create a user
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )

        # Create a Project
        self.project = Project.objects.create()
        self.project1 = Project.objects.create()

        # Create a galaxy Instance
        self.galaxy_instance = GalaxyInstanceFactory()

        # Create a WorkflowEngine
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )

        # Create a Workflow
        self.workflow = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)
        self.workflow1 = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)

        text_filetype = FileType.objects.get(name="TXT")

        # Create FileStoreItems
        self.file_store_item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.txt',
                'Coffee is delicious!'
            ),
            filetype=text_filetype
        )
        self.file_store_item1 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.txt',
                'Coffee is delicious!'
            )
        )

        # Create some DataSets that will have an analysis run upon them
        self.dataset_with_analysis = DataSet.objects.create()
        self.dataset_with_analysis1 = DataSet.objects.create()

        # Create a DataSet that won't have an analysis run upon it
        self.dataset_without_analysis = DataSet.objects.create()

        # Create two Analyses using the two DataSets made earlier
        self.analysis = Analysis.objects.create(
            name='analysis_without_node_analyzed_further',
            summary='This is a summary',
            project=self.project,
            data_set=self.dataset_with_analysis,
            workflow=self.workflow,
            status="SUCCESS"
        )
        self.analysis_status = AnalysisStatus.objects.create(
            analysis=self.analysis
        )
        self.analysis_with_node_analyzed_further = Analysis.objects.create(
            name='analysis_with_node_analyzed_further',
            summary='This is a summary',
            project=self.project1,
            data_set=self.dataset_with_analysis1,
            workflow=self.workflow1,
            status="SUCCESS"
        )
        # Set Ownership
        self.analysis.set_owner(self.user)
        self.analysis_with_node_analyzed_further.set_owner(self.user)

        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()
        self.investigation_link = InvestigationLink.objects.create(
            investigation=self.investigation,
            data_set=self.dataset_with_analysis)
        self.investigation1 = Investigation.objects.create()
        self.investigation_link1 = InvestigationLink.objects.create(
            investigation=self.investigation1,
            data_set=self.dataset_with_analysis1)

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)
        self.study1 = Study.objects.create(investigation=self.investigation1)
        self.assay1 = Assay.objects.create(study=self.study1)

        # Create Nodes
        self.node = Node.objects.create(
            assay=self.assay,
            study=self.study,
            name="test_node",
            analysis_uuid=self.analysis.uuid,
            file_uuid=self.file_store_item.uuid
        )
        self.node2 = Node.objects.create(
            assay=self.assay1,
            study=self.study,
            analysis_uuid=self.analysis_with_node_analyzed_further.uuid,
            file_uuid=self.file_store_item1.uuid
        )

        self.node_filename = "{}.{}".format(
            self.node.name,
            self.node.get_file_store_item().get_extension()
        )

        # Create AnalysisNodeConnections
        self.analysis_node_connection_a = (
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis,
                node=self.node,
                step=1,
                filename=self.node_filename,
                direction=OUTPUT_CONNECTION,
                is_refinery_file=True,
                galaxy_dataset_name="Galaxy File Name"
            )
        )
        self.analysis_node_connection_b = (
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis,
                node=self.node,
                step=2,
                filename=self.node_filename,
                direction=OUTPUT_CONNECTION,
                is_refinery_file=False
            )
        )
        self.analysis_node_connection_c = (
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis,
                node=self.node,
                step=3,
                filename=self.node_filename,
                direction=OUTPUT_CONNECTION,
                is_refinery_file=True
            )
        )
        self.analysis_node_connection_with_node_analyzed_further = (
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis_with_node_analyzed_further,
                node=self.node2,
                step=0,
                direction=INPUT_CONNECTION
            )
        )

    def test_verify_analysis_deletion_if_nodes_not_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'out'
        query = Analysis.objects.get(
            name='analysis_without_node_analyzed_further')
        self.assertIsNotNone(query)
        self.analysis.delete()
        self.assertRaises(Analysis.DoesNotExist, Analysis.objects.get,
                          name='analysis_without_node_analyzed_further')

    def test_verify_analysis_remains_if_nodes_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'in'
        self.analysis_with_node_analyzed_further.delete()
        self.assertIsNotNone(Analysis.objects.get(
            name='analysis_with_node_analyzed_further'))

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

        self.assertEqual(
            self.analysis_status.galaxy_file_import_state(),
            []
        )

    def test_galaxy_tool_file_import_state_is_empty_without_import_progress(
            self):
        self.analysis_status.galaxy_import_state = AnalysisStatus.PROGRESS

        self.assertEqual(
            self.analysis_status.galaxy_file_import_state(),
            []
        )

    def test_facet_name(self):
        self.assertRegexpMatches(
            self.analysis_with_node_analyzed_further.facet_name(),
            'REFINERY_ANALYSIS_UUID_' + r'\d+_\d+' + '_s'
        )

    @mock.patch("core.models.index_annotated_nodes_selection")
    @mock.patch.object(Analysis, "rename_results")
    def test__prepare_annotated_nodes_calls_methods_in_proper_order(
            self,
            rename_results_mock,
            index_annotated_nodes_selection_mock
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
            "analysis_uuid": self.analysis.uuid,
            "file_store_uuid": self.node.file_uuid,
            "file_name": self.node_filename,
            "file_type": self.node.get_file_store_item().filetype
        }
        analysis_result_0 = AnalysisResult.objects.create(**common_params)

        if include_faulty_result:
            # This analysis result has a filename that doesn't correspond to
            #  any specified AnalysisNodeConnection Output filenames
            AnalysisResult.objects.create(
                **dict(common_params, file_name="Bad Filename")
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
            "{}_{}".format(self.analysis_node_connection_a.step,
                           self.analysis_node_connection_a.filename)
        )

    def test_analysis_node_connection_output_id(self):
        self.assertEqual(
            self.analysis_node_connection_a.get_output_connection_id(),
            "{}_{}".format(self.analysis_node_connection_a.step,
                           self.analysis_node_connection_a.name)
        )

    def test__create_derived_data_file_node(self):
        derived_data_file_node = self.analysis._create_derived_data_file_node(
            self.study,
            self.assay,
            self.analysis_node_connection_a
        )
        self.assertEqual(derived_data_file_node.name, "Galaxy File Name")
        self.assertEqual(derived_data_file_node.study, self.study)
        self.assertEqual(derived_data_file_node.assay, self.assay)
        self.assertEqual(derived_data_file_node.type, Node.DERIVED_DATA_FILE)
        self.assertEqual(derived_data_file_node.analysis_uuid,
                         self.analysis.uuid)
        self.assertEqual(derived_data_file_node.subanalysis,
                         self.analysis_node_connection_a.subanalysis)
        self.assertEqual(derived_data_file_node.workflow_output,
                         self.analysis_node_connection_a.name)


class UtilitiesTest(TestCase):
    def setUp(self):
        investigation = Investigation.objects.create()
        self.study = Study.objects.create(
                file_name='test_filename123.txt',
                title='Study Title Test',
                investigation=investigation)
        assay = {
            'study': self.study,
            'measurement': 'transcription factor binding site',
            'measurement_accession': 'http://www.testurl.org/testID',
            'measurement_source': 'OBI',
            'technology': 'nucleotide sequencing',
            'technology_accession': 'test info',
            'technology_source': 'test source',
            'platform': 'Genome Analyzer II',
            'file_name': 'test_assay_filename.txt'
        }
        self.assay = Assay.objects.create(**assay)
        self.valid_uuid = self.assay.uuid
        self.invalid_uuid = "03b5f681-35d5-4bdd-bc7d-8552fa777ebc"
        self.node_uuids = [
            "1a50204d-49fa-4082-a708-26ee93fb0f86",
            "32e977fc-b906-4315-b6ed-6a644d173492",
            "910117c5-fda2-4700-ae87-dc897f3a5d85"
            ]

    def test_get_resources_for_user(self):
        django_anon_user = AnonymousUser()
        guardian_anon_user = User.get_anonymous()
        auth_user = User.objects.create_user(
            'testuser', 'test@example.com', 'password')
        public_group = ExtendedGroup.objects.public_group()

        def django_anon_datasets():
            return get_resources_for_user(django_anon_user, 'dataset')

        def guardian_anon_datasets():
            return get_resources_for_user(guardian_anon_user, 'dataset')

        def auth_datasets():
            return get_resources_for_user(auth_user, 'dataset')

        def public_datasets():
            return get_objects_for_group(
                public_group,
                'core.read_dataset'
            )

        # The point of this test is to make sure getting
        # resources for the Anonymous User is the same as
        # getting resources for the Public Group.
        # (In practice, it should be the Guardian
        # Anonymous, but if it's Django for some reason,
        # it should still work.)

        self.assertTrue(auth_user.is_authenticated())

        # Both ways should be the same, and empty, to begin:

        self.assertEqual(len(django_anon_datasets()), 0)
        self.assertEqual(len(guardian_anon_datasets()), 0)
        self.assertEqual(len(auth_datasets()), 0)
        self.assertEqual(len(public_datasets()), 0)

        # Create a data set:

        dataset = create_dataset_with_necessary_models()
        dataset.set_owner(auth_user)

        self.assertEqual(len(django_anon_datasets()), 0)
        self.assertEqual(len(guardian_anon_datasets()), 0)
        self.assertEqual(len(auth_datasets()), 1)
        self.assertEqual(len(public_datasets()), 0)

        # Make data set public:

        dataset.share(public_group)
        self.assertEqual(len(django_anon_datasets()), 1)
        self.assertEqual(len(guardian_anon_datasets()), 1)
        self.assertEqual(len(auth_datasets()), 1)
        self.assertEqual(len(public_datasets()), 1)

    def test_get_aware_local_time(self):
        expected_time = timezone.localtime(timezone.now())
        response_time = get_aware_local_time()
        difference_time = response_time - expected_time

        self.assertLessEqual(difference_time.total_seconds(), .99)

    # Mock methods used in filter_nodes_uuids_in_solr
    def fake_generate_solr_params(params, assay_uuid):
        # Method should respond with a string
        return ''

    def fake_search_solr(params, str_name):
        # Method expects solr params and a str_name. It should return a string
        # For mock purpose, pass params which are included in solr_response
        return params

    def fake_format_solr_response(solr_response):
        # Method expects solr_response and returns array of uuid objs
        if '&fq=-uuid' in solr_response:
            # if uuids are passed in
            response_node_uuids = [
                {'uuid': 'd2041706-ad2e-4f5b-a6ac-2122fe2a9751'},
                {'uuid': '57d2b371-a364-4806-b7ee-366a722ca9f4'},
                {'uuid': 'c9d7f81f-2274-4179-ad00-28227bf4b9b7'},
                {'uuid': 'e082ce03-0a83-4162-af5c-7472e450d7d0'},
                {'uuid': '880e60f7-7036-4468-b9c8-fdeebe7c21c3'},
                {'uuid': '945aaca7-dc58-47b8-8012-e9821249ca7a'},
                {'uuid': '2b939cb3-5b40-48c2-8df7-e5472c3bdcca'},
                {'uuid': 'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'}
            ]
        else:
            # else return all uuids
            response_node_uuids = [
                {'uuid': '1a50204d-49fa-4082-a708-26ee93fb0f86'},
                {'uuid': '32e977fc-b906-4315-b6ed-6a644d173492'},
                {'uuid': '910117c5-fda2-4700-ae87-dc897f3a5d85'},
                {'uuid': 'd2041706-ad2e-4f5b-a6ac-2122fe2a9751'},
                {'uuid': '57d2b371-a364-4806-b7ee-366a722ca9f4'},
                {'uuid': 'c9d7f81f-2274-4179-ad00-28227bf4b9b7'},
                {'uuid': 'e082ce03-0a83-4162-af5c-7472e450d7d0'},
                {'uuid': '880e60f7-7036-4468-b9c8-fdeebe7c21c3'},
                {'uuid': '945aaca7-dc58-47b8-8012-e9821249ca7a'},
                {'uuid': '2b939cb3-5b40-48c2-8df7-e5472c3bdcca'},
                {'uuid': 'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'}
            ]
        return {'nodes': response_node_uuids}

    @mock.patch("data_set_manager.utils.generate_solr_params_for_assay",
                fake_generate_solr_params)
    @mock.patch("data_set_manager.utils.search_solr", fake_search_solr)
    @mock.patch("data_set_manager.utils.format_solr_response",
                fake_format_solr_response)
    def test_filter_nodes_uuids_in_solr_with_uuids(self):
        response_node_uuids = [
            'd2041706-ad2e-4f5b-a6ac-2122fe2a9751',
            '57d2b371-a364-4806-b7ee-366a722ca9f4',
            'c9d7f81f-2274-4179-ad00-28227bf4b9b7',
            'e082ce03-0a83-4162-af5c-7472e450d7d0',
            '880e60f7-7036-4468-b9c8-fdeebe7c21c3',
            '945aaca7-dc58-47b8-8012-e9821249ca7a',
            '2b939cb3-5b40-48c2-8df7-e5472c3bdcca',
            'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'
        ]
        response = filter_nodes_uuids_in_solr(self.valid_uuid, self.node_uuids)
        self.assertItemsEqual(response, response_node_uuids)

    @mock.patch("data_set_manager.utils.generate_solr_params_for_assay",
                fake_generate_solr_params)
    @mock.patch("data_set_manager.utils.search_solr", fake_search_solr)
    @mock.patch("data_set_manager.utils.format_solr_response",
                fake_format_solr_response)
    def test_filter_nodes_uuids_in_solr_no_uuids(self):
        response_node_uuids = [
            '1a50204d-49fa-4082-a708-26ee93fb0f86',
            '32e977fc-b906-4315-b6ed-6a644d173492',
            '910117c5-fda2-4700-ae87-dc897f3a5d85',
            'd2041706-ad2e-4f5b-a6ac-2122fe2a9751',
            '57d2b371-a364-4806-b7ee-366a722ca9f4',
            'c9d7f81f-2274-4179-ad00-28227bf4b9b7',
            'e082ce03-0a83-4162-af5c-7472e450d7d0',
            '880e60f7-7036-4468-b9c8-fdeebe7c21c3',
            '945aaca7-dc58-47b8-8012-e9821249ca7a',
            '2b939cb3-5b40-48c2-8df7-e5472c3bdcca',
            'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'
        ]
        response = filter_nodes_uuids_in_solr(self.valid_uuid, [])
        self.assertItemsEqual(response, response_node_uuids)

    def test_move_obj_to_front_valid(self):
        nodes_list = [
            {
                'uuid': 'b55c3f8b-693b-4918-861b-c3e9268ec597',
                'name': 'Test Node Group'
            },
            {
                'uuid': 'c18d7a3d-f54a-42ae-9a30-37f631fa7e73',
                'name': 'Completement Nodes 2'
            },
            {
                'uuid': '22b3dc7e-bcbd-4dfc-bccb-db72b02b4d0e',
                'name': 'Current Selection'
            },
            {
                'uuid': '0c6dc0e6-1a79-427d-b7a8-1b4f4c422755',
                'name': 'Another NodeGroup'
            },
        ]
        response_arr = nodes_list
        self.assertNotEqual(response_arr[0].get('name'),
                            nodes_list[2].get('name'))
        # Should move current selection node to front
        response_arr = move_obj_to_front(nodes_list, 'name', 'Current '
                                                             'Selection')
        self.assertEqual(response_arr[0].get('name'),
                         nodes_list[0].get('name'))
        # Should leave leading node in front
        response_arr = move_obj_to_front(nodes_list, 'name', 'Current '
                                                             'Selection')
        self.assertEqual(response_arr[0].get('name'),
                         nodes_list[0].get('name'))

    def test_move_obj_to_front_missing_prop(self):
        # Method does not throw errors if obj is missing prop_key
        nodes_list = [
            {
                'uuid': 'b55c3f8b-693b-4918-861b-c3e9268ec597',
            },
            {
                'uuid': 'c18d7a3d-f54a-42ae-9a30-37f631fa7e73',
            },
            {
                'uuid': '22b3dc7e-bcbd-4dfc-bccb-db72b02b4d0e',
                'name': 'Another NodeGroup'
            },
            {
                'uuid': '0c6dc0e6-1a79-427d-b7a8-1b4f4c422755',
                'name': 'Current Selection'
            },
        ]
        response_arr = nodes_list
        self.assertNotEqual(response_arr[0].get('name'),
                            nodes_list[3].get('name'))
        # Should move current selection node to front
        response_arr = move_obj_to_front(nodes_list, 'name', 'Current '
                                                             'Selection')
        self.assertEqual(response_arr[0].get('name'),
                         nodes_list[0].get('name'))

    def test_which_default_read_perm_for_dataset(self):
        self.assertEqual(which_default_read_perm('dataset'),
                         'core.read_meta_dataset')

    def test_which_default_read_perm_for_analysis(self):
        self.assertEqual(which_default_read_perm('analysis'),
                         'core.read_analysis')


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

    def test_neo4j_called_on_post_save(self):
        with mock.patch(
            "core.models.async_update_annotation_sets_neo4j"
        ) as neo4j_mock:
            self.isa_tab_dataset.save()
            self.assertTrue(neo4j_mock.called)

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

    def test_is_clean_if_dataset_has_visualizations(self):
        tool = create_tool_with_necessary_models("VISUALIZATION")
        self.assertFalse(tool.dataset.is_clean())


class CoreIndexTests(TestCase):
    def setUp(self):
        self.dataset_index = DataSetIndex()
        self.good_dataset = create_dataset_with_necessary_models()
        self.bad_dataset = DataSet.objects.create()

    def test_prepare(self):
        data = self.dataset_index.prepare(self.good_dataset)
        self.assertRegexpMatches(
            data['text'],
            re.compile(
                r'AnnotatedNode-\d.*AnnotatedNode-\d',
                re.DOTALL
            )
        )

    def test_prepare_submitter(self):
        contact = Contact.objects.create(
            collection=self.good_dataset.get_investigation(),
            first_name="Scott",
            last_name="Ouellette"
        )
        # Create an identical contact to ensure we prepare a unique list of
        # submitters
        Contact.objects.create(
            collection=self.good_dataset.get_investigation(),
            first_name="Scott",
            last_name="Ouellette"
        )
        self.good_dataset.save()

        prepared_submitters = self.dataset_index.prepare_submitter(
            self.good_dataset
        )

        self.assertEqual(
            prepared_submitters,
            [u"{}, {}".format(contact.last_name, contact.first_name)]
        )

    def test_prepare_submitter_funky_contact(self):
        contact = Contact.objects.create(
            collection=self.good_dataset.get_investigation(),
            first_name=u'Sc\xd6tt',
            last_name=u'\xd6uellette'
        )
        self.good_dataset.save()

        prepared_submitters = self.dataset_index.prepare_submitter(
            self.good_dataset
        )
        self.assertEqual(
            prepared_submitters,
            [u"{}, {}".format(contact.last_name, contact.first_name)]
        )

    def test_prepare_description_bad_dataset(self):
        prepared_description = self.dataset_index.prepare_description(
            self.bad_dataset
        )
        self.assertEqual(prepared_description, "")

    def test_prepare_description_good_dataset(self):
        prepared_description = self.dataset_index.prepare_description(
            self.good_dataset
        )
        self.assertEqual(
            prepared_description,
            self.good_dataset.get_investigation().get_description()
        )


class TestMigrations(TestCase):
    """
    Useful test class for testing Django Data migrations

    From https://www.caktusgroup.com/blog/2016/02/02/
    writing-unit-tests-django-migrations/
    """
    @property
    def app(self):
        return apps.get_containing_app_config(type(self).__module__).name

    migrate_from = None
    migrate_to = None

    def setUp(self):
        assert self.migrate_from and self.migrate_to, \
            "TestCase '{}' must define migrate_from and migrate_to properties"\
            .format(type(self).__name__)
        self.migrate_from = [(self.app, self.migrate_from)]
        self.migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(self.migrate_from).apps

        # Reverse to the original migration
        executor.migrate(self.migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(self.migrate_to)

        self.apps = executor.loader.project_state(self.migrate_to).apps

    def setUpBeforeMigration(self, apps):
        pass


class TestManagementCommands(TestCase):
    def test_set_up_site_name(self):
        site_name = "Refinery Test"
        domain = "www.example.com"
        call_command('set_up_site_name', site_name, domain)

        self.assertIsNotNone(
            Site.objects.get(domain=domain, name=site_name)
        )

    def test_set_up_site_name_failure(self):
        with self.assertRaises(CommandError):
            call_command('set_up_site_name')

    def _user_in_public_group(self, user_instance):
        return bool(
            user_instance.groups.filter(
                name=ExtendedGroup.objects.public_group().name
            ).count()
        )

    def test_add_users_to_public_group(self):
        # We have a post-save hook on User for this functionality, but this
        # doesn't apply when we create the super/guest user with 'loaddata'
        # where save() is never actually called
        call_command("loaddata", "guest.json")
        user = User.objects.get(username="guest")
        self.assertFalse(self._user_in_public_group(user))

        call_command("add_users_to_public_group")
        self.assertTrue(self._user_in_public_group(user))

    def test_activate_user(self):
        guest_username = "guest"
        call_command("loaddata", "guest.json")
        user = User.objects.get(username=guest_username)
        self.assertFalse(user.is_active)

        call_command("activate_user", guest_username)
        self.assertTrue(User.objects.get(username=guest_username).is_active)

    def test_import_annotations(self):
        """ We just care about this in the context of the optparse -> argparse
        upgrade for Django 1.8 and don't necessarily want to test the
        neo4j interactions """
        with mock.patch.object(ImportAnnotationsCommand, "handle"):
            call_command("import_annotations", "-c")

    def test_create_workflow_engine(self):
        galaxy_instance = GalaxyInstanceFactory()
        call_command(
            "create_workflowengine",
            str(galaxy_instance.id),
            ExtendedGroup.objects.public_group().name
        )
        self.assertIsNotNone(
            WorkflowEngine.objects.get(instance=galaxy_instance)
        )

    def test_create_workflow_engine_bad_galaxy_instance(self):
        with self.assertRaises(CommandError):
            call_command(
                "create_workflowengine",
                str(123),
                ExtendedGroup.objects.public_group().name
            )

    def test_create_workflow_engine_bad_group_name(self):
        galaxy_instance = GalaxyInstanceFactory()
        with self.assertRaises(CommandError):
            call_command(
                "create_workflowengine",
                str(galaxy_instance.id),
                "non-existent group name"
            )


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


class EventTests(TestCase):

    def setUp(self):
        CuserMiddleware.set_user(User.objects.create_user('testuser'))
        self.pre_re = r'^\d{2}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}: testuser '
        self.post_re = r' data set Test DataSet - [0-9a-f-]+$'

    def test_data_set_create(self):
        create_dataset_with_necessary_models()
        events = Event.objects.all()
        self.assertEqual(len(events), 1)
        self.assertRegexpMatches(
            str(events[0]),
            self.pre_re + r'created data set Test DataSet - [0-9a-f-]+$'
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
            str(events[0]),
            self.pre_re + r'created' + self.post_re
        )
        self.assertRegexpMatches(
            str(events[1]),
            self.pre_re +
            r'launched analysis Test WORKFLOW Tool: [0-9a-f-]+ on' +
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
