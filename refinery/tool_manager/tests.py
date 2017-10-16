import StringIO
import ast
import json
import logging
import time
from urlparse import urljoin
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.http import HttpResponseBadRequest
from django.test import TestCase

import bioblend
from bioblend.galaxy.dataset_collections import (CollectionElement,
                                                 HistoryDatasetElement)
from bioblend.galaxy.histories import HistoryClient
from bioblend.galaxy.jobs import JobsClient
from bioblend.galaxy.libraries import LibraryClient
from bioblend.galaxy.workflows import WorkflowClient
import celery
from constants import UUID_RE
from django_docker_engine.docker_utils import DockerClientWrapper
from docker.errors import NotFound
import mock
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)
from test_data.galaxy_mocks import (galaxy_dataset_provenance_0,
                                    galaxy_dataset_provenance_1,
                                    galaxy_datasets_list,
                                    galaxy_datasets_list_same_output_names,
                                    galaxy_history_download_list,
                                    galaxy_history_download_list_same_names,
                                    galaxy_job_a, galaxy_job_b,
                                    galaxy_tool_data, galaxy_workflow_dict,
                                    galaxy_workflow_dict_collection,
                                    galaxy_workflow_invocation,
                                    galaxy_workflow_invocation_data,
                                    history_dataset_dict, history_dict,
                                    library_dataset_dict, library_dict)

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import (_get_galaxy_download_task_ids,
                                    _get_workflow_tool,
                                    _invoke_tool_based_galaxy_workflow,
                                    _refinery_file_import,
                                    _run_tool_based_galaxy_file_import,
                                    _run_tool_based_galaxy_workflow,
                                    _tool_based_galaxy_file_import,
                                    run_analysis)
from core.models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                         AnalysisNodeConnection, AnalysisResult, ExtendedGroup,
                         Project, Workflow, WorkflowEngine, WorkflowFilesDL)
from data_set_manager.models import Assay, Attribute, Node
from data_set_manager.utils import _create_solr_params_from_node_uuids
from factory_boy.django_model_factories import (AnnotatedNodeFactory,
                                                AttributeFactory, NodeFactory,
                                                ToolFactory)
from factory_boy.utils import create_dataset_with_necessary_models
from file_store.models import FileStoreItem
from galaxy_connector.models import Instance
from selenium_testing.utils import (MAX_WAIT, SeleniumTestBaseGeneric,
                                    wait_until_class_visible)
from tool_manager.tasks import django_docker_cleanup

from .models import (FileRelationship, GalaxyParameter, InputFile, Parameter,
                     Tool, ToolDefinition, VisualizationTool, WorkflowTool)
from .utils import (create_tool, create_tool_definition,
                    validate_tool_annotation,
                    validate_tool_launch_configuration,
                    validate_workflow_step_annotation)
from .views import ToolDefinitionsViewSet, ToolsViewSet

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "tool_manager/test_data"


class ToolManagerMocks(TestCase):
    def setUp(self):
        # Galaxy Dataset mocks
        self.galaxy_datasets_list_mock = mock.patch.object(
            HistoryClient, "show_matching_datasets",
            return_value=galaxy_datasets_list
        )
        self.galaxy_datasets_list_same_names_mock = mock.patch.object(
            HistoryClient, "show_matching_datasets",
            return_value=galaxy_datasets_list_same_output_names
        )

        # Galaxy History mocks
        self.history_upload_mock = mock.patch.object(
            HistoryClient, "upload_dataset_from_library",
            return_value=history_dataset_dict
        ).start()
        self.delete_history_mock = mock.patch.object(
            HistoryClient, "delete_history"
        ).start()
        self.show_dataset_provenance_mock = mock.patch.object(
            HistoryClient, "show_dataset_provenance"
        ).start()

        # Galaxy Job mocks
        self.show_job_mock = mock.patch.object(
            JobsClient, "show_job"
        ).start()

        # Galaxy Library mocks
        self.delete_library_mock = mock.patch.object(
            LibraryClient, "delete_library"
        ).start()
        self.library_upload_mock = mock.patch.object(
            LibraryClient, "upload_file_from_url",
            return_value=library_dataset_dict
        ).start()

        # Galaxy Workflow mocks
        self.delete_workflow_mock = mock.patch.object(
            WorkflowClient, "delete_workflow"
        ).start()
        self.invoke_workflow_mock = mock.patch.object(
            WorkflowClient, "invoke_workflow",
            return_value=galaxy_workflow_invocation_data
        ).start()
        self.galaxy_workflow_show_invocation_mock = mock.patch.object(
            WorkflowClient, "show_invocation",
            return_value=galaxy_workflow_invocation
        ).start()

        # analysis_manager mocks
        self.analysis_manager_taskset_result_mock = mock.patch(
            "analysis_manager.tasks.get_taskset_result",
            return_value=celery.result.TaskSetResult(str(uuid.uuid4()))
        ).start()

        # galaxy_connector mocks
        self.get_history_file_list_mock = mock.patch.object(
            Instance, "get_history_file_list",
            return_value=galaxy_history_download_list
        )
        self.get_history_file_list_same_names_mock = mock.patch.object(
            Instance, "get_history_file_list",
            return_value=galaxy_history_download_list_same_names
        )

        # tool_manager mocks
        self.get_taskset_result_mock = mock.patch(
            "tool_manager.models.get_taskset_result",
            return_value=celery.result.TaskSetResult(str(uuid.uuid4()))
        ).start()
        self.create_history_mock = mock.patch.object(
            WorkflowTool, "create_galaxy_history", return_value=history_dict
        ).start()
        self.create_library_mock = mock.patch.object(
            WorkflowTool, "create_galaxy_library", return_value=library_dict
        ).start()
        self.tool_data_mock = mock.patch.object(
            WorkflowTool, "_get_tool_data",
            return_value=galaxy_tool_data
        ).start()
        self.get_workflow_dict_mock = mock.patch.object(
                WorkflowTool, "_get_workflow_dict",
                return_value=galaxy_workflow_dict
        ).start()

        self.has_dataset_collection_input_mock_true = mock.patch.object(
            WorkflowTool, "_has_dataset_collection_input", return_value=True
        )
        self.has_dataset_collection_input_mock_false = mock.patch.object(
            WorkflowTool, "_has_dataset_collection_input", return_value=False
        )


class ToolManagerTestBase(ToolManagerMocks):
    # Some members in assertions are truncated if they are too long, but we
    # want to see them in their entirety
    maxDiff = None
    FAKE_DATASET_HISTORY_ID = "0dd7fa018f646963"
    GALAXY_ID_MOCK = "6fc9fbb81c497f69"

    def setUp(self):
        super(ToolManagerTestBase, self).setUp()

        self.public_group = ExtendedGroup.objects.public_group()
        self.galaxy_instance = Instance.objects.create(
            base_url="http://www.example.com/galaxy"
        )
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow_engine.set_manager_group(self.public_group.manager_group)

        self.dataset = create_dataset_with_necessary_models(create_nodes=False)

        self.study = self.dataset.get_latest_study()
        self.assay = Assay.objects.get(study=self.study)

        self.create_mock_file_relationships()

        test_file = StringIO.StringIO()
        test_file.write('Coffee is really great.\n')
        self.file_store_item = FileStoreItem.objects.create(
            source="http://www.example.com/test_file.txt"
        )

        self.node = Node.objects.create(
            name="Node {}".format(uuid.uuid4()),
            assay=self.assay,
            study=self.study,
            file_uuid=self.file_store_item.uuid
        )

        self.mock_vis_annotations_reference = (
            "tool_manager.management.commands.generate_tool_definitions"
            ".get_visualization_annotations_list"
        )

        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.user.save()
        self.user2 = User.objects.create_user("coffee_enjoyer", '',
                                              "coffeecoffee")
        self.user2.save()

        self.project = Project.objects.create(
            name="Catch-All Project",
            is_catch_all=True
        )
        self.project.set_owner(self.user)
        self.user.profile.catch_all_project = self.project
        self.user.profile.save()

        self.factory = APIRequestFactory()
        self.tools_view = ToolsViewSet.as_view(
            {
                'get': 'list',
                'post': 'create'
            }
        )
        self.tool_defs_view = ToolDefinitionsViewSet.as_view(
            {
                'get': 'list',
                'post': 'create'
            }
        )

        self.tools_url_root = '/api/v2/tools/'
        self.tool_defs_url_root = '/api/v2/tool_definitions/'

    def tearDown(self):
        # Trigger the pre_delete signal so that datafiles are purged
        FileStoreItem.objects.all().delete()

    def create_tool(self,
                    tool_type,
                    file_relationships=None,
                    annotation_file_name=None):

        if tool_type == ToolDefinition.WORKFLOW:
            self.create_workflow_tool_definition(
                annotation_file_name=annotation_file_name
            )
        elif tool_type == ToolDefinition.VISUALIZATION:
            self.create_vis_tool_definition(
                annotation_file_name=annotation_file_name
            )
        else:
            raise RuntimeError("Please provide a valid tool_type")

        if file_relationships is None:
            self.post_data = {
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                Tool.FILE_RELATIONSHIPS: "[{}]".format(self.node.uuid),
                ToolDefinition.PARAMETERS: {
                    galaxy_param.uuid: galaxy_param.default_value
                    for galaxy_param in GalaxyParameter.objects.all()
                    }
            }
        else:
            self.post_data = {
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                Tool.FILE_RELATIONSHIPS: file_relationships,
                ToolDefinition.PARAMETERS: {
                    galaxy_param.uuid: galaxy_param.default_value
                    for galaxy_param in GalaxyParameter.objects.all()
                }
            }

        self.post_request = self.factory.post(
            self.tools_url_root,
            data=self.post_data,
            format="json"
        )
        force_authenticate(self.post_request, self.user)

        # Mock the spinning up of containers
        if tool_type == ToolDefinition.VISUALIZATION:
            with mock.patch(
                "django_docker_engine.docker_utils.DockerClientWrapper.run"
            ) as run_mock:
                with mock.patch(
                    "tool_manager.models.get_solr_response_json"
                ):
                    self.post_response = self.tools_view(self.post_request)
                logger.debug(
                    "Visualization tool launch response: %s",
                    self.post_response.content
                )
                self.assertTrue(run_mock.called)

            self.tool = VisualizationTool.objects.get(
                tool_definition__uuid=self.td.uuid
            )

        # Mock the run_analysis task
        elif tool_type == ToolDefinition.WORKFLOW:
            with mock.patch.object(
                run_analysis, 'apply_async', side_effect=None
            ):
                self.post_response = self.tools_view(self.post_request)
                assert self.post_response.status_code == 200, \
                    self.post_response.content
                logger.debug(self.post_response.content)

            self.tool = WorkflowTool.objects.get(
                tool_definition__uuid=self.td.uuid
            )
            self._update_galaxy_file_mapping()
            self.tool.update_galaxy_data(
                self.tool.GALAXY_WORKFLOW_INVOCATION_DATA,
                {"id": self.GALAXY_ID_MOCK}
            )

        self.get_request = self.factory.get(self.tools_url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.tools_view(self.get_request)
        self.tool_json = self.get_response.data[0]
        self.delete_request = self.factory.delete(
                urljoin(self.tools_url_root, self.tool_json['uuid']))
        force_authenticate(self.delete_request, self.user)
        self.delete_response = self.tools_view(self.delete_request)
        self.put_request = self.factory.put(
                self.tools_url_root,
                data=self.tool_json,
                format="json"
        )
        force_authenticate(self.put_request, self.user)
        self.put_response = self.tools_view(self.put_request)
        self.options_request = self.factory.options(
                self.tools_url_root,
                data=self.tool_json,
                format="json"
        )
        force_authenticate(self.options_request, self.user)
        self.options_response = self.tools_view(self.options_request)

        return self.tool

    def create_vis_tool_definition(self, annotation_file_name=None):
        if annotation_file_name:
            self.tool_annotation = "{}/visualizations/{}".format(
                TEST_DATA_PATH,
                annotation_file_name
            )
        else:
            self.tool_annotation = "{}/visualizations/igv.json".format(
                TEST_DATA_PATH
            )
        with open(self.tool_annotation) as f:
            self.tool_annotation_json = json.loads(f.read())

        # Don't pull down images in tests
        with mock.patch(
            "django_docker_engine.docker_utils.DockerClientWrapper.pull",
            return_value=None
        ) as pull_mock:
            self.td = create_tool_definition(self.tool_annotation_json)
            self.assertTrue(pull_mock.called)

    def create_workflow_tool_definition(self, annotation_file_name=None):
        if annotation_file_name:
            self.tool_annotation = "{}/workflows/{}".format(
                TEST_DATA_PATH,
                annotation_file_name
            )
        else:
            self.tool_annotation = "{}/workflows/LIST.json".format(
                TEST_DATA_PATH
            )

        with open(self.tool_annotation) as f:
            self.tool_annotation_data = json.loads(f.read())
            self.tool_annotation_data["workflow_engine_uuid"] = (
                self.workflow_engine.uuid
            )
            self.td = create_tool_definition(self.tool_annotation_data)

    def create_mock_file_relationships(self):
        self.LIST_BASIC = "[{}]".format(self.make_node())
        self.LIST = "[{}, {}, {}, {}]".format(
            *[self.make_node() for i in range(0, 4)]
        )
        self.LIST_LIST = "[[{}, {}], [{}, {}]]".format(
            *[self.make_node() for i in range(0, 4)]
        )
        self.LIST_PAIR = "[({}, {}), ({}, {})]".format(
            *[self.make_node() for i in range(0, 4)]
        )
        self.PAIR = "({}, {})".format(*[self.make_node() for i in range(0, 2)])
        self.LIST_LIST_PAIR = "[[({}, {}), ({}, {})]]".format(
            *[self.make_node() for i in range(0, 4)]
        )
        self.PAIR_LIST = "([{}, {}], [{}, {}])".format(
            *[self.make_node() for i in range(0, 4)]
        )

    def make_node(self):
        test_file = StringIO.StringIO()

        test_file.write('Coffee is really great.\n')
        self.file_store_item = FileStoreItem.objects.create(
            source="http://www.example.com/test_file.txt"
        )

        node = NodeFactory(
            name="Node {}".format(uuid.uuid4()),
            assay=self.assay,
            study=self.study,
            type=Node.RAW_DATA_FILE,
            file_uuid=self.file_store_item.uuid
        )
        attribute = AttributeFactory(
            node=node,
            type=Attribute.CHARACTERISTICS,
            subtype='coffee',
            value='coffee'
        )
        AnnotatedNodeFactory(
            node_id=node.id,
            attribute_id=attribute.id,
            study=self.study,
            assay=self.assay,
            node_uuid=node.uuid,
            node_file_uuid=node.file_uuid,
            node_type=node.type,
            node_name=node.name,
            attribute_type=attribute.type,
            attribute_subtype=attribute.subtype,
            attribute_value=attribute.value,
        )
        return node.uuid

    def _update_galaxy_file_mapping(self):
        """
        Helper method to update a WorkflowTool's
        galaxy_to_refinery_mapping_list as it would be if we were
        interacting with an actual Galaxy instance
        """
        galaxy_to_refinery_mapping_list = []
        for node in self.tool._get_input_nodes():
            galaxy_to_refinery_mapping_list.append(
                {
                    WorkflowTool.GALAXY_DATASET_HISTORY_ID:
                        self.FAKE_DATASET_HISTORY_ID,
                    Tool.REFINERY_FILE_UUID: node.file_uuid,
                }
            )

        with mock.patch.object(
                celery.result.TaskSetResult,
                "join",
                return_value=galaxy_to_refinery_mapping_list
        ) as join_mock:
            self.tool.update_file_relationships_with_galaxy_history_data()
        self.assertTrue(join_mock.called)
        self.assertTrue(self.get_taskset_result_mock.called)

        self.collection_description = (
            self.tool._create_collection_description()
        )

    def test_create_valid_tool(self):
        with self.assertRaises(RuntimeError):
            self.create_tool("Coffee is not a valid tool type")


class ToolDefinitionAPITests(ToolManagerTestBase, APITestCase):
    def setUp(self):
        super(ToolDefinitionAPITests, self).setUp()

        # Make some sample data
        with open(
            "{}/visualizations/hello_world.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = json.loads(f.read())
            create_tool_definition(tool_annotation)
        with open("{}/workflows/LIST.json".format(TEST_DATA_PATH)) as f:
            tool_annotation = json.loads(f.read())
            tool_annotation["workflow_engine_uuid"] = self.workflow_engine.uuid
            create_tool_definition(tool_annotation)
        with open("{}/workflows/LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            tool_annotation = json.loads(f.read())
            tool_annotation["workflow_engine_uuid"] = self.workflow_engine.uuid
            create_tool_definition(tool_annotation)
        with open(
            "{}/workflows/LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = json.loads(f.read())
            tool_annotation["workflow_engine_uuid"] = self.workflow_engine.uuid
            create_tool_definition(tool_annotation)

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.tool_defs_url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.tool_defs_view(self.get_request)

        self.tool_json = self.get_response.data[0]

        self.delete_request = self.factory.delete(
            urljoin(self.tool_defs_url_root, self.tool_json['uuid']))
        force_authenticate(self.delete_request, self.user)
        self.delete_response = self.tool_defs_view(self.delete_request)
        self.put_request = self.factory.put(
            self.tool_defs_url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.put_request, self.user)
        self.put_response = self.tool_defs_view(self.put_request)
        self.post_request = self.factory.post(
            self.tool_defs_url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.tool_defs_view(self.post_request)
        self.options_request = self.factory.options(
            self.tool_defs_url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.options_request, self.user)
        self.options_response = self.tool_defs_view(self.options_request)

    def test_tool_definitions_exist(self):
        self.assertEqual(ToolDefinition.objects.count(), 4)
        self.assertEqual(
            ToolDefinition.objects.filter(
                tool_type=ToolDefinition.WORKFLOW
            ).count(),
            3
        )
        self.assertEqual(
            ToolDefinition.objects.filter(
                tool_type=ToolDefinition.VISUALIZATION
            ).count(),
            1
        )

    def test_get_request_authenticated(self):
        self.assertIsNotNone(self.get_response)

    def test_get_request_no_auth(self):
        self.get_request = self.factory.get(self.tool_defs_url_root)
        self.get_response = self.tool_defs_view(self.get_request)
        self.assertEqual(self.get_response.status_code, 403)

    def test_unallowed_http_verbs(self):
        self.assertEqual(
            self.put_response.data['detail'], 'Method "PUT" not allowed.')
        self.assertEqual(
            self.post_response.data['detail'], 'Method "POST" not allowed.')
        self.assertEqual(
            self.options_response.data['detail'], 'Method "OPTIONS" not '
                                                  'allowed.')
        self.assertEqual(
            self.delete_response.data['detail'], 'Method "DELETE" not '
                                                 'allowed.')

    def test_for_proper_parameters_in_response(self):
        """ToolDefinitions for Workflows will have an extra field on their
         parameter objects
        """
        for tool_definition in self.get_response.data:
            for parameter in tool_definition[ToolDefinition.PARAMETERS]:
                if tool_definition["tool_type"] == ToolDefinition.WORKFLOW:
                    self.assertIn("galaxy_workflow_step", parameter.keys())
                elif (tool_definition["tool_type"] ==
                      ToolDefinition.VISUALIZATION):
                    self.assertNotIn("galaxy_workflow_step", parameter.keys())


class ToolDefinitionGenerationTests(ToolManagerTestBase):
    def test_tool_definition_model_str(self):
        with open("{}/visualizations/igv.json".format(TEST_DATA_PATH)) as f:
            tool_annotation = [json.loads(f.read())]

        with mock.patch(
                self.mock_vis_annotations_reference,
                return_value=tool_annotation
        ) as mocked_method:
            call_command("generate_tool_definitions", visualizations=True)

            self.assertTrue(mocked_method.called)

        td = ToolDefinition.objects.all()[0]
        self.assertEqual(
            td.__str__(),
            "VISUALIZATION: Test LIST Visualization IGV {}".format(
                td.uuid
            )
        )

    def test_workflow_improperly_annotated(self):
        with open(
                "{}/workflows/annotation_invalid.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_with_bad_nesting(self):
        with open(
            "{}/workflows/annotation_bad_nesting.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_with_good_parameters_validation(self):
        with open(
            "{}/workflows/annotation_valid_parameters.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_visualization_tool_def_validation(self):
        with open(
            "{}/visualizations/hello_world.json".format(TEST_DATA_PATH)
        ) as f:
            visualization_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(visualization_annotation)
            )

    def test_list_visualization_tool_def_generation(self):
        self.create_vis_tool_definition()

        self.assertEqual(ToolDefinition.objects.count(), 1)

        self.assertEqual(self.td.parameters.count(), 1)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(self.td.file_relationship.input_files.count(), 1)

    def test_list_workflow_tool_def_validation(self):
        with open("{}/workflows/LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition()

        self.assertEqual(ToolDefinition.objects.count(), 1)

        self.assertEqual(self.td.parameters.count(), 7)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(self.td.file_relationship.input_files.count(), 1)
        self.assertIsNotNone(self.td.workflow)

    def test_list_pair_workflow_tool_def_validation(self):
        with open("{}/workflows/LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(validate_tool_annotation(workflow_annotation))

    def test_list_pair_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR.json"
        )

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(self.td.parameters.count(), 6)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            1
        )
        second_nested_file_relationship = \
            self.td.file_relationship.file_relationship.all()[0]
        self.assertEqual(
            second_nested_file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(
            second_nested_file_relationship.input_files.count(),
            2
        )
        self.assertIsNotNone(self.td.workflow)

    def test_list_list_pair_workflow_tool_def_validation(self):
        with open(
            "{}/workflows/LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_list_pair_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:LIST:PAIR.json"
        )
        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(self.td.parameters.count(), 3)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            1
        )
        second_nested_file_relationship = \
            self.td.file_relationship.file_relationship.all()[0]
        self.assertEqual(
            second_nested_file_relationship.file_relationship.count(),
            1
        )
        third_nested_file_relationship = \
            second_nested_file_relationship.file_relationship.all()[0]
        self.assertEqual(
            third_nested_file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(
            third_nested_file_relationship.input_files.count(),
            2
        )
        self.assertIsNotNone(self.td.workflow)

    def test_list_pair_list_workflow_tool_def_validation(self):
        with open(
                "{}/workflows/LIST:PAIR:LIST.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_pair_list_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR:LIST.json"
        )

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(self.td.parameters.count(), 3)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            1
        )
        self.assertEqual(
            self.td.file_relationship.value_type,
            FileRelationship.LIST
        )
        second_nested_file_relationship = \
            self.td.file_relationship.file_relationship.all()[0]
        self.assertEqual(
            second_nested_file_relationship.value_type,
            FileRelationship.PAIR
        )
        self.assertEqual(
            second_nested_file_relationship.file_relationship.count(), 1)
        third_nested_file_relationship = \
            second_nested_file_relationship.file_relationship.all()[0]
        self.assertEqual(
            third_nested_file_relationship.value_type,
            FileRelationship.LIST
        )
        self.assertEqual(
            third_nested_file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(
            third_nested_file_relationship.input_files.count(),
            1
        )
        self.assertIsNotNone(self.td.workflow)

    def test_list_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition()
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_list_pair_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR.json"
        )
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_list_list_pair_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:LIST:PAIR.json"
        )
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_list_pair_list_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR:LIST.json"
        )
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_deletion_of_a_respective_tooldefinitions_objects_only(self):
        with open(
            "{}/workflows/LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td1 = ToolDefinition.objects.get(name=workflow_annotation["name"])
        with open("{}/workflows/LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td2 = ToolDefinition.objects.get(name=workflow_annotation["name"])
        with open("{}/workflows/LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td3 = ToolDefinition.objects.get(name=workflow_annotation["name"])

        td1.delete()

        self.assertEqual(ToolDefinition.objects.count(), 2)
        self.assertEqual(FileRelationship.objects.count(), 3)
        self.assertEqual(GalaxyParameter.objects.count(), 13)
        self.assertEqual(Parameter.objects.count(), 13)
        self.assertEqual(InputFile.objects.count(), 3)

        td2.delete()

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(FileRelationship.objects.count(), 1)
        self.assertEqual(GalaxyParameter.objects.count(), 7)
        self.assertEqual(Parameter.objects.count(), 7)
        self.assertEqual(InputFile.objects.count(), 1)

        td3.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_valid_workflow_step_annotations_a(self):
        with open(
            "{}/workflows/step_annotation_valid_a.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(
                    workflow_step_annotation
                )
            )

    def test_valid_workflow_step_annotations_b(self):
        with open(
            "{}/workflows/step_annotation_valid_b.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(
                    workflow_step_annotation
                )
            )

    def test_valid_workflow_step_annotations_c(self):
        with open(
            "{}/workflows/step_annotation_valid_c.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(workflow_step_annotation)
            )

    def test_invalid_workflow_step_annotation_b(self):
        with open(
            "{}/workflows/step_annotation_invalid_b.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
            )

    def test_invalid_workflow_step_annotation_c(self):
        with open(
            "{}/workflows/step_annotation_invalid_c.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
            )

    def test_generate_tool_definitions_management_command(self):
        invalid_workflows = json.loads(
            open(
                "{}/workflows/galaxy_workflows_invalid.json".format(
                    TEST_DATA_PATH
                )
            ).read()
        )
        valid_workflows = json.loads(
            open(
                "{}/workflows/galaxy_workflows_valid.json".format(
                    TEST_DATA_PATH
                )
            ).read()
        )

        with mock.patch(
            "tool_manager.utils.get_workflows",
            side_effect=[
                {self.workflow_engine.uuid: invalid_workflows},
                {self.workflow_engine.uuid: valid_workflows}
            ]
        ) as get_wf_mock:
            self.assertRaises(
                CommandError,
                call_command,
                "generate_tool_definitions",
                workflows=True
            )

            self.assertEqual(ToolDefinition.objects.count(), 0)
            with open(
                "{}/visualizations/igv.json".format(TEST_DATA_PATH)
            ) as f:
                tool_annotation = [json.loads(f.read())]

            with mock.patch(
                self.mock_vis_annotations_reference,
                return_value=tool_annotation
            ) as get_vis_list_mock:
                call_command("generate_tool_definitions")

                self.assertEqual(get_wf_mock.call_count, 2)
                self.assertEqual(get_vis_list_mock.call_count, 1)
                self.assertEqual(ToolDefinition.objects.count(), 4)
                self.assertEqual(FileRelationship.objects.count(), 7)
                self.assertEqual(GalaxyParameter.objects.count(), 9)
                self.assertEqual(Parameter.objects.count(), 10)
                self.assertEqual(InputFile.objects.count(), 6)

    def test_workflow_pair_too_many_inputs(self):
        with open(
            "{}/workflows/PAIR_too_many_inputs.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_pair_not_enough_inputs(self):
        with open(
            "{}/workflows/PAIR_not_enough_inputs.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_list_not_enough_inputs(self):
        with open(
            "{}/workflows/LIST_not_enough_inputs.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_visualization_annotation_extra_dirs_valid(self):
        with open(
            "{}/visualizations/LIST_visualization_good_extra_directories.json"
            .format(TEST_DATA_PATH)
        ) as f:
            visualization_annotation = json.loads(f.read())
            create_tool_definition(visualization_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 1)

    def test_visualization_annotation_extra_dirs_invalid(self):
        with open("{}/visualizations/"
                  "LIST_visualization_bad_extra_directories_structure.json"
                  .format(TEST_DATA_PATH)) as f:
            visualization_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                visualization_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_visualization_annotation_extra_dirs_missing(self):
        with open("{}/visualizations/"
                  "LIST_visualization_missing_extra_directories.json"
                  .format(TEST_DATA_PATH)) as f:
            visualization_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                visualization_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)


class ToolDefinitionTests(ToolManagerTestBase):
    def test_get_annotation(self):
        self.create_vis_tool_definition(annotation_file_name="igv.json")
        self.assertEqual(self.td.get_annotation(),
                         self.tool_annotation_json["annotation"])

    def test_get_extra_directories_vis_tool_def(self):
        self.create_vis_tool_definition()
        self.assertEqual(
            self.td.get_extra_directories(),
            ["/refinery-data"]
        )

    def test_get_extra_directories_workflow_tool_def(self):
        self.create_workflow_tool_definition()
        with self.assertRaises(NotImplementedError):
            self.td.get_extra_directories()

    def test_related_workflow_inactive_after_deletion(self):
        self.create_workflow_tool_definition()
        self.assertTrue(self.td.workflow.is_active)
        self.td.delete()
        self.assertFalse(
            Workflow.objects.all()[0].is_active
        )


class ToolTests(ToolManagerTestBase):
    def test_tool_model_str(self):
        self.create_tool(ToolDefinition.VISUALIZATION)

        tool = Tool.objects.get(
            tool_definition__uuid=self.td.uuid
        )
        self.assertEqual(
            tool.__str__(),
            "Tool: Test LIST Visualization IGV"
        )

    def test_tool_container_removed_on_deletion(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        with mock.patch(
            "django_docker_engine.docker_utils.DockerClientWrapper"
            ".purge_by_label"
        ) as purge_mock:
            Tool.objects.get(tool_definition__uuid=self.td.uuid).delete()
            self.assertTrue(purge_mock.called)

    def test_node_uuids_get_populated_with_urls(self):
        vis_tool = self.create_tool(
            ToolDefinition.VISUALIZATION,
            file_relationships=self.LIST
        )
        file_relationships = vis_tool.get_file_relationships_urls()

        for url in file_relationships:
            self.assertIn("test_file.txt", url)

    def test_get_file_relationships_urls(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            self.tool.get_file_relationships_urls(),
            ['http://www.example.com/test_file.txt']
        )

    def test_update_galaxy_data(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.update_galaxy_data("test", "data")
        self.tool.update_galaxy_data("more", "data")
        self.assertEqual(
            self.tool.get_galaxy_dict(),
            {
                WorkflowTool.FILE_RELATIONSHIPS_GALAXY: (
                    unicode(
                        self.tool.get_galaxy_file_relationships()
                    ).replace("'", '"')
                ),
                WorkflowTool.GALAXY_TO_REFINERY_MAPPING_LIST: [
                    {
                        self.tool.GALAXY_DATASET_HISTORY_ID:
                            self.FAKE_DATASET_HISTORY_ID,
                        self.tool.REFINERY_FILE_UUID: self.node.file_uuid,
                        WorkflowTool.ANALYSIS_GROUP: 0
                    }
                ],
                WorkflowTool.GALAXY_WORKFLOW_INVOCATION_DATA: {
                    "id": self.GALAXY_ID_MOCK
                },
                "test": "data",
                "more": "data"
            }
        )

    def test_creating_vis_tool_doesnt_set_tool_launch_config_galaxy_data(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        with self.assertRaises(KeyError):
            self.tool.get_tool_launch_config()[WorkflowTool.GALAXY_DATA]

    def test_set_analysis_bad_uuid(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        with self.assertRaises(RuntimeError):
            self.tool.set_analysis(str(uuid.uuid4()))

    def test_tool_launch_method_raises_error_when_not_overridden(self):
        self.create_workflow_tool_definition()
        tool = ToolFactory(
            dataset=self.dataset,
            tool_definition=self.td
        )
        with self.assertRaises(NotImplementedError) as context:
            tool.launch()

        self.assertEqual(context.exception.message, tool.LAUNCH_WARNING)


class VisualizationToolTests(ToolManagerTestBase):
    def setUp(self):
        super(VisualizationToolTests, self).setUp()
        self.visualization_tool = self.create_tool(
            ToolDefinition.VISUALIZATION,
            file_relationships=self.LIST
        )

        self.search_solr_mock = mock.patch(
            "data_set_manager.utils.search_solr",
            return_value=json.dumps({
                "responseHeader": {
                    "status": 0,
                    "QTime": 36,
                    "params": (
                        _create_solr_params_from_node_uuids(
                            self.tool.get_input_node_uuids()
                        )
                    )
                },
                "response": {
                    "numFound": len(self.tool._get_input_nodes()),
                    "start": 0,
                    "docs": [
                        {
                            "uuid": node.uuid,
                            "name": node.name,
                            "type": node.type,
                            "file_uuid": node.file_uuid,
                            "organism_Characteristics_generic_s":
                                "Mus musculus",
                        } for node in self.tool._get_input_nodes()
                    ]
                }
            })
        ).start()

    def test_get_detailed_input_nodes_dict(self):
        input_nodes_meta_info = self.tool._get_detailed_input_nodes_dict()
        self.assertEqual(
            input_nodes_meta_info,
            {
                node.uuid: {
                    'file_url': (
                        self.node.get_file_store_item().get_datafile_url()
                    ),
                    VisualizationTool.NODE_SOLR_INFO: {
                        "uuid": node.uuid,
                        "name": node.name,
                        "type": node.type,
                        "file_uuid": node.file_uuid,
                        "organism_Characteristics_generic_s": "Mus musculus",
                    }
                } for node in self.tool._get_input_nodes()
            }
        )
        self.assertTrue(self.search_solr_mock.called)

    def test__create_input_dict(self):
        tool_input_dict = self.tool._create_container_input_dict()
        file_relationships = self.tool.get_file_relationships_urls()

        self.assertEqual(
            tool_input_dict,
            {
                Tool.FILE_RELATIONSHIPS: file_relationships,
                VisualizationTool.NODE_INFORMATION:
                    self.tool._get_detailed_input_nodes_dict(),
            }
        )


class WorkflowToolTests(ToolManagerTestBase):
    def setUp(self):
        super(WorkflowToolTests, self).setUp()
        self.show_dataset_provenance_side_effect = [
            galaxy_dataset_provenance_0, galaxy_dataset_provenance_0,
            galaxy_dataset_provenance_1, galaxy_dataset_provenance_1
        ]
        self.show_job_side_effect = [galaxy_job_a, galaxy_job_a,
                                     galaxy_job_b, galaxy_job_b]

    def _assert_analysis_node_connection_outputs_validity(self):
        input_connection = AnalysisNodeConnection.objects.filter(
            analysis=self.tool.analysis,
            direction=INPUT_CONNECTION
        )[0]
        assay = input_connection.node.assay
        study = input_connection.node.study
        output_connections = AnalysisNodeConnection.objects.filter(
            analysis=self.tool.analysis,
            direction=OUTPUT_CONNECTION
        )
        self.assertGreater(output_connections.count(), 0)
        for output_connection in output_connections:
            self.assertEqual(output_connection.node.study, study)
            self.assertEqual(output_connection.node.assay, assay)
            self.assertEqual(output_connection.node.name,
                             output_connection.name)
            self.assertEqual(output_connection.node.analysis_uuid,
                             self.tool.analysis.uuid)
            self.assertEqual(output_connection.node.subanalysis,
                             output_connection.subanalysis)
            self.assertEqual(output_connection.node.workflow_output,
                             output_connection.name)

    def test_list_dataset_collection_description_creation(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_BASIC
        )
        self.assertEqual(
            self.collection_description.type,
            WorkflowTool.LIST
        )
        self.assertEqual(
            len(self.collection_description.elements),
            1
        )
        for element in self.collection_description.elements:
            self.assertEqual(
                type(element),
                HistoryDatasetElement
            )

    def test_list_pair_dataset_collection_description_creation(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_PAIR
        )
        self.assertEqual(
            self.collection_description.type,
            "{}:{}".format(WorkflowTool.LIST, WorkflowTool.PAIRED)
        )
        self.assertEqual(
            len(self.collection_description.elements),
            2
        )
        for element in self.collection_description.elements:
            self.assertEqual(type(element), CollectionElement)
            self.assertEqual(element.type, WorkflowTool.PAIRED)
            self.assertEqual(len(element.elements), 2)

            for el in element.elements:
                self.assertEqual(type(el), HistoryDatasetElement)

            self.assertEqual(
                element.elements[0].to_dict()["name"],
                WorkflowTool.FORWARD
            )
            self.assertEqual(
                element.elements[1].to_dict()["name"],
                WorkflowTool.REVERSE
            )

    def test_paired_dataset_collection_creation(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.PAIR
        )
        self.assertEqual(
            self.collection_description.type,
            WorkflowTool.PAIRED
        )
        self.assertEqual(len(self.collection_description.elements), 2)

        for element in self.collection_description.elements:
            self.assertEqual(type(element), HistoryDatasetElement)

        self.assertEqual(
            self.collection_description.elements[0].to_dict()["name"],
            WorkflowTool.FORWARD
        )
        self.assertEqual(
            self.collection_description.elements[1].to_dict()["name"],
            WorkflowTool.REVERSE
        )

    def test_paired_list_dataset_collection_description_creation(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.PAIR_LIST
        )
        self.assertEqual(
            self.collection_description.type,
            "{}:{}".format(WorkflowTool.PAIRED, WorkflowTool.LIST)
        )

        self.assertEqual(len(self.collection_description.elements), 2)
        for element in self.collection_description.elements:
            self.assertEqual(type(element), CollectionElement)
            self.assertEqual(element.type, WorkflowTool.LIST)
            for el in element.elements:
                self.assertEqual(type(el), HistoryDatasetElement)

    def test_list_list_paired_dataset_collection_creation(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_LIST_PAIR
        )
        self.assertEqual(
            self.collection_description.type,
            "{}:{}:{}".format(
                WorkflowTool.LIST,
                WorkflowTool.LIST,
                WorkflowTool.PAIRED
            )
        )

        self.assertEqual(len(self.collection_description.elements), 1)
        for element in self.collection_description.elements:
            self.assertEqual(type(element), CollectionElement)
            self.assertEqual(element.type, WorkflowTool.LIST)
            self.assertEqual(len(element.elements), 2)
            for el in element.elements:
                self.assertEqual(el.type, WorkflowTool.PAIRED)
                self.assertEqual(len(element.elements), 2)

                for thing in el.elements:
                    self.assertEqual(type(thing), HistoryDatasetElement)

                self.assertEqual(
                    el.elements[0].to_dict()["name"],
                    WorkflowTool.FORWARD
                )
                self.assertEqual(
                    el.elements[1].to_dict()["name"],
                    WorkflowTool.REVERSE
                )

    def test_galaxy_collection_type_pair(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.PAIR
        )
        self.assertEqual(
            self.tool.galaxy_collection_type,
            WorkflowTool.PAIRED
        )

    def test_galaxy_collection_type_list_pair(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_PAIR
        )
        self.assertEqual(
            self.tool.galaxy_collection_type,
            "{}:{}".format(
                WorkflowTool.LIST,
                WorkflowTool.PAIRED
            )
        )

    def test_galaxy_collection_type_pair_list(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.PAIR_LIST
        )
        self.assertEqual(
            self.tool.galaxy_collection_type,
            "{}:{}".format(
                WorkflowTool.PAIRED,
                WorkflowTool.LIST
            )
        )

    def test_galaxy_collection_type_list_list_pair(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_LIST_PAIR
        )
        self.assertEqual(
            self.tool.galaxy_collection_type,
            "{}:{}:{}".format(
                WorkflowTool.LIST,
                WorkflowTool.LIST,
                WorkflowTool.PAIRED
            )
        )

    def test_galaxy_collection_type_list(self):
        self.create_tool(
            ToolDefinition.WORKFLOW
        )
        self.assertEqual(
            self.tool.galaxy_collection_type,
            WorkflowTool.LIST
        )

    def test_galaxy_history_id(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.update_galaxy_data(
            WorkflowTool.GALAXY_IMPORT_HISTORY_DICT,
            {"id": "COFFEE"}
        )

        self.assertEqual(self.tool.galaxy_import_history_id, "COFFEE")

    def test_analysis_node_connections_are_created_for_all_input_nodes(self):
        self.has_dataset_collection_input_mock_true.start()
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_LIST_PAIR
        )
        tool_nodes = self.tool._get_input_nodes()
        analysis_node_connections = [
            AnalysisNodeConnection.objects.get(
                node=node,
                analysis=self.tool.analysis
            )
            for node in tool_nodes
        ]
        self.assertEqual(len(analysis_node_connections), len(tool_nodes))
        for analysis_node_connection in analysis_node_connections:
            file_store_item = (
                analysis_node_connection.node.get_file_store_item()
            )
            self.assertEqual(
                analysis_node_connection.direction,
                INPUT_CONNECTION
            )
            self.assertEqual(
                analysis_node_connection.filename,
                WorkflowTool.INPUT_DATASET_COLLECTION
            )
            self.assertEqual(analysis_node_connection.step, 0)
            self.assertEqual(
                analysis_node_connection.name,
                file_store_item.datafile.name
            )

    def test_galaxy_parameter_dict_creation(self):
        self.create_tool(
            ToolDefinition.WORKFLOW,
            annotation_file_name="LIST:PAIR.json"
        )
        parameters_dict = self.tool._create_workflow_parameters_dict()

        self.assertEqual(parameters_dict[1]["Integer Param"], 1337)
        self.assertEqual(parameters_dict[7]["Float Param"], 1.234)
        self.assertEqual(parameters_dict[1]["String Param"], "Coffee is great")
        self.assertEqual(parameters_dict[2]["Boolean Param"], True)
        self.assertEqual(parameters_dict[4]["Attribute Param"], "Species")
        self.assertEqual(parameters_dict[5]["File Param"],
                         "/media/file_store/file.cool")

        self.assertTrue(self.tool_data_mock.called)

    def test_get_input_file_uuid_list_returns_proper_information(self):
        self.create_tool(ToolDefinition.WORKFLOW,
                         file_relationships=self.LIST_LIST_PAIR)

        self.assertEqual(
            len(self.tool.get_input_file_uuid_list()),
            4
        )

        for file_store_item_uuid in self.tool.get_input_file_uuid_list():
            FileStoreItem.objects.get(uuid=file_store_item_uuid)

    def test_galaxy_workflow_history_id(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            self.tool.galaxy_workflow_history_id,
            self.tool.analysis.history_id
        )

    def test__create_workflow_inputs_dict(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.update_galaxy_data(
            self.tool.COLLECTION_INFO,
            {
                "id": "coffee"
            }
        )
        self.assertEqual(
            self.tool._create_workflow_inputs_dict(),
            {
                '0': {
                    'id': 'coffee',
                    'src': self.tool.HISTORY_DATASET_COLLECTION_ASSOCIATION
                }
            }
        )

    def test_create_workflow_file_downloads(self):
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.get_history_file_list_same_names_mock.start()
        self.show_job_mock.side_effect = self.show_job_side_effect
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.create_workflow_file_downloads()
        self.assertEqual(WorkflowFilesDL.objects.count(), 2)
        for workflow_file_dl in WorkflowFilesDL.objects.all():
            self.assertTrue(workflow_file_dl.filename.startswith(
                "Refinery test tool"
            ))
            self.assertTrue(workflow_file_dl.filename.endswith(".txt"))
        self.assertTrue(self.galaxy_workflow_show_invocation_mock.called)
        self.assertTrue(galaxy_datasets_list_mock.called)

    def test_create_workflow_file_downloads_same_names(self):
        galaxy_datasets_list_mock = (
            self.galaxy_datasets_list_same_names_mock.start()
        )
        self.get_history_file_list_mock.start()
        self.show_job_mock.side_effect = self.show_job_side_effect
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.create_workflow_file_downloads()
        self.assertEqual(WorkflowFilesDL.objects.count(), 2)
        for workflow_file_dl in WorkflowFilesDL.objects.all():
            logger.debug(workflow_file_dl.filename)
            self.assertEqual(workflow_file_dl.filename, "Output file.txt")
        self.assertTrue(self.galaxy_workflow_show_invocation_mock.called)
        self.assertTrue(galaxy_datasets_list_mock.called)

    def test__get_galaxy_dataset_filename(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        for galaxy_dataset in self.tool._get_galaxy_history_dataset_list():
            self.tool._get_galaxy_dataset_filename(galaxy_dataset)
        self.assertTrue(galaxy_datasets_list_mock.called)

    def test__get_galaxy_datasets_list(self):
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.create_tool(ToolDefinition.WORKFLOW)
        for dataset in self.tool._get_galaxy_history_dataset_list():
            self.assertIn(dataset, galaxy_datasets_list)
        self.assertTrue(galaxy_datasets_list_mock.called)

    def test__get_exposed_workflow_outputs(self):
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.show_job_mock.side_effect = self.show_job_side_effect
        self.create_tool(ToolDefinition.WORKFLOW)
        all_galaxy_datasets = self.tool._get_galaxy_history_dataset_list()
        datasets_marked_as_output = self.tool._get_exposed_workflow_outputs()
        self.assertEqual(len(datasets_marked_as_output), 2)
        self.assertTrue(
            all(
                dataset in all_galaxy_datasets for dataset in
                datasets_marked_as_output
            )
        )
        self.assertTrue(galaxy_datasets_list_mock.called)

    def test__get_workflow_step(self):
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.create_tool(ToolDefinition.WORKFLOW)
        for galaxy_dataset in self.tool._get_galaxy_history_dataset_list():
            step = self.tool._get_workflow_step(galaxy_dataset)
            self.assertIn(step, [1, 2])
        self.assertTrue(self.galaxy_workflow_show_invocation_mock.called)
        self.assertTrue(galaxy_datasets_list_mock.called)

    def test__get_galaxy_download_tasks(self):
        get_history_file_list_mock = self.get_history_file_list_mock.start()
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect * 4
        self.create_tool(ToolDefinition.WORKFLOW)
        task_id_list = _get_galaxy_download_task_ids(self.tool.analysis)
        self.assertTrue(self.galaxy_workflow_show_invocation_mock.called)
        self.assertTrue(galaxy_datasets_list_mock.called)
        self.assertTrue(get_history_file_list_mock.called)

        self.assertEqual(AnalysisResult.objects.count(), 3)

        # There will be one less WorkflowFilesDL because one of our mock
        # datasets has been "purged"
        self.assertEqual(WorkflowFilesDL.objects.count(), 2)
        self.assertEqual(
            AnalysisResult.objects.count(),
            self.tool.analysis.results.all().count()
        )
        self.assertEqual(len(task_id_list), 3)
        for task_id in task_id_list:
            self.assertRegexpMatches(str(task_id), UUID_RE)

        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_create_analysis_node_connections(self):
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect * 3
        self.create_tool(ToolDefinition.WORKFLOW,
                         file_relationships=self.LIST_BASIC)
        self.tool.create_analysis_output_node_connections()
        self.assertEqual(AnalysisNodeConnection.objects.count(), 3)
        self.assertEqual(
            AnalysisNodeConnection.objects.filter(
                direction=INPUT_CONNECTION
            ).count(),
            1
        )
        output_node_connections = AnalysisNodeConnection.objects.filter(
            direction=OUTPUT_CONNECTION
        )

        self.assertEqual(len(output_node_connections), 2)
        for index, output_connection in enumerate(output_node_connections):
            self.assertEqual(output_connection.analysis, self.tool.analysis)
            self.assertEqual(output_connection.direction, OUTPUT_CONNECTION)
            self.assertEqual(
                output_connection.name,
                galaxy_datasets_list[index]["name"]
            )
            self.assertEqual(output_connection.subanalysis, 0)
            self.assertEqual(
                output_connection.filename,
                self.tool._get_galaxy_dataset_filename(
                    galaxy_datasets_list[index]
                )
            )
            self.assertEqual(
                output_connection.filetype,
                galaxy_datasets_list[index]["file_ext"]
            )
        self.assertTrue(output_node_connections[0].is_refinery_file)
        self.assertTrue(output_node_connections[1].is_refinery_file)
        self.assertTrue(self.galaxy_workflow_show_invocation_mock.called)
        self.assertTrue(galaxy_datasets_list_mock.called)
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_creating__workflow_tool_sets_tool_launch_config_galaxy_data(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            self.tool.get_galaxy_dict()[
                WorkflowTool.FILE_RELATIONSHIPS_GALAXY
            ],
            unicode(
                self.tool.get_galaxy_file_relationships()
            ).replace("'", '"')
        )
        self.assertEqual(
            self.tool.get_galaxy_dict()[
                WorkflowTool.GALAXY_TO_REFINERY_MAPPING_LIST],
            [
                {
                    self.tool.GALAXY_DATASET_HISTORY_ID:
                        self.FAKE_DATASET_HISTORY_ID,
                    self.tool.REFINERY_FILE_UUID: self.node.file_uuid,
                    WorkflowTool.ANALYSIS_GROUP: 0
                }
            ]
        )

    @mock.patch.object(WorkflowTool, "_get_tool_data")
    def test_get_tool_launch_config(self, tool_data_mock):
        self.create_tool(ToolDefinition.WORKFLOW)
        parameters_dict = self.tool._create_workflow_parameters_dict()
        parameters_dict_with_uuids = {}
        for key in parameters_dict.keys():
            for k in parameters_dict[key].keys():
                parameters_dict_with_uuids[
                    GalaxyParameter.objects.get(name=k).uuid
                ] = str(parameters_dict[key][k])

        self.assertEqual(
            self.tool.get_tool_launch_config(),
            {
                self.tool.FILE_UUID_LIST: [self.node.file_uuid],
                u"dataset_uuid": self.dataset.uuid,
                u"tool_definition_uuid": self.td.uuid,
                Tool.FILE_RELATIONSHIPS: (
                    u"[{}]".format(self.node.uuid)
                ),
                self.tool.FILE_RELATIONSHIPS_URLS: (
                    u"['http://www.example.com/test_file.txt']"
                ),
                ToolDefinition.PARAMETERS: parameters_dict_with_uuids,
                WorkflowTool.GALAXY_DATA: {
                    WorkflowTool.FILE_RELATIONSHIPS_GALAXY: (
                        unicode(
                            self.tool.get_galaxy_file_relationships()
                        ).replace("'", '"')
                    ),
                    WorkflowTool.GALAXY_TO_REFINERY_MAPPING_LIST: [
                        {
                            self.tool.GALAXY_DATASET_HISTORY_ID:
                                self.FAKE_DATASET_HISTORY_ID,
                            self.tool.REFINERY_FILE_UUID: self.node.file_uuid,
                            WorkflowTool.ANALYSIS_GROUP: 0
                        }
                    ],
                    WorkflowTool.GALAXY_WORKFLOW_INVOCATION_DATA: {
                        "id": self.GALAXY_ID_MOCK
                    },
                }
            }
        )
        self.assertTrue(tool_data_mock.called)

    def test__has_dataset_collection_input_true(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        with mock.patch.object(
            WorkflowTool, "_get_workflow_dict",
            return_value=galaxy_workflow_dict_collection
        ) as get_workflow_dict_mock:
            self.assertTrue(self.tool._has_dataset_collection_input())
            self.assertTrue(get_workflow_dict_mock.called)

    def test__has_dataset_collection_input_false(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertFalse(self.tool._has_dataset_collection_input())

    def test_analysis_group_numbers_list_dsc_collection_workflow(self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_true.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 0, 0, 0],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_list_dsc_non_collection_workflow(self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_false.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 1, 2, 3],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_pair_dsc_collection_workflow(self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_true.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.PAIR
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 0],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_pair_dsc_non_collection_workflow(self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_false.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.PAIR
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 0],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_list_pair_dsc_collection_workflow(self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_true.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_PAIR
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 0, 1, 1],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_list_pair_non_dsc_collection_workflow(
            self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_false.start()
        )

        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_PAIR
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 0, 1, 1],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_list_list_dsc_collection_workflow(self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_true.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_LIST
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 0, 1, 1],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test_analysis_group_numbers_list_list_non_dsc_collection_workflow(
            self):
        has_dataset_collection_input_mock = (
            self.has_dataset_collection_input_mock_false.start()
        )
        self.create_tool(
            ToolDefinition.WORKFLOW,
            file_relationships=self.LIST_LIST
        )
        self.assertTrue(has_dataset_collection_input_mock.called)
        self.assertEqual(
            [0, 1, 2, 3],
            [item[WorkflowTool.ANALYSIS_GROUP] for item in
             self.tool._get_galaxy_file_mapping_list()]
        )

    def test__get_analysis_group_number(self):
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect
        self.galaxy_datasets_list_mock.start()
        self.create_tool(ToolDefinition.WORKFLOW)
        self.node.file_uuid = self.FAKE_DATASET_HISTORY_ID
        self.node.save()

        self.assertEqual(
            self.tool._get_analysis_group_number(
                self.tool._get_galaxy_history_dataset_list()[0]
            ),
            0
        )
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 4)

    def test_create_analysis_input_node_connections_dsc_input(self):
        self.has_dataset_collection_input_mock_true.start()
        self.create_tool(ToolDefinition.WORKFLOW,
                         file_relationships=self.LIST)
        tool_nodes = self.tool._get_input_nodes()
        analysis_node_connections = AnalysisNodeConnection.objects.filter(
            direction=INPUT_CONNECTION
        )
        self.assertEqual(len(analysis_node_connections), len(tool_nodes))

        for index, node in enumerate(tool_nodes):
            self.assertEqual(
                analysis_node_connections[index].analysis,
                self.tool.analysis
            )
            self.assertEqual(analysis_node_connections[index].node, node)
            self.assertEqual(
                analysis_node_connections[index].direction,
                INPUT_CONNECTION
            )
            self.assertEqual(
                analysis_node_connections[index].name,
                node.get_file_store_item().datafile.name
            )
            self.assertEqual(analysis_node_connections[index].step, 0)
            self.assertEqual(
                analysis_node_connections[index].filename,
                WorkflowTool.INPUT_DATASET_COLLECTION
            )
            self.assertFalse(analysis_node_connections[index].is_refinery_file)

    def test_create_analysis_input_node_connections_non_dsc_input(self):
        self.has_dataset_collection_input_mock_false.start()
        self.create_tool(ToolDefinition.WORKFLOW,
                         file_relationships=self.LIST)
        tool_nodes = self.tool._get_input_nodes()
        analysis_node_connections = AnalysisNodeConnection.objects.filter(
            direction=INPUT_CONNECTION
        )
        self.assertEqual(len(analysis_node_connections), len(tool_nodes))

        for index, node in enumerate(tool_nodes):
            self.assertEqual(
                analysis_node_connections[index].analysis,
                self.tool.analysis
            )
            self.assertEqual(analysis_node_connections[index].node, node)
            self.assertEqual(
                analysis_node_connections[index].direction,
                INPUT_CONNECTION
            )
            self.assertEqual(
                analysis_node_connections[index].name,
                node.get_file_store_item().datafile.name
            )
            self.assertEqual(analysis_node_connections[index].step, 0)
            self.assertEqual(
                analysis_node_connections[index].filename,
                WorkflowTool.INPUT_DATASET
            )
            self.assertFalse(analysis_node_connections[index].is_refinery_file)

    def test_attach_outputs_dataset_dsc(self):
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect * 4
        self.has_dataset_collection_input_mock_true.start()
        self.galaxy_datasets_list_mock.start()
        self.get_history_file_list_mock.start()
        with mock.patch.object(
            WorkflowTool, "_get_workflow_dict",
            return_value=galaxy_workflow_dict_collection
        ) as galaxy_workflow_dict_collection_mock:
            self.create_tool(ToolDefinition.WORKFLOW)
            _get_galaxy_download_task_ids(self.tool.analysis)
            self.tool.analysis.attach_outputs_dataset()
            self.assertTrue(galaxy_workflow_dict_collection_mock.called)
            self._assert_analysis_node_connection_outputs_validity()
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_attach_outputs_dataset_non_dsc(self):
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect * 4
        self.galaxy_datasets_list_mock.start()
        self.get_history_file_list_mock.start()
        self.has_dataset_collection_input_mock_false.start()
        self.create_tool(ToolDefinition.WORKFLOW)
        _get_galaxy_download_task_ids(self.tool.analysis)
        self.tool.analysis.attach_outputs_dataset()
        self._assert_analysis_node_connection_outputs_validity()
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_attach_outputs_dataset_same_name_workflow_results(self):
        self.galaxy_datasets_list_same_names_mock.start()
        same_name_galaxy_history_datasets_mock = (
            self.get_history_file_list_same_names_mock.start()
        )
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect * 4
        self.has_dataset_collection_input_mock_false.start()
        self.create_tool(ToolDefinition.WORKFLOW)
        _get_galaxy_download_task_ids(self.tool.analysis)
        output_connections = AnalysisNodeConnection.objects.filter(
            analysis=self.tool.analysis,
            direction=OUTPUT_CONNECTION
        )
        self.assertGreater(output_connections.count(), 0)
        for output_connection in output_connections:
            output_connection_filename = "{}.{}".format(
                output_connection.name,
                output_connection.filetype
            )
            analysis_results = AnalysisResult.objects.filter(
                analysis_uuid=self.tool.analysis.uuid,
                file_name=output_connection_filename
            )
            self.assertGreater(analysis_results.count(), 1)
        self.tool.analysis.attach_outputs_dataset()
        self.assertTrue(same_name_galaxy_history_datasets_mock.called)
        self._assert_analysis_node_connection_outputs_validity()
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_attach_outputs_dataset_makes_proper_node_inheritance_chain(self):
        self.galaxy_datasets_list_mock.start()
        self.get_history_file_list_mock.start()
        self.has_dataset_collection_input_mock_false.start()
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )
        self.show_job_mock.side_effect = self.show_job_side_effect * 4

        self.create_tool(ToolDefinition.WORKFLOW)
        _get_galaxy_download_task_ids(self.tool.analysis)

        exposed_output_connections = AnalysisNodeConnection.objects.filter(
            analysis=self.tool.analysis,
            direction=OUTPUT_CONNECTION,
            is_refinery_file=True
        )
        self.assertEqual(exposed_output_connections.count(), 2)
        # Make sure output connections have no node before "attachment" step
        for output_connection in exposed_output_connections:
            self.assertIsNone(output_connection.node)

        self.tool.analysis.attach_outputs_dataset()

        # Have to fetch again here since AnalysisNodeConnections have been
        # updated
        exposed_output_connections = AnalysisNodeConnection.objects.filter(
            analysis=self.tool.analysis,
            direction=OUTPUT_CONNECTION,
            is_refinery_file=True
        )
        self.assertEqual(exposed_output_connections.count(), 2)
        # Assert that AnalysisNodeConnection outputs now have nodes,
        # and that their nodes have parents
        for output_connection in exposed_output_connections:
            self.assertFalse(output_connection.node.is_orphan())

        self._assert_analysis_node_connection_outputs_validity()

    def test_galaxy_renamedatasetaction_handling(self):
        new_dataset_name = "COFFEE"
        workflow_step = 1
        workflow_dict = galaxy_workflow_dict
        workflow_dict["steps"][str(workflow_step)]["post_job_actions"] = {
            "RenameDatasetActionRefinery test tool LIST - N on data 4": {
                "action_arguments": {
                    "newname": new_dataset_name
                },
                "action_type": "RenameDatasetAction",
                "output_name": "Refinery test tool LIST - N on data 4"
            }
        }
        self.get_workflow_dict_mock.return_value = workflow_dict
        self.galaxy_datasets_list_mock.start()

        self.create_tool(ToolDefinition.WORKFLOW)
        galaxy_datasets = self.tool._get_galaxy_history_dataset_list()
        edited_galaxy_datasets = [
            galaxy_dataset for galaxy_dataset in galaxy_datasets if
            self.tool._get_workflow_step(galaxy_dataset) == workflow_step
        ]
        assert len(edited_galaxy_datasets) == 1

        # Assert that the Output file w/ a
        # RenamedDatasetAction in Galaxy was edited
        self.assertEqual(edited_galaxy_datasets[0]["name"], new_dataset_name)


class ToolAPITests(APITestCase, ToolManagerTestBase):
    def test_tools_exist(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(Tool.objects.count(), 1)
        self.assertEqual(
            Tool.objects.filter(
                tool_definition__tool_type=ToolDefinition.VISUALIZATION
            ).count(),
            1
        )

    def test_get_request_authenticated(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertIsNotNone(self.get_response)

    def test_get_request_no_auth(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.get_request = self.factory.get(self.tools_url_root)
        self.get_response = self.tools_view(self.get_request)
        self.assertEqual(self.get_response.status_code, 403)

    def test_get_request_tools_owned_by_user(self):
        # Creates a valid Tool for self.user
        self.create_tool(ToolDefinition.VISUALIZATION)

        # Try to GET the aforementioned Tool, and assert that another user
        # can't do so
        force_authenticate(self.get_request, self.user2)
        self.get_response = self.tools_view(self.get_request)
        self.assertEqual(len(self.get_response.data), 0)

    def test_unallowed_http_verbs(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            self.put_response.data['detail'],
            'Method "PUT" not allowed.'
        )
        self.assertEqual(
            self.options_response.data['detail'],
            'Method "OPTIONS" not allowed.'
        )
        self.assertEqual(
            self.delete_response.data['detail'],
            'Method "DELETE" not allowed.'
        )

    def test_invalid_TLC_against_schema(self):
        self.create_vis_tool_definition()

        tool_launch_configuration = {
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: {
                "invalid":
                    [
                        [
                            ("coffee", "coffee"),
                            ("coffee", "coffee"),
                            ("coffee", "coffee"),
                            ("coffee", "coffee")
                        ]
                    ]
            }
        }
        self.post_request = self.factory.post(
            self.tools_url_root,
            data=tool_launch_configuration,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.tools_view(self.post_request)

        self.assertIsInstance(self.post_response, HttpResponseBadRequest)
        self.assertIn(
            'Tool launch configuration is not properly configured',
            self.post_response.content
        )
        self.assertEqual(Tool.objects.count(), 0)

    def test_bad_POST_transaction_rollback(self):
        self.create_workflow_tool_definition()
        post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    "www.example.com/cool_file.txt",
                    (
                        "www.example.com/cool_file.txt",
                        "www.example.com/cool_file.txt"
                    )
                ]
            )
        }

        post_request = self.factory.post(
            self.tools_url_root,
            data=post_data,
            format="json"
        )
        force_authenticate(post_request, self.user)
        self.post_response = self.tools_view(post_request)

        self.assertIsInstance(self.post_response, HttpResponseBadRequest)
        self.assertEqual(Tool.objects.count(), 0)
        self.assertIn("LIST/PAIR structure is not balanced",
                      self.post_response.content)

    def test_good_extra_directories_path(self):
        valid_annotation = "LIST_visualization_good_extra_directories.json"
        self.create_tool(
            ToolDefinition.VISUALIZATION,
            annotation_file_name=valid_annotation,
            file_relationships=self.LIST
        )
        self.assertEqual(VisualizationTool.objects.count(), 1)

    def test_both_tool_types_returned_from_api(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.create_tool(ToolDefinition.VISUALIZATION)

        self.get_request = self.factory.get(self.tools_url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.tools_view(self.get_request)
        self.assertEqual(len(self.get_response.data), 2)


class WorkflowToolLaunchTests(ToolManagerTestBase):
    tasks_mock = "analysis_manager.tasks"

    def test_workflow_tool_launch_valid_workflow_object(self):
        self.create_tool(ToolDefinition.WORKFLOW)

        self.assertEqual(self.tool.get_owner(), self.user)
        self.assertEqual(self.tool.get_tool_type(), ToolDefinition.WORKFLOW)
        self.assertEqual(
            ast.literal_eval(self.tool.analysis.workflow_copy),
            galaxy_workflow_dict
        )
        self.assertEqual(
            self.tool.analysis.workflow_steps_num,
            len(galaxy_workflow_dict["steps"].keys())
        )
        self.assertEqual(
            json.loads(self.post_response.content)[Tool.TOOL_URL],
            '/data_sets/{}/#/analyses/'.format(self.tool.dataset.uuid)
        )

    def test_many_tools_can_be_launched_from_same_dataset(self):
        self.dataset = create_dataset_with_necessary_models()
        tool_a = self.create_tool(ToolDefinition.VISUALIZATION)
        tool_b = self.create_tool(ToolDefinition.WORKFLOW)

        self.assertEqual(tool_a.dataset, tool_b.dataset)

    @mock.patch.object(Analysis, "galaxy_cleanup")
    def test__get_workflow_tool_no_analysis(self, galaxy_cleanup_mock):
        self.create_tool(ToolDefinition.WORKFLOW)

        analysis_uuid = self.tool.analysis.uuid
        self.tool.analysis.delete()

        with mock.patch.object(run_analysis, "update_state") as update_mock:
            _get_workflow_tool(analysis_uuid)
            self.assertTrue(update_mock.called)
        self.assertTrue(galaxy_cleanup_mock.called)

    def test__get_workflow_tool_with_analysis(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            _get_workflow_tool(self.tool.analysis.uuid),
            self.tool
        )

    @mock.patch.object(celery.result.TaskSetResult, "successful",
                       return_value=True)
    @mock.patch.object(celery.result.TaskSetResult, "ready",
                       return_value=True)
    @mock.patch.object(run_analysis, "retry", side_effect=None)
    def test_get_input_file_uuid_list_gets_called_in_refinery_import(
            self, retry_mock, ready_mock, successful_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)

        with mock.patch(
            "tool_manager.models.Tool.get_input_file_uuid_list"
        ) as get_uuid_list_mock:
            _refinery_file_import(self.tool.analysis.uuid)
            self.assertTrue(get_uuid_list_mock.called)
        self.assertTrue(retry_mock.called)
        self.assertTrue(ready_mock.called)
        self.assertTrue(successful_mock.called)

    @mock.patch("{}._refinery_file_import".format(tasks_mock))
    @mock.patch("{}._run_tool_based_galaxy_file_import".format(tasks_mock))
    @mock.patch("{}._run_tool_based_galaxy_workflow".format(tasks_mock))
    @mock.patch("{}._check_galaxy_history_state".format(tasks_mock))
    @mock.patch("{}._galaxy_file_export".format(tasks_mock))
    @mock.patch("{}._attach_workflow_outputs".format(tasks_mock))
    def test_appropriate_methods_are_called_for_tool_based_analysis_run(
            self,
            attach_workflow_outputs_mock,
            galaxy_file_export_mock,
            check_galaxy_history_state_mock,
            run_tool_based_galaxy_workflow_mock,
            run_tool_based_galaxy_file_import_mock,
            refinery_file_import_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        run_analysis(self.tool.analysis.uuid)

        self.assertTrue(refinery_file_import_mock.called)
        self.assertTrue(run_tool_based_galaxy_file_import_mock.called)
        self.assertTrue(run_tool_based_galaxy_workflow_mock.called)
        self.assertTrue(check_galaxy_history_state_mock.called)
        self.assertTrue(galaxy_file_export_mock.called)
        self.assertTrue(attach_workflow_outputs_mock.called)

    def test__galaxy_file_import_ceases_to_set_file_relationships_galaxy(self):
        self.create_tool(ToolDefinition.WORKFLOW)

        with mock.patch.object(
            WorkflowTool, "update_file_relationships_with_galaxy_history_data"
        ) as update_file_relationships_galaxy_mock:
            _tool_based_galaxy_file_import(
                self.tool.analysis.uuid,
                self.file_store_item.uuid,
                history_dict,
                library_dict
            )
        self.assertTrue(self.library_upload_mock.called)
        self.assertTrue(self.history_upload_mock.called)
        self.assertFalse(update_file_relationships_galaxy_mock.called)

    def test__tool_based_galaxy_file_import_updates_galaxy_import_progress(
            self
    ):
        self.create_tool(ToolDefinition.WORKFLOW)

        _tool_based_galaxy_file_import(
            self.tool.analysis.uuid,
            self.file_store_item.uuid,
            history_dict,
            library_dict
        )

        self.assertTrue(self.library_upload_mock.called)
        self.assertTrue(self.history_upload_mock.called)

        self.assertEqual(
            AnalysisStatus.objects.get(
                analysis=self.tool.analysis
            ).galaxy_import_progress,
            100
        )

    def test_is_tool_based(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertTrue(self.tool.analysis.is_tool_based)

    @mock.patch("tool_manager.models.WorkflowTool.create_dataset_collection")
    @mock.patch(
        "tool_manager.models.WorkflowTool._create_workflow_inputs_dict"
    )
    def test__invoke_tool_based_galaxy_workflow(
            self,
            create_workflow_inputs_mock,
            create_dataset_collection_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        _invoke_tool_based_galaxy_workflow(self.tool.analysis.uuid)

        self.assertTrue(create_dataset_collection_mock.called)
        self.assertTrue(create_workflow_inputs_mock.called)
        self.assertTrue(self.invoke_workflow_mock.called)
        self.assertTrue(self.tool_data_mock.called)
        self.assertTrue(self.galaxy_workflow_show_invocation_mock.called)

        tool = WorkflowTool.objects.get(uuid=self.tool.uuid)

        self.assertEqual(
            tool.get_galaxy_dict()[
                WorkflowTool.GALAXY_WORKFLOW_INVOCATION_DATA],
            galaxy_workflow_invocation
        )

    @mock.patch("celery.task.sets.TaskSet.apply_async")
    @mock.patch.object(celery.result.TaskSetResult, "ready",
                       return_value=False)
    @mock.patch.object(AnalysisStatus, "set_galaxy_import_task_group_id")
    @mock.patch.object(run_analysis, "retry")
    def test__run_tool_based_galaxy_file_import_no_galaxy_import_task_group_id(
        self,
        retry_mock,
        set_galaxy_import_task_group_id_mock,
        ready_mock,
        apply_async_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.update_galaxy_data(self.tool.GALAXY_IMPORT_HISTORY_DICT,
                                     history_dict)
        self.tool.update_galaxy_data(self.tool.GALAXY_LIBRARY_DICT,
                                     library_dict)

        _run_tool_based_galaxy_file_import(self.tool.analysis.uuid)

        self.assertEqual(len(self.tool.get_galaxy_import_tasks()), 1)

        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        self.assertEqual(analysis_status.galaxy_import_state,
                         AnalysisStatus.PROGRESS)
        self.assertEqual(
            self.tool.get_galaxy_dict()[
                self.tool.GALAXY_IMPORT_HISTORY_DICT
            ],
            history_dict
        )
        self.assertEqual(
            self.tool.get_galaxy_dict()[self.tool.GALAXY_LIBRARY_DICT],
            library_dict
        )

        self.assertTrue(apply_async_mock.called)
        self.assertTrue(ready_mock.called)
        self.assertTrue(self.analysis_manager_taskset_result_mock.called)
        self.assertTrue(set_galaxy_import_task_group_id_mock.called)
        self.assertTrue(retry_mock.called)
        self.assertEqual(retry_mock.call_count, 2)

    @mock.patch.object(celery.result.TaskSetResult, "ready",
                       return_value=True)
    @mock.patch.object(celery.result.TaskSetResult, "successful",
                       return_value=False)
    @mock.patch.object(Analysis, "send_email")
    @mock.patch.object(Analysis, "galaxy_cleanup")
    def test__run_tool_based_galaxy_file_import_failure(
        self,
        galaxy_cleanup_mock,
        send_email_mock,
        successful_mock,
        ready_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)

        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        analysis_status.set_galaxy_import_task_group_id(str(uuid.uuid4()))

        _run_tool_based_galaxy_file_import(self.tool.analysis.uuid)

        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )

        self.assertEqual(
            analysis_status.analysis.status,
            Analysis.FAILURE_STATUS
        )
        self.assertEqual(
            analysis_status.galaxy_import_state,
            AnalysisStatus.ERROR
        )
        self.assertTrue(ready_mock.called)
        self.assertTrue(successful_mock.called)
        self.assertTrue(self.analysis_manager_taskset_result_mock.called)
        self.assertEqual(
            self.analysis_manager_taskset_result_mock.call_count, 2)
        self.assertTrue(send_email_mock.called)
        self.assertTrue(galaxy_cleanup_mock.called)

    @mock.patch.object(celery.result.TaskSetResult, "ready",
                       return_value=True)
    @mock.patch.object(celery.result.TaskSetResult, "successful",
                       return_value=True)
    def test__run_tool_based_galaxy_file_import_success(
            self,
            successful_mock,
            ready_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        analysis_status.set_galaxy_import_task_group_id(str(uuid.uuid4()))
        _run_tool_based_galaxy_file_import(self.tool.analysis.uuid)
        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        self.assertEqual(
            analysis_status.galaxy_import_state,
            AnalysisStatus.OK
        )
        self.assertTrue(ready_mock.called)
        self.assertTrue(successful_mock.called)
        self.assertTrue(self.analysis_manager_taskset_result_mock.called)
        self.assertEqual(
            self.analysis_manager_taskset_result_mock.call_count,
            1
        )

    @mock.patch("celery.task.sets.TaskSet.apply_async")
    @mock.patch.object(celery.result.TaskSetResult, "ready",
                       return_value=False)
    @mock.patch.object(AnalysisStatus, "set_galaxy_workflow_task_group_id")
    @mock.patch.object(run_analysis, "retry")
    def test__run_tool_based_galaxy_workflow_no_galaxy_workflow_task_group_id(
        self,
        retry_mock,
        set_galaxy_workflow_task_group_id_mock,
        ready_mock,
        apply_async_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        with mock.patch(
            "tool_manager.models.WorkflowTool."
            "update_file_relationships_with_galaxy_history_data",
        ) as update_file_relationships_with_galaxy_history_data_mock:
            _run_tool_based_galaxy_workflow(self.tool.analysis.uuid)

        self.assertTrue(
            update_file_relationships_with_galaxy_history_data_mock.called
        )
        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        self.assertEqual(analysis_status.galaxy_history_state,
                         AnalysisStatus.PROGRESS)
        self.assertTrue(apply_async_mock.called)
        self.assertTrue(ready_mock.called)
        self.assertTrue(self.analysis_manager_taskset_result_mock.called)
        self.assertTrue(set_galaxy_workflow_task_group_id_mock.called)
        self.assertTrue(retry_mock.called)
        self.assertEqual(retry_mock.call_count, 2)

    @mock.patch.object(celery.result.TaskSetResult, "ready",
                       return_value=True)
    @mock.patch.object(celery.result.TaskSetResult, "successful",
                       return_value=False)
    @mock.patch.object(Analysis, "send_email")
    @mock.patch.object(Analysis, "galaxy_cleanup")
    def test__run_tool_based_galaxy_workflow_failure(
            self,
            galaxy_cleanup_mock,
            send_email_mock,
            successful_mock,
            ready_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)

        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        analysis_status.set_galaxy_workflow_task_group_id(str(uuid.uuid4()))

        _run_tool_based_galaxy_workflow(self.tool.analysis.uuid)

        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )

        self.assertEqual(
            analysis_status.analysis.status,
            Analysis.FAILURE_STATUS
        )
        self.assertEqual(
            analysis_status.galaxy_history_state,
            AnalysisStatus.ERROR
        )

        self.assertTrue(ready_mock.called)
        self.assertTrue(successful_mock.called)
        self.assertTrue(self.analysis_manager_taskset_result_mock.called)
        self.assertEqual(
            self.analysis_manager_taskset_result_mock.call_count, 2)
        self.assertTrue(send_email_mock.called)
        self.assertTrue(galaxy_cleanup_mock.called)

    def test_galaxy_cleanup_methods_are_called_on_analysis_failure(self):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "always"

        self.create_tool(ToolDefinition.WORKFLOW)

        self.tool.update_galaxy_data(
            self.tool.GALAXY_IMPORT_HISTORY_DICT,
            {"id": self.GALAXY_ID_MOCK}
        )

        self.tool.analysis.workflow_galaxy_id = self.GALAXY_ID_MOCK
        self.tool.analysis.history_id = self.GALAXY_ID_MOCK
        self.tool.analysis.library_id = self.GALAXY_ID_MOCK
        self.tool.analysis.save()

        self.tool.analysis.cancel()

        self.assertEqual(self.tool.analysis.status, Analysis.FAILURE_STATUS)
        self.assertTrue(self.tool.analysis.canceled)

        self.assertFalse(self.delete_workflow_mock.called)
        self.assertTrue(self.delete_history_mock.called)
        self.assertTrue(self.delete_library_mock.called)

        self.assertEqual(self.delete_history_mock.call_count, 2)

    @mock.patch.object(WorkflowClient, "invoke_workflow",
                       side_effect=bioblend.ConnectionError("Bad connection"))
    def test_galaxy_cleanup_methods_are_called_on_bioblend_exception(
            self, invoke_workflow_mock):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "always"

        self.create_tool(
            ToolDefinition.WORKFLOW,
            annotation_file_name="LIST:PAIR.json"
        )
        self.tool.update_galaxy_data(
            self.tool.GALAXY_IMPORT_HISTORY_DICT,
            {"id": self.GALAXY_ID_MOCK}
        )
        self.tool.update_galaxy_data(
            self.tool.COLLECTION_INFO,
            {"id": "coffee"}
        )

        self.tool.analysis.workflow_galaxy_id = self.GALAXY_ID_MOCK
        self.tool.analysis.history_id = self.GALAXY_ID_MOCK
        self.tool.analysis.library_id = self.GALAXY_ID_MOCK
        self.tool.analysis.save()

        self.tool.invoke_workflow()

        self.assertEqual(self.tool.analysis.status, Analysis.FAILURE_STATUS)
        self.assertFalse(self.delete_workflow_mock.called)

        self.assertTrue(self.delete_history_mock.called)
        self.assertTrue(self.delete_library_mock.called)
        self.assertEqual(self.delete_history_mock.call_count, 2)
        self.assertTrue(invoke_workflow_mock.called)
        self.assertTrue(self.tool_data_mock.called)

    def test_workflow_tool_analysis_name(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        tool_name, timestamp, username = self.tool.analysis.name.split("-")

        self.assertEqual(tool_name.strip(), self.tool.get_tool_name())
        self.assertEqual(username.strip(),
                         self.tool.get_owner_username().title())
        self.assertRegexpMatches(
            timestamp,
            r'\d{4}\/\d{2}\/\d{1,2}\s\d{1,2}:\d{2}:\d{2}'
        )


class VisualizationToolLaunchTests(ToolManagerTestBase,
                                   SeleniumTestBaseGeneric):
    def setUp(self):
        # super() will only ever resolve a single class type for a given method
        ToolManagerTestBase.setUp(self)
        SeleniumTestBaseGeneric.setUp(self)

    def tearDown(self):
        # super() will only ever resolve a single class type for a given method
        ToolManagerTestBase.tearDown(self)
        SeleniumTestBaseGeneric.tearDown(self)

        # Explicitly call delete() to purge any containers we spun up
        Tool.objects.all().delete()

    def test_transaction_rollback_bad_dataset_uuid(self):
        self.create_vis_tool_definition()

        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(["www.example.com/cool_file.txt"])
        }

        self.dataset.delete()

        self.post_request = self.factory.post(
            self.tools_url_root,
            data=self.post_data,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.tools_view(self.post_request)
        self.assertEqual(type(self.post_response), HttpResponseBadRequest)
        self.assertEqual(Tool.objects.count(), 0)
        self.assertIn("DataSet matching query does not exist.",
                      self.post_response.content)

    def _start_visualization(
            self, json_name, file_relationships,
            assertions=None, count=1
    ):
        with open(
            "{}/visualizations/{}".format(TEST_DATA_PATH, json_name)
        ) as f:
            tool_annotation = [json.loads(f.read())]

        with mock.patch(
            self.mock_vis_annotations_reference,
            return_value=tool_annotation
        ) as mocked_method:
            if count == 1:
                call_command("generate_tool_definitions", visualizations=True)
                self.assertTrue(mocked_method.called)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.td = ToolDefinition.objects.all()[0]

            # Create mock ToolLaunchConfiguration
            self.post_data = {
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                Tool.FILE_RELATIONSHIPS: str([file_relationships])
            }

            self.post_request = self.factory.post(
                self.tools_url_root,
                data=self.post_data,
                format="json"
            )
            force_authenticate(self.post_request, self.user)
            with mock.patch("tool_manager.models.get_solr_response_json"):
                post_response = self.tools_view(self.post_request)
            logger.debug("VisualizationTool response content: %s",
                         post_response.content)
            self.assertEqual(post_response.status_code, 200)

            tools = VisualizationTool.objects.filter(
                tool_definition__uuid=self.td.uuid
            )
            if count:
                self.assertEqual(len(tools), count)
            last_tool = tools.last()
            self.assertEqual(last_tool.get_owner(), self.user)
            self.assertEqual(
                last_tool.get_tool_type(),
                ToolDefinition.VISUALIZATION
            )

            if assertions:
                assertions(last_tool)

    def test_IGV(self):
        def assertions(tool):
            # Check to see if IGV shows what we want
            igv_url = urljoin(
                self.live_server_url,
                tool.get_relative_container_url()
            )

            self.browser.get(igv_url)
            time.sleep(15)

            wait_until_class_visible(self.browser, "igv-track-label", MAX_WAIT)
            self.assertEqual(
                "sample.seg",
                self.browser.find_elements_by_class_name(
                    "igv-track-label"
                )[0].text
            )

        self._start_visualization(
            'igv.json',
            self.live_server_url + "/tool_manager/test_data/sample.seg",
            assertions
        )

    def test_HiGlass(self):
        self._start_visualization(
            'higlass.json',
            "https://s3.amazonaws.com/pkerp/public/"
            "dixon2012-h1hesc-hindiii-allreps-filtered."
            "1000kb.multires.cool"
            # TODO: Add selenium-based test once higlass relative paths fixed
        )

    def test_docker_cleanup(self):
        wait_time = 1
        settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE = wait_time

        def assertions(tool):
            client = DockerClientWrapper(
                settings.DJANGO_DOCKER_ENGINE_DATA_DIR
            )
            client.lookup_container_url(tool.container_name)

            time.sleep(wait_time * 2)
            django_docker_cleanup()
            time.sleep(wait_time * 2)

            with self.assertRaises(NotFound):
                client.lookup_container_url(tool.container_name)

        self._start_visualization(
            'hello_world.json',
            "https://www.example.com/file.txt",
            assertions
        )

    def test_max_containers(self):
        for i in xrange(settings.DJANGO_DOCKER_ENGINE_MAX_CONTAINERS):
            self._start_visualization(
                'hello_world.json',
                "https://www.example.com/file.txt",
                count=i+1
            )

        with self.assertRaises(AssertionError):
            # '400 != 200': Not what we really want?
            self._start_visualization(
                'hello_world.json',
                "https://www.example.com/file.txt"
            )


class ToolLaunchConfigurationTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolLaunchConfigurationTests, self).setUp()

        with open(
            "{}/visualizations/higlass.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = [json.loads(f.read())]

        with mock.patch(
            self.mock_vis_annotations_reference, return_value=tool_annotation
        ) as mocked_method:
            call_command("generate_tool_definitions", visualizations=True)

            self.assertTrue(mocked_method.called)
            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.td = ToolDefinition.objects.all()[0]

    def test_invalid_TLC_bad_json(self):
        tool_launch_configuration = "This isn't valid JSON"
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn(
            "Tool launch configuration is not properly configured",
            context.exception.message
        )

    def test_invalid_TLC_schema(self):
        tool_launch_configuration = {
            "valid": "JSON",
        }
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn(
            "Tool launch configuration is not properly configured",
            context.exception.message
        )

    def test_invalid_TLC_non_pythonic_file_relationships(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: "!!{}!!".format(
                str(["www.example.com/cool_file.txt"])
            )
        }
        with self.assertRaises(RuntimeError) as context:
            create_tool(tool_launch_configuration, self.user)
        self.assertIn(
            "ToolLaunchConfiguration's `file_relationships` could not be "
            "evaluated as a Pythonic Data Structure",
            context.exception.message
        )

    def test_invalid_TLC_non_LIST_PAIR_file_relationships(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    (
                        {"Dicts aren't": "LIST/PAIR-like"},
                        {"Dicts aren't": "LIST/PAIR-like"}
                    ),
                    (
                        {"Dicts aren't": "LIST/PAIR-like"},
                        {"Dicts aren't": "LIST/PAIR-like"}
                    )
                ]
            )
        }
        with self.assertRaises(RuntimeError) as context:
            create_tool(tool_launch_configuration, self.user)
        self.assertIn(
            '{"Dicts aren\'t": \'LIST/PAIR-like\'}',
            context.exception.message
        )

    def test_invalid_TLC_non_file_relationships_unbalanced(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    ("a", "b"),
                    ["c", "d"]
                ]
            )
        }
        with self.assertRaises(RuntimeError) as context:
            create_tool(tool_launch_configuration, self.user)
        self.assertIn(
            "LIST/PAIR structure is not balanced",
            context.exception.message
        )

    def test_invalid_TLC_bad_tooldefinition_uuid(self):
        tool_launch_configuration = {
            "tool_definition_uuid": "This is an invalid ToolDef UUID",
            Tool.FILE_RELATIONSHIPS: str(["www.example.com/cool_file.txt"])
        }
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn(
            "Tool launch configuration is not properly configured",
            context.exception.message
        )

    def test_valid_tool_launch_config_LIST(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                ["coffee"]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_LIST_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    ("coffee", "coffee")
                ]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_LIST_LIST_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    [
                        ("coffee", "coffee"),
                        ("coffee", "coffee"),
                        ("coffee", "coffee"),
                        ("coffee", "coffee")
                    ]
                ]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                ("coffee", "coffee")
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_PAIR_LIST(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                (["coffee", "coffee"], ["coffee", "coffee"])
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)
