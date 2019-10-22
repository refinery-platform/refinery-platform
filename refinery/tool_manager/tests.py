import StringIO
import json
import logging
import uuid
from urlparse import urljoin

import bioblend
import celery
import mock
from bioblend.galaxy.dataset_collections import (CollectionElement,
                                                 HistoryDatasetElement)
from bioblend.galaxy.histories import HistoryClient
from bioblend.galaxy.jobs import JobsClient
from bioblend.galaxy.libraries import LibraryClient
from bioblend.galaxy.workflows import WorkflowClient
from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import call_command
from django.http import HttpResponseBadRequest
from django.test import TestCase, override_settings
from django_docker_engine.docker_utils import DockerClientWrapper
from guardian.shortcuts import assign_perm
from rest_framework.test import (APIRequestFactory, force_authenticate)

import constants
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
                         Event, Project, WorkflowEngine)
from data_set_manager.models import Assay, Attribute, Node
from data_set_manager.utils import _create_solr_params_from_node_uuids
from factory_boy.django_model_factories import (AnnotatedNodeFactory,
                                                AttributeFactory,
                                                GalaxyInstanceFactory,
                                                NodeFactory, ParameterFactory,
                                                ToolFactory)
from factory_boy.utils import create_dataset_with_necessary_models, \
    create_tool_with_necessary_models
from file_store.models import FileStoreItem
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
from tool_manager.management.commands.load_tools import \
    Command as LoadToolsCommand
from .models import (GalaxyParameter, Parameter,
                     Tool, ToolDefinition, VisualizationTool,
                     VisualizationToolError, WorkflowTool)
from .utils import (create_tool,
                    create_tool_definition)
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
            source='http://www.example.com/test_file.txt'
        )

        self.node = Node.objects.create(name="Node {}".format(uuid.uuid4()),
                                        assay=self.assay, study=self.study,
                                        file_item=self.file_store_item)

        self.mock_get_workflows_reference = (
            'tool_manager.management.commands.load_tools.get_workflows'
        )

        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.user.save()
        self.user2 = User.objects.create_user('coffee_enjoyer', '',
                                              'coffeecoffee')
        self.user2.save()

        self.project = Project.objects.create(name='Catch-All Project',
                                              is_catch_all=True)
        self.project.set_owner(self.user)
        self.user.profile.catch_all_project = self.project
        self.user.profile.save()

        self.factory = APIRequestFactory()
        self.tools_view = ToolsViewSet.as_view(
            {
                'get': 'list',
                'post': 'create',
                'delete': 'destroy'
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
            name="Test Param", description="Test Param Description",
            value_type=Parameter.STRING, default_value="Coffee"
        )
        self.BAD_WORKFLOW_OUTPUTS = {WorkflowTool.WORKFLOW_OUTPUTS: []}
        self.GOOD_WORKFLOW_OUTPUTS = {WorkflowTool.WORKFLOW_OUTPUTS: [True]}

    @mock.patch("django_docker_engine.docker_utils.DockerClientWrapper.pull")
    def load_visualizations(
        self,
        docker_pull_mock,
        visualizations=["{}/visualizations/igv.json".format(TEST_DATA_PATH)]
    ):
        call_command("load_tools", "--visualizations",
                     " ".join(visualizations))
        return visualizations

    def tearDown(self):
        # Trigger the pre_delete signal so that datafiles are purged
        FileStoreItem.objects.all().delete()
        # Remove any running containers
        DockerClientWrapper().purge_inactive(0)
        super(ToolManagerTestBase, self).tearDown()

    def create_solr_mock_response(self, nodes):
        node_uuids = [n.uuid for n in nodes]
        solr_params = _create_solr_params_from_node_uuids(node_uuids)
        solr_params['json']['fields'] = solr_params['json']['filter']
        solr_params['json'] = json.dumps(solr_params['json'])
        return json.dumps(
            {
                "responseHeader": {
                    "status": 0,
                    "QTime": 36,
                    "params": solr_params
                },
                "response": {
                    "numFound": len(node_uuids),
                    "start": 0,
                    "docs": [
                        {
                            "uuid": node.uuid,
                            "name": node.name,
                            "type": node.type,
                            "file_uuid": node.file_item.uuid,
                            "organism_Characteristics_generic_s":
                                "Mus musculus",
                            "filename_Characteristics_generic_s":
                                node.file_item.source
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
                    user_has_dataset_read_meta_access=True,
                    display_name=None):

        if user_has_dataset_read_meta_access:
            assign_perm('core.read_meta_dataset', self.user, self.dataset)

        if tool_type == ToolDefinition.WORKFLOW:
            self.create_workflow_tool_definition(
                create_unique_name=create_unique_name,
                annotation_file_name=annotation_file_name
            )
            launch_parameters = {
                str(galaxy_param.uuid): galaxy_param.default_value
                for galaxy_param in GalaxyParameter.objects.all()
            }

        elif tool_type == ToolDefinition.VISUALIZATION:
            self.create_vis_tool_definition(
                create_unique_name=create_unique_name,
                annotation_file_name=annotation_file_name
            )
            launch_parameters = {
                str(self.mock_parameter.uuid): "Edited Value"
            }
        else:
            raise RuntimeError("Please provide a valid tool_type")

        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            ToolDefinition.PARAMETERS: launch_parameters
        }

        if display_name is not None:
            self.post_data["display_name"] = display_name

        if file_relationships is None:
            self.post_data[Tool.FILE_RELATIONSHIPS] = "[{}]".format(
                self.node.uuid
            )
        else:
            self.post_data[Tool.FILE_RELATIONSHIPS] = file_relationships

        self.post_request = self.factory.post(self.tools_url_root,
                                              data=self.post_data,
                                              format='json')
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
                if self.post_response.status_code != 200:
                    return  # No Tool was created

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
                urljoin(self.tools_url_root, self.tool_json['uuid'])
        )
        force_authenticate(self.delete_request, self.user)
        self.delete_response = self.tools_view(self.delete_request)
        self.put_request = self.factory.put(self.tools_url_root,
                                            data=self.tool_json,
                                            format='json')
        force_authenticate(self.put_request, self.user)
        self.put_response = self.tools_view(self.put_request)
        self.options_request = self.factory.options(self.tools_url_root,
                                                    data=self.tool_json,
                                                    format='json')
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

    def make_node(self, source="http://www.example.com/test_file.txt"):
        test_file = StringIO.StringIO()
        test_file.write('Coffee is really great.\n')
        self.file_store_item = FileStoreItem.objects.create(source=source)

        node = NodeFactory(name="Node {}".format(uuid.uuid4()),
                           assay=self.assay, study=self.study,
                           type=Node.RAW_DATA_FILE,
                           file_item=self.file_store_item)
        attribute = AttributeFactory(node=node, type=Attribute.CHARACTERISTICS,
                                     subtype='coffee', value='coffee')
        AnnotatedNodeFactory(node_id=node.id, attribute_id=attribute.id,
                             study=self.study, assay=self.assay,
                             node_uuid=node.uuid,
                             node_file_uuid=node.file_item.uuid,
                             node_type=node.type, node_name=node.name,
                             attribute_type=attribute.type,
                             attribute_subtype=attribute.subtype,
                             attribute_value=attribute.value)
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
                    Tool.REFINERY_FILE_UUID: node.file_item.uuid,
                }
            )

        with mock.patch.object(
                celery.result.TaskSetResult, 'join',
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
                        self.tool.REFINERY_FILE_UUID: self.node.file_item.uuid,
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
                "full_name": "{} {}".format(self.user.first_name,
                                            self.user.last_name),
                "user_profile_uuid": str(self.user.profile.uuid)
            }
        )

    def test_relaunch_url(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(self.tool.relaunch_url,
                         "/api/v2/tools/{}/relaunch/".format(self.tool.uuid))

    def test_get_relative_container_url(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(
            self.tool.get_relative_container_url(),
            "/{}/{}".format(settings.DJANGO_DOCKER_ENGINE_BASE_URL,
                            self.tool.container_name)
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
        DockerClientWrapper().purge_inactive(0)
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

    def test_tool_launch_has_reasonable_default_display_name(self):
        self.create_tool(tool_type=ToolDefinition.VISUALIZATION)
        self.assertEqual(
            self.tool.display_name,
            " ".join([self.tool.name, self.tool.formatted_creation_date,
                      self.user.username])
        )


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
                'file_url': self.node.file_item.get_datafile_url(),
                VisualizationTool.NODE_SOLR_INFO: {
                    'uuid': node.uuid,
                    'name': node.name,
                    'type': node.type,
                    'file_uuid': node.file_item.uuid,
                    'organism_Characteristics_generic_s': 'Mus musculus',
                    'filename_Characteristics_generic_s': node.file_item.source
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
                    "uuid": str(parameter.uuid),
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
        self.tool.update_galaxy_data(WorkflowTool.GALAXY_IMPORT_HISTORY_DICT,
                                     {'id': 'COFFEE'})
        self.assertEqual(self.tool.galaxy_import_history_id, 'COFFEE')

    def test_analysis_node_connections_are_created_for_all_input_nodes(self):
        self.has_dataset_collection_input_mock_true.start()
        self.create_tool(ToolDefinition.WORKFLOW,
                         file_relationships=self.LIST_LIST_PAIR)
        tool_nodes = self.tool._get_input_nodes()
        analysis_node_connections = [
            AnalysisNodeConnection.objects.get(node=node,
                                               analysis=self.tool.analysis)
            for node in tool_nodes
        ]
        self.assertEqual(len(analysis_node_connections), len(tool_nodes))
        for analysis_node_connection in analysis_node_connections:
            self.assertEqual(analysis_node_connection.direction,
                             INPUT_CONNECTION)
            self.assertEqual(analysis_node_connection.filename,
                             WorkflowTool.INPUT_DATASET_COLLECTION)
            self.assertEqual(analysis_node_connection.step, 0)
            self.assertEqual(
                analysis_node_connection.name,
                analysis_node_connection.node.file_item.datafile.name
            )

    def test_galaxy_parameter_dict_creation(self):
        self.create_tool(ToolDefinition.WORKFLOW,
                         annotation_file_name='LIST:PAIR.json')
        parameters_dict = self.tool._create_workflow_parameters_dict()

        self.assertEqual(parameters_dict[1]["Integer Param"], 1337)
        self.assertEqual(parameters_dict[7]["Float Param"], 1.234)
        self.assertEqual(parameters_dict[1]["String Param"], "Coffee is great")
        self.assertEqual(parameters_dict[2]["Boolean Param"], True)
        self.assertEqual(parameters_dict[4]["Attribute Param"], "Species")
        self.assertEqual(parameters_dict[5]["File Param"],
                         "/media/file_store/file.cool")

        self.assertTrue(self.tool_data_mock.called)

    def test_galaxy_parameter_dict_creation_no_objects_raises_exception(self):
        self.create_tool(ToolDefinition.WORKFLOW,
                         annotation_file_name='LIST:PAIR.json')
        GalaxyParameter.objects.all().delete()
        with self.assertRaises(GalaxyParameter.DoesNotExist):
            self.tool._create_workflow_parameters_dict()

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
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b]
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
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a,
                                          galaxy_job_a, galaxy_job_b,
                                          galaxy_job_b, galaxy_job_a,
                                          galaxy_job_b]
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
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a,
                                          galaxy_job_a, galaxy_job_b,
                                          galaxy_job_b, galaxy_job_a,
                                          galaxy_job_b]
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
                    self.tool.REFINERY_FILE_UUID: self.node.file_item.uuid,
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
                    str(GalaxyParameter.objects.get(name=k).uuid)
                ] = str(parameters_dict[key][k])

        self.assertEqual(
            self.tool.get_tool_launch_config(),
            {
                self.tool.FILE_UUID_LIST: [self.node.file_item.uuid],
                u"dataset_uuid": self.dataset.uuid,
                u"tool_definition_uuid": self.td.uuid,
                Tool.FILE_RELATIONSHIPS: u"[{}]".format(self.node.uuid),
                self.tool.FILE_RELATIONSHIPS_URLS:
                    u"['http://www.example.com/test_file.txt']",
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
                            self.tool.REFINERY_FILE_UUID:
                                self.node.file_item.uuid,
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
        self.node.save()

        self.assertEqual(
            self.tool._get_analysis_group_number(
                self.tool._get_galaxy_history_dataset_list()[0]
            ), 0
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
            self.assertEqual(analysis_node_connections[index].analysis,
                             self.tool.analysis)
            self.assertEqual(analysis_node_connections[index].node, node)
            self.assertEqual(analysis_node_connections[index].direction,
                             INPUT_CONNECTION)
            self.assertEqual(analysis_node_connections[index].name,
                             node.file_item.datafile.name)
            self.assertEqual(analysis_node_connections[index].step, 0)
            self.assertEqual(analysis_node_connections[index].filename,
                             WorkflowTool.INPUT_DATASET_COLLECTION)
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
            self.assertEqual(analysis_node_connections[index].analysis,
                             self.tool.analysis)
            self.assertEqual(analysis_node_connections[index].node, node)
            self.assertEqual(analysis_node_connections[index].direction,
                             INPUT_CONNECTION)
            self.assertEqual(analysis_node_connections[index].name,
                             node.file_item.datafile.name)
            self.assertEqual(analysis_node_connections[index].step, 0)
            self.assertEqual(analysis_node_connections[index].filename,
                             WorkflowTool.INPUT_DATASET)
            self.assertFalse(analysis_node_connections[index].is_refinery_file)

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

        download_ids = self.tool.create_analysis_output_node_connections()

        mock.patch(
            "tool_manager.models.WorkflowTool."
            "create_analysis_output_node_connections",
            return_value=download_ids
        ).start()

        return _get_galaxy_download_task_ids(self.tool.analysis)

    def _attach_derived_nodes_to_dataset_assertions(self):
        self._assert_analysis_node_connection_outputs_validity()
        self.assertEqual(self.show_dataset_provenance_mock.call_count, 8)

    def test_attach_derived_nodes_to_dataset_dsc(self):
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a,
                                          galaxy_job_a, galaxy_job_b,
                                          galaxy_job_b, galaxy_job_a,
                                          galaxy_job_b]
        self._get_galaxy_download_task_ids_wrapper(
            tool_is_data_set_collection_based=True
        )
        self.tool.analysis.attach_derived_nodes_to_dataset()
        self._attach_derived_nodes_to_dataset_assertions()

    def test_attach_derived_nodes_to_dataset_non_dsc(self):
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a,
                                          galaxy_job_a, galaxy_job_b,
                                          galaxy_job_b, galaxy_job_a,
                                          galaxy_job_b]
        self._get_galaxy_download_task_ids_wrapper()
        self.tool.analysis.attach_derived_nodes_to_dataset()
        self._attach_derived_nodes_to_dataset_assertions()

    def test_attach_derived_nodes_to_dataset_same_name_workflow_results(self):
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a,
                                          galaxy_job_a, galaxy_job_b,
                                          galaxy_job_b, galaxy_job_a,
                                          galaxy_job_b]
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
                output_connection.name, output_connection.filetype
            )
            analysis_results = self.tool.analysis.results.filter(
                file_name=output_connection_filename
            )
            self.assertGreater(analysis_results.count(), 1)
        self._attach_derived_nodes_to_dataset_assertions()

    def test_attach_derived_nodes_to_dataset_proper_node_inheritance(self):
        self.show_job_mock.side_effect = [galaxy_job_a, galaxy_job_b,
                                          galaxy_job_a, galaxy_job_a,
                                          galaxy_job_a, galaxy_job_b,
                                          galaxy_job_b, galaxy_job_a,
                                          galaxy_job_b]
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


class WorkflowToolLaunchTests(ToolManagerTestBase):
    tasks_mock = "analysis_manager.tasks"

    def test_workflow_tool_launch_valid_workflow_object(self):
        self.create_tool(ToolDefinition.WORKFLOW)

        self.assertEqual(self.tool.get_owner(), self.user)
        self.assertTrue(self.tool.is_workflow())
        self.assertEqual(
            json.loads(self.tool.analysis.workflow_copy),
            galaxy_workflow_dict
        )
        self.assertEqual(
            self.tool.analysis.workflow_steps_num,
            len(galaxy_workflow_dict["steps"].keys())
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
    def test_get_refinery_import_task_signatures_gets_called_during_import(
            self, retry_mock, ready_mock, successful_mock
    ):
        self.create_tool(ToolDefinition.WORKFLOW)

        with mock.patch(
            "core.models.Analysis.get_refinery_import_task_signatures"
        ) as get_refinery_import_task_signatures_mock:
            _refinery_file_import(self.tool.analysis.uuid)
            self.assertTrue(get_refinery_import_task_signatures_mock.called)
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

    def test_workflow_tool_creation_with_custom_display_name(self):
        display_name = "Test Workflow Custom Name"
        self.create_tool(
            tool_type=ToolDefinition.WORKFLOW,
            display_name=display_name
        )
        self.assertEqual(self.tool.display_name, display_name)


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
    def _start_visualization(self, json_name, file_relationships,
                             assertions=None, count=1):
        self.load_visualizations()

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.td = ToolDefinition.objects.all()[0]

        # Create mock ToolLaunchConfiguration
        tool_launch_configuration = {
            'dataset_uuid': self.dataset.uuid,
            'tool_definition_uuid': self.td.uuid,
            Tool.FILE_RELATIONSHIPS: "[{}]".format(
                self.make_node(source=self.sample_igv_file_url)
            ),
            ToolDefinition.PARAMETERS: {
                str(self.mock_parameter.uuid):
                    self.mock_parameter.default_value
            }
        }
        visualization_tool = create_tool(tool_launch_configuration, self.user)
        with mock.patch('data_set_manager.utils.search_solr',
                        return_value=self.create_solr_mock_response(
                            visualization_tool._get_input_nodes()
                        )):
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
        self._start_visualization('igv.json', self.sample_igv_file_url)

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

    def test_visualization_tool_creation_with_custom_display_name(self):
        display_name = "Test Visualization Custom Name"
        self.create_tool(
            tool_type=ToolDefinition.VISUALIZATION,
            display_name=display_name
        )
        self.assertEqual(self.tool.display_name, display_name)


class ToolEventCreationTests(TestCase):
    def test_visualization_tool_creation_triggers_a_single_event(self):
        create_tool_with_necessary_models("VISUALIZATION")

        # A Tool needs a Dataset to be created. Assert that there is one Event
        # for DataSet creation and one for Tool creation
        self.assertEqual(Event.objects.count(), 2)
        self.assertIsNotNone(Event.objects.get(type=Event.CREATE))
        self.assertIsNotNone(
            Event.objects.get(sub_type=Event.VISUALIZATION_CREATION)
        )

    def test_visualization_tool_single_event_creation_after_two_saves(self):
        tool = create_tool_with_necessary_models("VISUALIZATION")
        tool.save()

        # A Tool needs a Dataset to be created. Assert that there is one Event
        # for DataSet creation and one for Tool creation
        self.assertEqual(Event.objects.count(), 2)
        self.assertIsNotNone(Event.objects.get(type=Event.CREATE))
        self.assertIsNotNone(
            Event.objects.get(sub_type=Event.VISUALIZATION_CREATION)
        )

    def test_workflow_tool_creation_triggers_a_single_event(self):
        create_tool_with_necessary_models("WORKFLOW")

        # A Tool needs a Dataset to be created. Assert that there is one Event
        # for DataSet creation and one for Tool creation
        self.assertEqual(Event.objects.count(), 2)
        self.assertIsNotNone(Event.objects.get(type=Event.CREATE))
        self.assertIsNotNone(
            Event.objects.get(sub_type=Event.ANALYSIS_CREATION)
        )

    def test_workflow_tool_single_event_creation_after_two_saves(self):
        tool = create_tool_with_necessary_models("WORKFLOW")
        tool.save()

        # A Tool needs a Dataset to be created. Assert that there is one Event
        # for DataSet creation and one for Tool creation
        self.assertEqual(Event.objects.count(), 2)
        self.assertIsNotNone(Event.objects.get(type=Event.CREATE))
        self.assertIsNotNone(
            Event.objects.get(sub_type=Event.ANALYSIS_CREATION)
        )
