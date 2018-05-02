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
from django.test import TestCase, override_settings

import bioblend
from bioblend.galaxy.dataset_collections import (CollectionElement,
                                                 HistoryDatasetElement)
from bioblend.galaxy.histories import HistoryClient
from bioblend.galaxy.jobs import JobsClient
from bioblend.galaxy.libraries import LibraryClient
from bioblend.galaxy.workflows import WorkflowClient
import celery

import constants
from django_docker_engine.docker_utils import DockerClientWrapper
from docker.errors import NotFound
from guardian.shortcuts import assign_perm, remove_perm
import mock
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)
from test_data.galaxy_mocks import (galaxy_dataset_provenance_0,
                                    galaxy_dataset_provenance_1,
                                    galaxy_datasets_list,
                                    galaxy_datasets_list_same_output_names,
                                    galaxy_history_contents,
                                    galaxy_history_contents_same_names,
                                    galaxy_job_a, galaxy_job_b,
                                    galaxy_tool_data, galaxy_workflow_dict,
                                    galaxy_workflow_dict_collection,
                                    galaxy_workflow_invocation,
                                    galaxy_workflow_invocation_data,
                                    history_dataset_dict, history_dict,
                                    library_dataset_dict, library_dict)

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import (_galaxy_file_import,
                                    _get_galaxy_download_task_ids,
                                    _get_workflow_tool,
                                    _invoke_galaxy_workflow,
                                    _refinery_file_import,
                                    _run_galaxy_file_import,
                                    _run_galaxy_workflow, run_analysis)
from core.models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                         AnalysisNodeConnection, AnalysisResult, ExtendedGroup,
                         Project, Workflow, WorkflowEngine)
from data_set_manager.models import Assay, Attribute, Node
from data_set_manager.utils import _create_solr_params_from_node_uuids
from factory_boy.django_model_factories import (AnnotatedNodeFactory,
                                                AttributeFactory,
                                                GalaxyInstanceFactory,
                                                NodeFactory, ParameterFactory,
                                                ToolFactory)
from factory_boy.utils import create_dataset_with_necessary_models
from file_store.models import FileStoreItem, FileType
from tool_manager.management.commands.load_tools import \
    Command as LoadToolsCommand
from tool_manager.tasks import django_docker_cleanup

from .models import (FileRelationship, GalaxyParameter, InputFile, Parameter,
                     Tool, ToolDefinition, VisualizationTool,
                     VisualizationToolError, WorkflowTool)
from .utils import (FileTypeValidationError, create_tool,
                    create_tool_definition, get_workflows,
                    user_has_access_to_tool, validate_tool_annotation,
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
        self.show_history_mock = mock.patch.object(
            HistoryClient, "show_history",
            return_value=galaxy_history_contents
        ).start()
        self.show_dataset_mock = mock.patch.object(
            HistoryClient, "show_dataset",
        ).start()

        # Galaxy Job mocks
        self.show_job_mock = mock.patch.object(
            JobsClient, "show_job"
        ).start()

        # Galaxy Library mocks
        self.create_library_mock = mock.patch.object(
            LibraryClient,
            "create_library",
            return_value=library_dict
        ).start()
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

        # tool_manager mocks
        self.get_taskset_result_mock = mock.patch(
            "tool_manager.models.get_taskset_result",
            return_value=celery.result.TaskSetResult(str(uuid.uuid4()))
        ).start()
        self.create_history_mock = mock.patch.object(
            WorkflowTool, "create_galaxy_history", return_value=history_dict
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

    def tearDown(self):
        mock.patch.stopall()


class ToolManagerTestBase(ToolManagerMocks):
    # Some members in assertions are truncated if they are too long, but we
    # want to see them in their entirety
    maxDiff = None
    FAKE_DATASET_HISTORY_ID = "0dd7fa018f646963"
    GALAXY_ID_MOCK = "6fc9fbb81c497f69"

    def setUp(self):
        super(ToolManagerTestBase, self).setUp()

        self.public_group = ExtendedGroup.objects.public_group()
        self.galaxy_instance = GalaxyInstanceFactory()
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

        self.mock_get_workflows_reference = (
            "tool_manager.management.commands.load_tools"
            ".get_workflows"
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
        self.tool_relaunch_view = ToolsViewSet.as_view({"get": "relaunch"})
        self.tool_container_input_data_view = ToolsViewSet.as_view(
            {"get": "container_input_data"}
        )
        self.tools_url_root = '/api/v2/tools/'
        self.tool_defs_url_root = '/api/v2/tool_definitions/'

        self.mock_parameter = ParameterFactory(
            name="Test Param",
            description="Test Param Description",
            value_type=Parameter.STRING,
            default_value="Coffee"
        )
        self.BAD_WORKFLOW_OUTPUTS = {WorkflowTool.WORKFLOW_OUTPUTS: []}
        self.GOOD_WORKFLOW_OUTPUTS = {WorkflowTool.WORKFLOW_OUTPUTS: [True]}

        self.django_docker_cleanup_wait_time = 1
        settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE = (
            self.django_docker_cleanup_wait_time
        )

    def load_visualizations(
        self,
        visualizations=["{}/visualizations/igv.json".format(TEST_DATA_PATH)]
    ):
        # TODO: More mocking, so Docker image is not downloaded
        call_command("load_tools", visualizations=visualizations)
        return visualizations

    def tearDown(self):
        # Trigger the pre_delete signal so that datafiles are purged
        FileStoreItem.objects.all().delete()
        # Remove any running containers
        with self.settings(DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE=0):
            django_docker_cleanup()
        super(ToolManagerTestBase, self).tearDown()

    def create_solr_mock_response(self, nodes):
        node_uuids = [n.uuid for n in nodes]
        return json.dumps(
            {
                "responseHeader": {
                    "status": 0,
                    "QTime": 36,
                    "params": _create_solr_params_from_node_uuids(node_uuids)
                },
                "response": {
                    "numFound": len(node_uuids),
                    "start": 0,
                    "docs": [
                        {
                            "uuid": node.uuid,
                            "name": node.name,
                            "type": node.type,
                            "file_uuid": node.file_uuid,
                            "organism_Characteristics_generic_s":
                                "Mus musculus",
                            "filename_Characteristics_generic_s":
                                node.get_file_store_item().source
                        } for node in nodes
                    ]
                }
            }
        )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def create_tool(self,
                    tool_type,
                    create_unique_name=False,
                    file_relationships=None,
                    annotation_file_name=None,
                    start_vis_container=False,
                    user_has_dataset_read_meta_access=True):

        if user_has_dataset_read_meta_access:
            assign_perm('core.read_meta_dataset', self.user, self.dataset)

        if tool_type == ToolDefinition.WORKFLOW:
            self.create_workflow_tool_definition(
                create_unique_name=create_unique_name,
                annotation_file_name=annotation_file_name
            )
            launch_parameters = {
                galaxy_param.uuid: galaxy_param.default_value
                for galaxy_param in GalaxyParameter.objects.all()
            }

        elif tool_type == ToolDefinition.VISUALIZATION:
            self.create_vis_tool_definition(
                create_unique_name=create_unique_name,
                annotation_file_name=annotation_file_name
            )
            launch_parameters = {
                self.mock_parameter.uuid: "Edited Value"
            }
        else:
            raise RuntimeError("Please provide a valid tool_type")

        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            ToolDefinition.PARAMETERS: launch_parameters
        }

        if file_relationships is None:
            self.post_data[Tool.FILE_RELATIONSHIPS] = "[{}]".format(
                self.node.uuid
            )
        else:
            self.post_data[Tool.FILE_RELATIONSHIPS] = file_relationships

        self.post_request = self.factory.post(
            self.tools_url_root,
            data=self.post_data,
            format="json"
        )
        force_authenticate(self.post_request, self.user)

        # Mock the spinning up of containers
        run_container_mock = mock.patch(
            "django_docker_engine.docker_utils.DockerClientRunWrapper.run"
        )

        if tool_type == ToolDefinition.VISUALIZATION:
            with mock.patch("tool_manager.models.get_solr_response_json"):
                if not start_vis_container:
                    run_container_mock.start()

                self.post_response = self.tools_view(self.post_request)
                logger.debug(
                    "Visualization tool launch response: %s",
                    self.post_response.content
                )

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

        self._make_tools_get_request()
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

    def create_vis_tool_definition(self, annotation_file_name=None,
                                   create_unique_name=False):
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
            self.tool_annotation_dict = json.loads(f.read())

        if create_unique_name:
            self.tool_annotation_dict["name"] = (
                self.tool_annotation_dict["name"] + str(uuid.uuid4())
            )

        # Don't pull down images in tests
        with mock.patch(
            "django_docker_engine.docker_utils.DockerClientWrapper.pull",
            return_value=None
        ) as pull_mock:
            self.td = create_tool_definition(self.tool_annotation_dict)
            self.assertTrue(pull_mock.called)

    def create_workflow_tool_definition(self, annotation_file_name=None,
                                        create_unique_name=False):
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
            if create_unique_name:
                self.tool_annotation_data["name"] = (
                    self.tool_annotation_data["name"] + str(uuid.uuid4())
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

    def _django_docker_engine_cleanup_wrapper(self):
        time.sleep(self.django_docker_cleanup_wait_time * 2)
        django_docker_cleanup()
        time.sleep(self.django_docker_cleanup_wait_time * 2)

    def make_node(self, source="http://www.example.com/test_file.txt"):
        test_file = StringIO.StringIO()

        test_file.write('Coffee is really great.\n')
        self.file_store_item = FileStoreItem.objects.create(source=source)

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

    def _make_tools_get_request(self, user=None, tool_type=None):
        request_params = {"data_set_uuid": self.dataset.uuid}
        if tool_type:
            request_params = dict(tool_type=tool_type, **request_params)

        self.get_request = self.factory.get(
            self.tools_url_root,
            data=request_params
        )
        force_authenticate(
            self.get_request,
            self.user if not user else user
        )
        self.get_response = self.tools_view(self.get_request)


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

        self.dataset = create_dataset_with_necessary_models()
        self.dataset.set_owner(self.user)

        self.public_dataset = create_dataset_with_necessary_models()
        self.public_dataset.share(self.public_group)

        # Make reusable requests & responses
        self.get_request = self.factory.get(
            "{}?dataSetUuid={}".format(
                self.tool_defs_url_root,
                self.dataset.uuid
            )
        )
        force_authenticate(self.get_request, self.user)
        self.get_response = self.tool_defs_view(self.get_request)

        self.tool_json = self.get_response.data[0]

        self.delete_request = self.factory.delete(
            urljoin(self.tool_defs_url_root, self.tool_json['uuid']))
        self.delete_response = self.tool_defs_view(self.delete_request)
        self.put_request = self.factory.put(
            self.tool_defs_url_root,
            data=self.tool_json,
            format="json"
        )
        self.put_response = self.tool_defs_view(self.put_request)
        self.post_request = self.factory.post(
            self.tool_defs_url_root,
            data=self.tool_json,
            format="json"
        )
        self.post_response = self.tool_defs_view(self.post_request)
        self.options_request = self.factory.options(
            self.tool_defs_url_root,
            data=self.tool_json,
            format="json"
        )
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

    def test_request_from_owned_dataset_shows_all_tool_defs(self):
        self.assertNotEqual(len(self.get_response.data), 0)
        for tool_definition in self.get_response.data:
            tool_definition = ToolDefinition.objects.get(
                uuid=tool_definition["uuid"]
            )
            self.assertIn(tool_definition, ToolDefinition.objects.all())

    def test_request_from_public_dataset_shows_vis_tools_only(self):
        get_request = self.factory.get(
            "{}?dataSetUuid={}".format(
                self.tool_defs_url_root,
                self.public_dataset.uuid
            )
        )
        force_authenticate(get_request, self.user)
        get_response = self.tool_defs_view(get_request)
        self.assertNotEqual(len(get_response.data), 0)
        for tool_definition in get_response.data:
            self.assertIn(
                ToolDefinition.objects.get(
                    uuid=tool_definition["uuid"]
                ),
                ToolDefinition.objects.filter(
                    tool_type=ToolDefinition.VISUALIZATION
                )
            )

    def test_no_query_params_in_get_yields_bad_request(self):
        get_request = self.factory.get(self.tool_defs_url_root)
        force_authenticate(get_request, self.user)
        get_response = self.tool_defs_view(get_request)
        self.assertEqual(get_response.status_code, 400)
        self.assertIn("Must specify a DataSet UUID", get_response.content)

    def test_bad_query_params_in_get_yields_bad_request(self):
        get_request = self.factory.get(
            "{}?coffee={}".format(
                self.tool_defs_url_root,
                self.dataset.uuid
            )
        )
        force_authenticate(get_request, self.user)
        get_response = self.tool_defs_view(get_request)
        self.assertEqual(get_response.status_code, 400)
        self.assertIn("Must specify a DataSet UUID", get_response.content)

    def test_missing_dataset_in_get_yields_bad_request(self):
        dataset_uuid = str(uuid.uuid4())

        get_request = self.factory.get(
            "{}?dataSetUuid={}".format(
                self.tool_defs_url_root,
                dataset_uuid
            )
        )
        force_authenticate(get_request, self.user)
        get_response = self.tool_defs_view(get_request)
        self.assertEqual(get_response.status_code, 400)
        self.assertIn("Couldn't fetch DataSet", get_response.content)


class ToolDefinitionGenerationTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolDefinitionGenerationTests, self).setUp()
        raw_input_reference = "__builtin__.raw_input"
        self.raw_input_yes_mock = mock.patch(
            raw_input_reference,
            return_value="y"
        )
        self.raw_input_no_mock = mock.patch(
            raw_input_reference,
            side_effect=["coffee", "n"]
        )
        with open(
            "{}/workflows/galaxy_workflows_valid.json".format(TEST_DATA_PATH)
        ) as f:
            self.valid_workflows = json.loads(f.read())

        with open(
            "{}/workflows/galaxy_workflows_invalid.json".format(TEST_DATA_PATH)
        ) as f:
            self.invalid_workflows = json.loads(f.read())

        self.mock_parameter.delete()

        self.fake_workflow = {
            "name": "Fake WF",
            "graph": {"steps": {}}
        }

    def test_tool_definition_model_str(self):
        self.load_visualizations()
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

    def test_load_tools_management_command(self):
        with mock.patch(
            self.mock_get_workflows_reference,
            side_effect=[
                {self.workflow_engine.uuid: self.invalid_workflows},
                {self.workflow_engine.uuid: self.valid_workflows}
            ]
        ) as get_wf_mock:
            self.assertRaises(
                CommandError,
                call_command,
                "load_tools",
                workflows=True
            )

            self.assertEqual(ToolDefinition.objects.count(), 0)
            self.load_visualizations()

            self.assertEqual(get_wf_mock.call_count, 1)
            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.assertEqual(FileRelationship.objects.count(), 1)
            self.assertEqual(GalaxyParameter.objects.count(), 0)
            self.assertEqual(Parameter.objects.count(), 1)
            self.assertEqual(InputFile.objects.count(), 1)

    def test_load_tools_overwrites_visualizations_if_forced(
            self
    ):
        self.raw_input_yes_mock.start()
        visualizations = self.load_visualizations()
        original_ids = [t.id for t in ToolDefinition.objects.all()]

        # Create new VisualizationToolDefinition with --force
        call_command(
            "load_tools",
            visualizations=visualizations,
            force=True
        )
        new_ids = [t.id for t in ToolDefinition.objects.all()]

        # Assert that the new visualization tool definitions id's were
        # incremented
        self.assertEqual(new_ids, [_id + 1 for _id in original_ids])

    def test_load_tools_overwrites_workflows_if_forced(
            self
    ):
        self.raw_input_yes_mock.start()
        with mock.patch(
            self.mock_get_workflows_reference,
            return_value={self.workflow_engine.uuid: self.valid_workflows}
        ) as get_wf_mock:
            # Create WorkflowToolDefinition
            call_command("load_tools", workflows=True)
            original_ids = [t.id for t in ToolDefinition.objects.all()]

            # Create new WorkflowToolDefinition with --force
            call_command(
                "load_tools",
                workflows=True,
                force=True
            )
            new_ids = [t.id for t in ToolDefinition.objects.all()]

            # Assert that the new workflow tool definitions id's were
            # incremented
            for original_id in original_ids:
                self.assertIn(original_id + 3, new_ids)
            self.assertEqual(get_wf_mock.call_count, 2)

    def test_load_tools_with_force_allows_user_dismissal(
            self
    ):
        self.raw_input_no_mock.start()
        with mock.patch(
                self.mock_get_workflows_reference,
                return_value={self.workflow_engine.uuid: self.valid_workflows}
        ):
            with self.assertRaises(SystemExit):
                # Create WorkflowToolDefinition
                call_command(
                    "load_tools",
                    workflows=True,
                    force=True
                )

        self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_load_tools_command_error_if_get_workflows_fails(
            self
    ):
        with mock.patch(
            self.mock_get_workflows_reference,
            side_effect=RuntimeError
        ):
            with self.assertRaises(CommandError):
                call_command("load_tools", workflows=True)

    def test_load_tools_multiple_times_skips_without_deletion(
            self
    ):
        with mock.patch(
            self.mock_get_workflows_reference,
            return_value={self.workflow_engine.uuid: self.valid_workflows}
        ):
            call_command("load_tools", workflows=True)
            tool_definitions_a = [t for t in ToolDefinition.objects.all()]

            call_command("load_tools", workflows=True)
            tool_definitions_b = [t for t in ToolDefinition.objects.all()]

        self.assertEqual(tool_definitions_a, tool_definitions_b)

    @mock.patch.object(
        LoadToolsCommand,
        "_get_available_visualization_tool_registry_names"
    )
    def test_load_tools_error_message_yields_vis_registry_info(
            self,
            get_available_vis_tool_names_mock
    ):
        fake_registry_tool_names = "a, b, c, d"
        fake_vis_tool_name = "coffee"
        get_available_vis_tool_names_mock.return_value = (
            fake_registry_tool_names
        )

        with self.settings(
                REFINERY_VISUALIZATION_REGISTRY="http://www.example.com"
        ):
            with self.assertRaises(CommandError) as context:
                self.load_visualizations(visualizations=[fake_vis_tool_name])
                self.assertTrue(get_available_vis_tool_names_mock.called)
            self.assertIn(
                "Available Visualization Tools from the Registry ({}) are: {}"
                .format(
                    settings.REFINERY_VISUALIZATION_REGISTRY,
                    fake_registry_tool_names
                ),
                context.exception.message
            )

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

    def _assert_visualization_tool_def_exception_contents(
        self,
        exception,
        tool_annotation_name,
        messages
    ):
        assert type(messages) == list
        visualizations = [
            "{}/visualizations/{}.json".format(
                TEST_DATA_PATH,
                tool_annotation_name
            )
        ]
        with self.assertRaises(exception) as context:
            call_command("load_tools", visualizations=visualizations)
        [self.assertIn(message, context.exception.message)
         for message in messages]

    def test_visualization_generation_with_no_image_version_yields_error(self):
        self._assert_visualization_tool_def_exception_contents(
            CommandError,
            "no_docker_image_version",
            ["no specified version"]
        )

    def test_tool_def_generation_with_bad_filetype_yields_error(self):
        self._assert_visualization_tool_def_exception_contents(
            CommandError,
            "bad_filetype",
            [
                "BAD FILETYPE",
                str([filetype.name for filetype in FileType.objects.all()])
            ]
        )

    def test_known_galaxy_one_off_asterisking_error_is_handled(self):
        self.fake_workflow["graph"]["steps"] = {
            "0": self.BAD_WORKFLOW_OUTPUTS,
            "1": self.GOOD_WORKFLOW_OUTPUTS
        }
        workflow_exhibiting_one_off_asterisking_error = self.fake_workflow

        with self.assertRaises(CommandError) as context:
            LoadToolsCommand()._has_workflow_outputs(
                workflow_exhibiting_one_off_asterisking_error
            )
        self.assertIn("asterisked `workflow_outputs`",
                      context.exception.message)

    def test__has_workflow_outputs_bad_workflow_outputs(self):
        self.fake_workflow["graph"]["steps"] = {
            "0": self.GOOD_WORKFLOW_OUTPUTS,
            "1": self.BAD_WORKFLOW_OUTPUTS
        }
        workflow_without_outputs_defined = self.fake_workflow

        self.assertFalse(
            LoadToolsCommand()._has_workflow_outputs(
                workflow_without_outputs_defined
            )
        )

    def test__has_workflow_outputs_good_workflow_outputs(self):
        self.fake_workflow["graph"]["steps"] = {
            "0": self.GOOD_WORKFLOW_OUTPUTS,
            "1": self.GOOD_WORKFLOW_OUTPUTS
        }
        workflow_with_outputs_defined = self.fake_workflow
        LoadToolsCommand()._has_workflow_outputs(
            workflow_with_outputs_defined
        )

    @mock.patch.object(
        LoadToolsCommand,
        "_has_workflow_outputs",
        return_value=False
    )
    def test_generate_workflows_without_outputs_raises_exception(
            self,
            _are_workflow_outputs_present_mock
    ):
        with mock.patch(
            self.mock_get_workflows_reference,
            return_value={self.workflow_engine.uuid: self.valid_workflows}
        ):
            with self.assertRaises(CommandError) as context:
                LoadToolsCommand()._generate_workflows()
        self.assertIn("does not have `workflow_outputs`",
                      context.exception.message)
        self.assertTrue(_are_workflow_outputs_present_mock.called)


class ToolDefinitionTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolDefinitionTests, self).setUp()
        self.mock_parameter.delete()

    def test_get_annotation(self):
        self.create_vis_tool_definition(annotation_file_name="igv.json")
        self.assertEqual(self.td.get_annotation(),
                         self.tool_annotation_dict["annotation"])

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

    def test_get_parameters(self):
        self.create_vis_tool_definition(annotation_file_name="igv.json")
        tool_parameters = [p for p in self.td.get_parameters()]
        all_parameters = [p for p in Parameter.objects.all()]
        self.assertEqual(tool_parameters, all_parameters)


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

    def test__get_owner_info_as_dict(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self._make_tools_get_request()

        self.assertEqual(
            self.get_response.data[0]["owner"],
            {
                "username": self.user.username,
                "full_name": "{} {}".format(
                    self.user.first_name,
                    self.user.last_name
                ),
                "user_profile_uuid": self.user.profile.uuid
            }
        )

    def test_relaunch_url(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(
            self.tool.relaunch_url,
            "/api/v2/tools/{}/relaunch/".format(self.tool.uuid)
        )

    def test_get_relative_container_url(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(
            self.tool.get_relative_container_url(),
            "/{}/{}".format(
                settings.DJANGO_DOCKER_ENGINE_BASE_URL,
                self.tool.container_name
            )
        )

    def test_is_workflow(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertTrue(self.tool.is_workflow())
        self.assertFalse(self.tool.is_visualization())

    def test_is_visualization(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertTrue(self.tool.is_visualization())
        self.assertFalse(self.tool.is_workflow())

    def test_visualization_is_running(self):
        self.create_tool(
            ToolDefinition.VISUALIZATION,
            start_vis_container=True
        )
        self.assertTrue(self.tool.is_running())
        self._django_docker_engine_cleanup_wrapper()
        self.assertFalse(self.tool.is_running())

    def test_workflow_is_running(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.analysis.set_status(Analysis.RUNNING_STATUS)
        self.assertTrue(self.tool.is_running())
        self.tool.analysis.set_status(Analysis.SUCCESS_STATUS)
        self.assertFalse(self.tool.is_running())

    def test_terminate_file_import_tasks(self):
        with mock.patch(
            "file_store.models.FileStoreItem.terminate_file_import_task"
        ) as terminate_mock:
            self.create_tool(ToolDefinition.WORKFLOW)
            self.tool.analysis.terminate_file_import_tasks()
            self.assertEqual(terminate_mock.call_count, 1)


class VisualizationToolTests(ToolManagerTestBase):
    def setUp(self):
        super(VisualizationToolTests, self).setUp()
        self.visualization_tool = self.create_tool(
            ToolDefinition.VISUALIZATION,
            file_relationships=self.LIST
        )

        self.search_solr_mock = mock.patch(
            "data_set_manager.utils.search_solr",
            return_value=self.create_solr_mock_response(
                self.visualization_tool._get_input_nodes()
            )
        ).start()

    def _create_detailed_nodes_dict(self, nodes):
        return {
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
                    "filename_Characteristics_generic_s":
                        node.get_file_store_item().source
                }
            } for node in nodes
        }

    def test_get_detailed_input_nodes_dict(self):
        input_nodes_meta_info = self.tool._get_detailed_nodes_dict(
            self.tool.get_input_node_uuids()
        )
        self.assertEqual(
            input_nodes_meta_info,
            self._create_detailed_nodes_dict(self.tool._get_input_nodes())
        )
        self.assertTrue(self.search_solr_mock.called)

    def test_get_detailed_input_nodes_dict_all_dataset_nodes(self):
        self.search_solr_mock.return_value = self.create_solr_mock_response(
            self.tool.dataset.get_nodes()
        )
        all_dataset_nodes_meta_info = self.tool._get_detailed_nodes_dict(
            self.tool.dataset.get_node_uuids()
        )
        self.assertEqual(
            all_dataset_nodes_meta_info,
            self._create_detailed_nodes_dict(self.tool.dataset.get_nodes())
        )
        self.assertTrue(self.search_solr_mock.called)

    def test_get_container_input_dict(self):
        tool_input_dict = self.tool.get_container_input_dict()
        file_relationships = self.tool.get_file_relationships_urls()

        self.assertEqual(
            tool_input_dict,
            {
                VisualizationTool.API_PREFIX:
                    self.tool.get_relative_container_url() + "/",
                Tool.FILE_RELATIONSHIPS: file_relationships,
                VisualizationTool.INPUT_NODE_INFORMATION:
                    self.tool._get_detailed_nodes_dict(
                        self.tool.get_input_node_uuids()
                    ),
                VisualizationTool.ALL_NODE_INFORMATION:
                    self.tool._get_detailed_nodes_dict(
                        self.tool.dataset.get_node_uuids()
                    ),
                ToolDefinition.PARAMETERS:
                    self.tool._get_visualization_parameters(),
                ToolDefinition.EXTRA_DIRECTORIES:
                    self.tool.tool_definition.get_extra_directories()
            }
        )
        self.assertTrue(self.search_solr_mock.called)

    def test__get_visualization_parameters(self):
        parameter = self.visualization_tool.tool_definition.get_parameters()[0]
        self.assertEqual(
            self.visualization_tool._get_visualization_parameters(),
            [
                {
                    "description": parameter.description,
                    "default_value": parameter.default_value,
                    "uuid": parameter.uuid,
                    "name": parameter.name,
                    "value": parameter.default_value,
                    "value_type": parameter.value_type
                }
            ]
        )

    def test__get_edited_parameter_value(self):
        edited_parameter_value = (
                self.visualization_tool._get_edited_parameter_value(
                    self.mock_parameter
                )
        )
        self.assertEqual(edited_parameter_value, "Edited Value")

        parameter = ParameterFactory(
            name="Test Param",
            description="Test Param Description",
            value_type=Parameter.STRING,
            default_value="Coffee"
        )
        non_edited_parameter_value = (
            self.visualization_tool._get_edited_parameter_value(parameter)
        )
        self.assertEqual(non_edited_parameter_value, parameter.default_value)


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

    def test__get_exposed_galaxy_datasets(self):
        galaxy_datasets_list_mock = self.galaxy_datasets_list_mock.start()
        self.show_job_mock.side_effect = self.show_job_side_effect
        self.create_tool(ToolDefinition.WORKFLOW)
        all_galaxy_datasets = self.tool._get_galaxy_history_dataset_list()
        datasets_marked_as_output = self.tool._get_exposed_galaxy_datasets()
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
        task_id_list = self._get_galaxy_download_task_ids_wrapper()

        self.assertEqual(AnalysisResult.objects.count(), 2)
        self.assertEqual(
            AnalysisResult.objects.count(),
            self.tool.analysis.results.all().count()
        )
        self.assertEqual(len(task_id_list), 2)
        for task_id in task_id_list:
            self.assertRegexpMatches(str(task_id), constants.UUID_RE)

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

    def _create_analysis_node_connections_wrapper(self):
        self.show_job_mock.side_effect = self.show_job_side_effect * 3
        self.tool.create_analysis_output_node_connections()

    def _get_galaxy_download_list_wrapper(self,
                                          datasets_have_same_names=False):
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_a,
                                          galaxy_job_b, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a]
        if datasets_have_same_names:
            self.show_dataset_mock.side_effect = (
                galaxy_datasets_list_same_output_names
            )
        else:
            self.show_dataset_mock.side_effect = galaxy_datasets_list

        return self.tool.get_galaxy_dataset_download_list()

    def _get_galaxy_download_task_ids_wrapper(
        self,
        datasets_have_same_names=False,
        tool_is_data_set_collection_based=False
    ):
        if datasets_have_same_names:
            self.galaxy_datasets_list_same_names_mock.start()
            self.show_history_mock.return_value = (
                galaxy_history_contents_same_names
            )
        else:
            self.galaxy_datasets_list_mock.start()

        if tool_is_data_set_collection_based:
            mock.patch.object(
                WorkflowTool, "_get_workflow_dict",
                return_value=galaxy_workflow_dict_collection
            ).start()
            self.has_dataset_collection_input_mock_true.start()
        else:
            self.has_dataset_collection_input_mock_false.start()

        self.create_tool(ToolDefinition.WORKFLOW)
        self.show_dataset_provenance_mock.side_effect = (
            self.show_dataset_provenance_side_effect * 3
        )

        self._create_analysis_node_connections_wrapper()
        download_list = self._get_galaxy_download_list_wrapper(
            datasets_have_same_names=datasets_have_same_names
        )

        mock.patch(
            "tool_manager.models.WorkflowTool."
            "create_analysis_output_node_connections"
        ).start()
        mock.patch(
            "tool_manager.models.WorkflowTool"
            ".get_galaxy_dataset_download_list",
            return_value=download_list
        ).start()

        return _get_galaxy_download_task_ids(self.tool.analysis)

    def _attach_derived_nodes_to_dataset_assertions(self):
        self._assert_analysis_node_connection_outputs_validity()
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_attach_derived_nodes_to_dataset_dsc(self):
        self._get_galaxy_download_task_ids_wrapper(
            tool_is_data_set_collection_based=True
        )
        self.tool.analysis.attach_derived_nodes_to_dataset()
        self._attach_derived_nodes_to_dataset_assertions()

    def test_attach_derived_nodes_to_dataset_non_dsc(self):
        self._get_galaxy_download_task_ids_wrapper()
        self.tool.analysis.attach_derived_nodes_to_dataset()
        self._attach_derived_nodes_to_dataset_assertions()

    def test_attach_derived_nodes_to_dataset_same_name_workflow_results(self):
        self._get_galaxy_download_task_ids_wrapper(
            datasets_have_same_names=True
        )
        self.tool.analysis.attach_derived_nodes_to_dataset()

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
        self._attach_derived_nodes_to_dataset_assertions()

    def test_attach_derived_nodes_to_dataset_proper_node_inheritance(self):
        self._get_galaxy_download_task_ids_wrapper()

        exposed_output_connections = AnalysisNodeConnection.objects.filter(
            analysis=self.tool.analysis,
            direction=OUTPUT_CONNECTION,
            is_refinery_file=True
        )
        self.assertEqual(exposed_output_connections.count(), 2)
        # Make sure output connections have no node before "attachment" step
        for output_connection in exposed_output_connections:
            self.assertIsNone(output_connection.node)

        self.tool.analysis.attach_derived_nodes_to_dataset()

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

    def test_create_galaxy_library_sets_analysis_library_id(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertIsNone(self.tool.analysis.library_id)
        self.tool.create_galaxy_library()
        self.assertEqual(self.tool.analysis.library_id, library_dict["id"])

    def test_get_galaxy_dataset_download_list(self):
        self.galaxy_datasets_list_mock.start()
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_a,
                                          galaxy_job_b, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a]
        self.show_dataset_mock.side_effect = galaxy_datasets_list

        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            len(self.tool.get_galaxy_dataset_download_list()),
            2
        )

    def test__get_creating_job_output_name(self):
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b]
        self.create_tool(ToolDefinition.WORKFLOW)

        creating_job_output_name_a = self.tool._get_creating_job_output_name(
            galaxy_datasets_list[0]
        )
        creating_job_output_name_b = self.tool._get_creating_job_output_name(
            galaxy_datasets_list[1]
        )
        self.assertIsNotNone(galaxy_job_a["outputs"].get(
                creating_job_output_name_a
            )
        )
        self.assertIsNotNone(galaxy_job_b["outputs"].get(
                creating_job_output_name_b
            )
        )

    def test__get_creating_job_output_name_reliance(self):
        self.show_job_mock.side_effect = [galaxy_job_a]
        self.create_tool(ToolDefinition.WORKFLOW)

        with self.assertRaises(AssertionError) as context:
            self.tool._get_creating_job_output_name(
                {
                    "uuid": str(uuid.uuid4()),
                    WorkflowTool.CREATING_JOB: ""
                 }
            )
        self.assertIn(
            "There should be one creating job output name",
            context.exception.message
        )

    def test_that_tool_analysis_has_proper_ownership(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            self.tool.get_owner(),
            self.tool.analysis.get_owner()
        )


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

    def test_get_request_tools_owned_by_another_user(self):
        # Creates a valid Tool for self.user
        self.create_tool(ToolDefinition.VISUALIZATION)

        # Try to GET the aforementioned Tool, and assert that another user
        # can't do so
        self._make_tools_get_request(user=self.user2)
        self.assertEqual(self.get_response.status_code, 401)

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

        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 2)

    def test_visualiztion_running_status_in_response(self):
        self.create_tool(
            ToolDefinition.VISUALIZATION,
            start_vis_container=True
        )

        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 1)

        self.assertTrue(self.get_response.data[0]["is_running"])

        self._django_docker_engine_cleanup_wrapper()

        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 1)

        self.assertFalse(self.get_response.data[0]["is_running"])

    def test_workflow_running_status_in_response(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.tool.analysis.set_status(Analysis.RUNNING_STATUS)

        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 1)

        self.assertTrue(self.get_response.data[0]["is_running"])

        self.tool.analysis.set_status(Analysis.SUCCESS_STATUS)

        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 1)

        self.assertFalse(self.get_response.data[0]["is_running"])

    def test_owner_info_is_returned(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        self.create_tool(ToolDefinition.VISUALIZATION)

        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 2)
        for tool in self.get_response.data:
            self.assertEqual(
                tool["owner"],
                self.tool._get_owner_info_as_dict()
            )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_vis_tool_can_be_relaunched(self):
        self.create_tool(ToolDefinition.VISUALIZATION,
                         start_vis_container=True)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)

        self._make_tools_get_request()
        self.assertTrue(self.tool.is_running())

        # Remove Container
        self._django_docker_engine_cleanup_wrapper()
        self.assertFalse(self.tool.is_running())

        # Relaunch Tool
        get_request = self.factory.get(self.tool.relaunch_url)
        force_authenticate(get_request, self.user)
        with mock.patch("tool_manager.models.get_solr_response_json"):
            get_response = self.tool_relaunch_view(
                get_request,
                uuid=self.tool.uuid
            )
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(
            json.loads(get_response.content),
            {Tool.TOOL_URL: self.tool.get_relative_container_url()}
        )
        self.assertTrue(self.tool.is_running())

    def test_relaunch_failure_no_uuid_present(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        get_request = self.factory.get(self.tool.relaunch_url)
        force_authenticate(get_request, self.user)
        get_response = self.tool_relaunch_view(get_request)
        self.assertEqual(get_response.status_code, 400)
        self.assertIn("Relaunching a Tool requires a Tool UUID",
                      get_response.content)

    def test_relaunch_failure_tool_doesnt_exist(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        tool_uuid = self.tool.uuid
        relaunch_url = self.tool.relaunch_url
        self.tool.delete()

        get_request = self.factory.get(relaunch_url)
        force_authenticate(get_request, self.user)
        get_response = self.tool_relaunch_view(get_request, uuid=tool_uuid)
        self.assertEqual(get_response.status_code, 404)

    def test_relaunch_failure_insufficient_user_perms(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        get_request = self.factory.get(self.tool.relaunch_url)
        remove_perm('core.read_dataset', self.user, self.tool.dataset)

        force_authenticate(get_request, self.user)
        get_response = self.tool_relaunch_view(
            get_request,
            uuid=self.tool.uuid
        )
        self.assertEqual(get_response.status_code, 403)
        self.assertIn("User does not have permission",
                      get_response.content)

    def test_relaunch_failure_tool_already_running(self):
        self.create_tool(ToolDefinition.VISUALIZATION,
                         start_vis_container=True)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)
        get_request = self.factory.get(self.tool.relaunch_url)
        force_authenticate(get_request, self.user)
        get_response = self.tool_relaunch_view(
            get_request,
            uuid=self.tool.uuid
        )
        self.assertEqual(get_response.status_code, 400)
        self.assertIn("Can't relaunch a Tool that is currently running",
                      get_response.content)

    def test_workflow_tool_disallows_relaunch(self):
        self.create_tool(ToolDefinition.WORKFLOW)
        get_request = self.factory.get(self.tool.relaunch_url)
        force_authenticate(get_request, self.user)
        get_response = self.tool_relaunch_view(
            get_request,
            uuid=self.tool.uuid
        )
        self.assertEqual(get_response.status_code, 404)

    def test_api_response_has_proper_fields_present(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self._make_tools_get_request()
        self.assertEqual(len(self.get_response.data), 1)

        expected_response_fields = {
            'container_name': self.tool.container_name,
            'container_url': self.tool.get_relative_container_url(),
            'dataset': self.tool.dataset.pk,
            'is_running': self.tool.is_running(),
            'name': self.tool.name,
            'owner': self.tool._get_owner_info_as_dict(),
            'relaunch_url': self.tool.relaunch_url,
            'tool_definition': self.tool.tool_definition.pk,
            'uuid': self.tool.uuid
        }

        for key in expected_response_fields.keys():
            self.assertEqual(
                dict(self.get_response.data[0])[key],
                expected_response_fields[key]
            )

    def test_vis_tools_returned_are_from_a_single_dataset(self):
        vis_tools_to_create = 3
        for i in xrange(vis_tools_to_create):
            self.create_tool(ToolDefinition.VISUALIZATION,
                             create_unique_name=True)

        # Create another Vis Tool with a separate Dataset
        new_tool = self.create_tool(ToolDefinition.VISUALIZATION,
                                    create_unique_name=True,
                                    user_has_dataset_read_meta_access=False)
        new_dataset = create_dataset_with_necessary_models(create_nodes=False)
        new_tool.dataset = new_dataset
        new_tool.save()

        self._make_tools_get_request(self.user)
        self.assertEqual(len(self.get_response.data), vis_tools_to_create)
        self.assertNotIn(
            new_tool.uuid,
            [tool["uuid"] for tool in self.get_response.data]
        )

    def _create_workflow_and_vis_tools(self, number_to_create=2):
        for i in xrange(number_to_create):
            self.create_tool(ToolDefinition.VISUALIZATION,
                             create_unique_name=True)
            self.create_tool(ToolDefinition.WORKFLOW,
                             create_unique_name=True)

    def _assert_get_response_contains(self, tool_list):
        self.assertEqual(
            [tool.uuid for tool in tool_list],
            [tool["uuid"] for tool in self.get_response.data]
        )

    def test_vis_tools_returned_with_tool_type_request_param(self):
        self._create_workflow_and_vis_tools()
        self._make_tools_get_request(tool_type=ToolDefinition.VISUALIZATION)
        self._assert_get_response_contains(
            VisualizationTool.objects.filter(dataset=self.dataset)
        )

    def test_workflow_tools_returned_with_tool_type_request_param(self):
        self._create_workflow_and_vis_tools()
        self._make_tools_get_request(tool_type=ToolDefinition.WORKFLOW)
        self._assert_get_response_contains(
            WorkflowTool.objects.filter(dataset=self.dataset)
        )

    def test_get_with_invalid_tool_type_request_param(self):
        self._create_workflow_and_vis_tools()
        self._make_tools_get_request(tool_type="coffee")
        self.assertEqual(self.get_response.data, [])

    def _test_launch_vis_container(self, user_has_permission=True):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertFalse(self.tool.is_running())

        if user_has_permission:
            assign_perm('core.read_dataset', self.user, self.tool.dataset)

        # Need to set_password() to be able to login. Otherwise
        # user.password is the hash representation which is not what the
        # login() expects
        temp_password = "password"
        self.user.set_password(temp_password)
        self.user.save()
        self.client.login(username=self.user.username,
                          password=temp_password)

        with mock.patch.object(VisualizationTool, "launch") as launch_mock:
            get_response = self.client.get(
                "{}/".format(self.tool.get_relative_container_url())
            )
        if user_has_permission:
            self.assertTrue(launch_mock.called)
        else:
            self.assertEqual(get_response.status_code, 403)
            self.assertFalse(launch_mock.called)

    def test_vis_tool_url_after_container_removed_relaunches(self):
        self._test_launch_vis_container()

    def test_vis_tool_url_user_without_permission(self):
        self._test_launch_vis_container(user_has_permission=False)

    def test_get_container_input_data_detail_route(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        get_request = self.factory.get(self.tool.container_input_json_url)
        with mock.patch("tool_manager.models.get_solr_response_json"):
            get_response = self.tool_container_input_data_view(
                get_request,
                uuid=self.tool.uuid
            )
            self.assertEqual(
                json.loads(get_response.content),
                self.tool.get_container_input_dict()
            )

    def test_get_container_input_data_detail_route_bad_uuid(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        get_request = self.factory.get(self.tool.container_input_json_url)
        get_response = self.tool_container_input_data_view(
            get_request,
            uuid=str(uuid.uuid4())  # uuid doesn't correspond to any Tool
        )
        self.assertEqual(get_response.status_code, 404)


class WorkflowToolLaunchTests(ToolManagerTestBase):
    tasks_mock = "analysis_manager.tasks"

    def test_workflow_tool_launch_valid_workflow_object(self):
        self.create_tool(ToolDefinition.WORKFLOW)

        self.assertEqual(self.tool.get_owner(), self.user)
        self.assertTrue(self.tool.is_workflow())
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
    @mock.patch("{}._run_galaxy_file_import".format(tasks_mock))
    @mock.patch("{}._run_galaxy_workflow".format(tasks_mock))
    @mock.patch("{}._check_galaxy_history_state".format(tasks_mock))
    @mock.patch("{}._galaxy_file_export".format(tasks_mock))
    @mock.patch("{}._attach_workflow_outputs".format(tasks_mock))
    def test_appropriate_methods_are_called_for_analysis_run(
            self,
            attach_workflow_outputs_mock,
            galaxy_file_export_mock,
            check_galaxy_history_state_mock,
            run_galaxy_workflow_mock,
            run_galaxy_file_import_mock,
            refinery_file_import_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        run_analysis(self.tool.analysis.uuid)

        self.assertTrue(refinery_file_import_mock.called)
        self.assertTrue(run_galaxy_file_import_mock.called)
        self.assertTrue(run_galaxy_workflow_mock.called)
        self.assertTrue(check_galaxy_history_state_mock.called)
        self.assertTrue(galaxy_file_export_mock.called)
        self.assertTrue(attach_workflow_outputs_mock.called)

    def test__galaxy_file_import_ceases_to_set_file_relationships_galaxy(self):
        self.create_tool(ToolDefinition.WORKFLOW)

        with mock.patch.object(
            WorkflowTool, "update_file_relationships_with_galaxy_history_data"
        ) as update_file_relationships_galaxy_mock:
            _galaxy_file_import(
                self.tool.analysis.uuid,
                self.file_store_item.uuid,
                history_dict,
                library_dict
            )
        self.assertTrue(self.library_upload_mock.called)
        self.assertTrue(self.history_upload_mock.called)
        self.assertFalse(update_file_relationships_galaxy_mock.called)

    def test__galaxy_file_import_updates_galaxy_import_progress(
            self
    ):
        self.create_tool(ToolDefinition.WORKFLOW)

        _galaxy_file_import(
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

    @mock.patch("tool_manager.models.WorkflowTool.create_dataset_collection")
    @mock.patch(
        "tool_manager.models.WorkflowTool._create_workflow_inputs_dict"
    )
    def test__invoke_galaxy_workflow(
            self,
            create_workflow_inputs_mock,
            create_dataset_collection_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        _invoke_galaxy_workflow(self.tool.analysis.uuid)

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
    def test__run_galaxy_file_import_no_galaxy_import_task_group_id(
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

        _run_galaxy_file_import(self.tool.analysis.uuid)

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
    def test__run_galaxy_file_import_failure(
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

        _run_galaxy_file_import(self.tool.analysis.uuid)

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
    def test__run_galaxy_file_import_success(
            self,
            successful_mock,
            ready_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)
        analysis_status = AnalysisStatus.objects.get(
            analysis=self.tool.analysis
        )
        analysis_status.set_galaxy_import_task_group_id(str(uuid.uuid4()))
        _run_galaxy_file_import(self.tool.analysis.uuid)
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
    def test__run_galaxy_workflow_no_galaxy_workflow_task_group_id(
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
            _run_galaxy_workflow(self.tool.analysis.uuid)

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
    def test__run_galaxy_workflow_failure(
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

        _run_galaxy_workflow(self.tool.analysis.uuid)

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

    def galaxy_cleanup_assertions(self, delete_history_mock_call_count=2):
        self.assertFalse(self.delete_workflow_mock.called)
        self.assertTrue(self.delete_history_mock.called)
        self.assertTrue(self.delete_library_mock.called)

        self.assertEqual(
            self.delete_history_mock.call_count,
            delete_history_mock_call_count
        )

    def create_tool_with_analysis(self):
        self.create_tool(ToolDefinition.WORKFLOW)

        self.tool.update_galaxy_data(
            self.tool.GALAXY_IMPORT_HISTORY_DICT,
            {"id": self.GALAXY_ID_MOCK}
        )

        self.tool.analysis.workflow_galaxy_id = self.GALAXY_ID_MOCK
        self.tool.analysis.history_id = self.GALAXY_ID_MOCK
        self.tool.analysis.library_id = self.GALAXY_ID_MOCK
        self.tool.analysis.save()

    def test_galaxy_cleanup_methods_are_called_on_analysis_failure(self):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "always"

        self.create_tool_with_analysis()
        self.tool.analysis.galaxy_cleanup()
        self.galaxy_cleanup_assertions()

    def test_galaxy_cleanup_is_always_called_for_cancelled_analyses(self):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "invalid cleanup value"

        self.create_tool_with_analysis()
        self.tool.analysis.cancel()
        self.assertEqual(self.tool.analysis.status, Analysis.FAILURE_STATUS)
        self.assertTrue(self.tool.analysis.canceled)
        self.galaxy_cleanup_assertions()

    def test_galaxy_cleanup_is_always_called_for_deleted_analyses(self):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "invalid cleanup value"

        self.create_tool_with_analysis()
        self.tool.analysis.delete()
        self.galaxy_cleanup_assertions()

    def test_analysis_deletion_works_for_tools_that_havent_reached_galaxy_yet(
            self
    ):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "invalid cleanup value"
        self.create_tool_with_analysis()

        # Simulate a WorkflowTool that hasn't talked to Galaxy yet
        self.tool.analysis.history_id = None
        self.tool.analysis.library_id = None
        self.tool.analysis.save()

        with mock.patch.object(
                WorkflowTool,
                "get_galaxy_dict",
                return_value={}
        ):
            self.tool.analysis.delete()

        self.galaxy_cleanup_assertions(delete_history_mock_call_count=1)

        with self.assertRaises(WorkflowTool.DoesNotExist):
            WorkflowTool.objects.get(uuid=self.tool.uuid)
        with self.assertRaises(Analysis.DoesNotExist):
            Analysis.objects.get(uuid=self.tool.analysis.uuid)

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
        self.galaxy_cleanup_assertions()

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


class VisualizationToolLaunchTests(ToolManagerTestBase):
    def setUp(self):
        super(VisualizationToolLaunchTests, self).setUp()

        self.sample_igv_file_url = "http://www.example.com/sample.seg"

        mock.patch.object(
            LoadToolsCommand,
            "_get_available_visualization_tool_registry_names",
        ).start()

    def tearDown(self):
        super(VisualizationToolLaunchTests, self).tearDown()

        # Explicitly call delete() to purge any containers we spun up
        Tool.objects.all().delete()

    def test_transaction_rollback_bad_dataset_uuid(self):
        self.create_vis_tool_definition()

        self.post_data = {
            "dataset_uuid": str(uuid.uuid4()),
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(["www.example.com/cool_file.txt"])
        }

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

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def _start_visualization(
            self, json_name, file_relationships,
            assertions=None, count=1
    ):
        self.load_visualizations()

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.td = ToolDefinition.objects.all()[0]

        # Create mock ToolLaunchConfiguration
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: "[{}]".format(
                self.make_node(source=self.sample_igv_file_url)
            ),
            ToolDefinition.PARAMETERS: {
                self.mock_parameter.uuid: self.mock_parameter.default_value
            }
        }
        visualization_tool = create_tool(
            tool_launch_configuration,
            self.user
        )
        with mock.patch(
            "data_set_manager.utils.search_solr",
            return_value=self.create_solr_mock_response(
                visualization_tool._get_input_nodes()
            )
        ):
            visualization_tool.launch()

        tools = VisualizationTool.objects.filter(
            tool_definition__uuid=self.td.uuid
        )
        if count:
            self.assertEqual(len(tools), count)
        last_tool = tools.last()
        self.assertEqual(last_tool.get_owner(), self.user)
        self.assertTrue(last_tool.is_visualization())

        if assertions:
            assertions(last_tool)

    def test_IGV(self):
        self._start_visualization(
            'igv.json',
            self.sample_igv_file_url
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
            client = DockerClientWrapper()
            client.lookup_container_url(tool.container_name)

            self.assertTrue(tool.is_running())

            self._django_docker_engine_cleanup_wrapper()

            with self.assertRaises(NotFound):
                client.lookup_container_url(tool.container_name)

            self.assertFalse(tool.is_running())

        self._start_visualization(
            'hello_world.json',
            "https://www.example.com/file.txt",
            assertions
        )

    def test_max_containers(self):
        with self.settings(DJANGO_DOCKER_ENGINE_MAX_CONTAINERS=1):
            self._start_visualization(
                'hello_world.json',
                "https://www.example.com/file.txt",
                count=settings.DJANGO_DOCKER_ENGINE_MAX_CONTAINERS
            )
            with self.assertRaises(VisualizationToolError) as context:
                self._start_visualization(
                    'hello_world.json',
                    "https://www.example.com/file.txt",
                )
        self.assertIn("Max containers", context.exception.message)

    def test__get_launch_parameters(self):
        def assertions(tool):
            self.assertEqual(
                tool._get_launch_parameters(),
                tool.get_tool_launch_config()[ToolDefinition.PARAMETERS]
            )

        self._start_visualization(
            'igv.json',
            self.sample_igv_file_url,
            assertions
        )

    def test_input_node_limit(self):
        tool = self.create_tool(ToolDefinition.VISUALIZATION)
        tool_launch_config = self.tool.get_tool_launch_config()

        # Crete one more entry than what REFINERY_SOLR_DOC_LIMIT permits
        tool_launch_config[Tool.FILE_RELATIONSHIPS] = str(
            [uuid.uuid4()] * (constants.REFINERY_SOLR_DOC_LIMIT + 1)
        )
        tool.set_tool_launch_config(tool_launch_config)
        with self.assertRaises(VisualizationToolError) as context:
            tool.launch()

        self.assertIn(
            "Input Node limit of: {} reached".format(
                constants.REFINERY_SOLR_DOC_LIMIT
            ),
            context.exception.message
        )


class ToolLaunchConfigurationTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolLaunchConfigurationTests, self).setUp()

        self.load_visualizations()

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


class ToolManagerUtilitiesTests(ToolManagerTestBase):
    def test_file_type_validation_error(self):
        bad_filetype = "COFFEE"
        error_message = "FileType `{}` does not exist".format(bad_filetype)

        file_type_validation_error = FileTypeValidationError(
            bad_filetype,
            error_message
        )
        self.assertIn(bad_filetype, file_type_validation_error.message)
        self.assertIn(error_message, file_type_validation_error.message)
        self.assertIn(
            str([f.name for f in FileType.objects.all()]),
            file_type_validation_error.message
        )

    @mock.patch(
        "bioblend.galaxy.workflows.WorkflowClient.export_workflow_dict",
        return_value="workflow_graph"
    )
    @mock.patch(
        "bioblend.galaxy.workflows.WorkflowClient.show_workflow",
        return_value={"graph": None}
    )
    def test_get_workflows(self, show_workflow_mock, exported_workflow_mock):
        with mock.patch.object(
            bioblend.galaxy.workflows.WorkflowClient,
            "get_workflows",
            return_value=[{"id": self.GALAXY_ID_MOCK}]
        ) as bioblend_get_workflows_mock:
            workflows = get_workflows()
        self.assertEqual(
            workflows,
            {
                self.workflow_engine.uuid: [
                    {
                        "graph": "workflow_graph"
                    }
                ]
            }
        )

        self.assertTrue(bioblend_get_workflows_mock.called)
        self.assertTrue(show_workflow_mock.called)
        self.assertTrue(exported_workflow_mock.called)

    def test_get_workflows_with_connection_error(self):
        with mock.patch.object(
            bioblend.galaxy.workflows.WorkflowClient,
            "get_workflows",
            side_effect=bioblend.ConnectionError("Bad Connection")
        ):
            with self.assertRaises(RuntimeError) as context:
                get_workflows()
            self.assertIn(
                "Unable to retrieve workflows from '{}'".format(
                    self.workflow_engine.instance.base_url
                ),
                context.exception.message
            )

    def test_user_has_access_to_tool(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)
        self.assertTrue(user_has_access_to_tool(self.user, self.tool))
        self.assertFalse(user_has_access_to_tool(self.user2, self.tool))


class ParameterTests(TestCase):
    def test_cast_param_value_to_proper_type_bool(self):
        test_bools = [True, False]
        for index, test_bool in enumerate(test_bools):
            parameter = ParameterFactory(
                name="Bool Param",
                description="Boolean Parameter",
                value_type=Parameter.BOOLEAN,
                default_value=str(test_bool)
            )
            for element in [parameter.default_value, test_bools[index]]:
                self.assertEqual(
                    test_bools[index],
                    parameter.cast_param_value_to_proper_type(element)
                )

    def test_cast_param_value_to_proper_type_string(self):
        test_string = "Coffee"
        for string_type in Parameter.STRING_TYPES:
            parameter = ParameterFactory(
                name="String Param",
                description="String Parameter",
                value_type=string_type,
                default_value=test_string
            )
            self.assertEqual(
                test_string,
                parameter.cast_param_value_to_proper_type(
                    parameter.default_value
                )
            )

    def test_cast_param_value_to_proper_type_int(self):
        test_int = 1
        parameter = ParameterFactory(
            name="Int Param",
            description="Integer Parameter",
            value_type=Parameter.INTEGER,
            default_value=str(test_int)
        )
        for element in [parameter.default_value, test_int]:
            self.assertEqual(
                test_int,
                parameter.cast_param_value_to_proper_type(element)
            )

    def test_cast_param_value_to_proper_type_float(self):
        test_float = 1.37
        parameter = ParameterFactory(
            name="Float Param",
            description="Float Parameter",
            value_type=Parameter.FLOAT,
            default_value=str(test_float)
        )
        for element in [parameter.default_value, test_float]:
            self.assertEqual(
                test_float,
                parameter.cast_param_value_to_proper_type(element)
            )
