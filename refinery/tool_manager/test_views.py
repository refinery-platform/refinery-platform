import json
import logging
import uuid
from urlparse import urljoin

import mock
from django.http import HttpResponseBadRequest
from django.test import override_settings
from django_docker_engine.docker_utils import DockerClientWrapper
from guardian.shortcuts import assign_perm, remove_perm
from rest_framework.test import (APITestCase,
                                 force_authenticate)

from core.models import Analysis
from factory_boy.utils import create_dataset_with_necessary_models
from tool_manager.serializers import ToolDefinitionSerializer
from .models import (Tool, ToolDefinition, VisualizationTool,
                     WorkflowTool)
from .utils import create_tool_definition
from .tests import ToolManagerTestBase

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "tool_manager/test_data"


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
            "{}?data_set_uuid={}".format(
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

    def test_request_without_any_params_returns_all(self):
        get_request = self.factory.get(self.tool_defs_url_root)
        force_authenticate(get_request, self.user)
        get_response = self.tool_defs_view(get_request)
        serialized_data = ToolDefinitionSerializer(
            ToolDefinition.objects.all(), many=True
        ).data
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data, serialized_data)

    def test_request_without_data_set_uuid_returns_all(self):
        serialized_data = ToolDefinitionSerializer(
            ToolDefinition.objects.all(), many=True
        ).data
        self.assertEqual(self.get_response.status_code, 200)
        self.assertEqual(self.get_response.data, serialized_data)

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
            "{}?data_set_uuid={}".format(
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

    def test_missing_dataset_in_get_yields_bad_request(self):
        dataset_uuid = str(uuid.uuid4())

        get_request = self.factory.get(
            "{}?data_set_uuid={}".format(
                self.tool_defs_url_root,
                dataset_uuid
            )
        )
        force_authenticate(get_request, self.user)
        get_response = self.tool_defs_view(get_request)
        self.assertEqual(get_response.status_code, 400)
        self.assertIn("Couldn't fetch DataSet", get_response.content)


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
        self.assertEqual(self.get_response.status_code, 403)

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

        DockerClientWrapper().purge_inactive(0)

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
        DockerClientWrapper().purge_inactive(0)
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
            json.loads(get_response.content)["container_url"],
            self.tool.get_relative_container_url()
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
        self.assertIn(
            "User: {} does not have permission to view {}: {}".format(
                self.user.username, self.tool.name, self.tool.uuid
            ),
            get_response.content
        )

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
            'is_running': self.tool.is_running(),
            'name': self.tool.name,
            'owner': self.tool._get_owner_info_as_dict(),
            'relaunch_url': self.tool.relaunch_url,
            'tool_definition':
                ToolDefinitionSerializer(self.tool.tool_definition).data,
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
            self.assertTemplateUsed(
                get_response,
                'tool_manager/vis-tool-error.html'
            )
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
                get_request, uuid=self.tool.uuid
            )
            self.assertEqual(json.loads(get_response.content),
                             self.tool.get_container_input_dict())

    def test_get_container_input_data_detail_route_bad_uuid(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        get_request = self.factory.get(self.tool.container_input_json_url)
        get_response = self.tool_container_input_data_view(
            get_request,
            uuid=str(uuid.uuid4())  # uuid doesn't correspond to any Tool
        )
        self.assertEqual(get_response.status_code, 404)

    def test_tool_creation_with_same_display_name_yields_helpful_error(self):
        display_name = "Test Tool Name"
        self.create_tool(ToolDefinition.WORKFLOW, display_name=display_name)
        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(["www.example.com/cool_file.txt"]),
            "display_name": display_name
        }
        self.post_request = self.factory.post(
            self.tools_url_root,
            data=self.post_data,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.tools_view(self.post_request)
        self.assertEqual(self.post_response.status_code, 400)
        self.assertEqual(
            "A Tool already exists with a display_name of: '{}'".format(
                display_name
            ),
            self.post_response.content
        )

    def test_vis_tool_deletion(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)
        delete_request = self.factory.delete(
            self.tool.get_relative_container_url()
        )
        delete_request.user = self.user
        delete_response = self.tools_view(delete_request, uuid=self.tool.uuid)
        self.assertEqual(delete_response.status_code, 200)
        with self.assertRaises(VisualizationTool.DoesNotExist):
            VisualizationTool.objects.get(uuid=self.tool.uuid)

    def test_vis_tool_deletion_no_tool_uuid(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)
        delete_request = self.factory.delete(
            self.tool.get_relative_container_url()
        )
        delete_request.user = self.user
        delete_response = self.tools_view(delete_request)
        self.assertEqual(delete_response.status_code, 400)

    def test_vis_tool_deletion_disallows_non_owners(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        delete_request = self.factory.delete(
            self.tool.get_relative_container_url()
        )
        delete_response = self.tools_view(delete_request, uuid=self.tool.uuid)
        self.assertEqual(delete_response.status_code, 403)

    def test_vis_tool_deletion_no_tool_exists(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        delete_request = self.factory.delete(
            self.tool.get_relative_container_url()
        )
        self.tool.delete()
        delete_response = self.tools_view(delete_request, uuid=self.tool.uuid)
        self.assertEqual(delete_response.status_code, 404)

    @mock.patch.object(VisualizationTool, "delete", side_effect=RuntimeError)
    def test_vis_tool_deletion_rollback_on_failure(self, vis_delete_mock):
        self.create_tool(ToolDefinition.VISUALIZATION)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)
        delete_request = self.factory.delete(
            self.tool.get_relative_container_url()
        )
        delete_request.user = self.user
        delete_response = self.tools_view(delete_request, uuid=self.tool.uuid)
        self.assertEqual(delete_response.status_code, 400)
        self.assertIsNotNone(
            VisualizationTool.objects.get(uuid=self.tool.uuid)
        )
        self.assertTrue(vis_delete_mock.called)
