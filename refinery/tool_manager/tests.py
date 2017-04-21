import json
import logging
import mock
import requests
from urlparse import urljoin

from django.contrib.auth.models import User
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.management import call_command, CommandError
from django.test import TestCase

from django_docker_engine.docker_utils import DockerClientWrapper
from pyvirtualdisplay import Display
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)
from selenium import webdriver

from core.models import ExtendedGroup, WorkflowEngine
from galaxy_connector.models import Instance
from selenium_testing.utils import (MAX_WAIT, wait_until_class_visible)

from .models import (FileRelationship, GalaxyParameter, InputFile,
                     OutputFile, Parameter, Tool, ToolDefinition)
from .utils import (create_tool_definition,
                    FileTypeValidationError,
                    validate_tool_annotation,
                    validate_workflow_step_annotation)
from .views import (ToolDefinitionsViewSet, ToolsViewSet)

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "tool_manager/test_data"


class ToolDefinitionAPITests(APITestCase):
    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)

        self.factory = APIRequestFactory()
        self.view = ToolDefinitionsViewSet.as_view({'get': 'list'})

        self.url_root = '/api/v2/tools/definitions/'

        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )

        # Make some sample data
        with open(
                "{}/visualization_LIST_hello_world.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = json.loads(f.read())
            create_tool_definition(tool_annotation)
        with open("{}/workflow_LIST.json".format(TEST_DATA_PATH)) as f:
            tool_annotation = json.loads(f.read())
            tool_annotation["workflow_engine_uuid"] = self.workflow_engine.uuid
            create_tool_definition(tool_annotation)
        with open("{}/workflow_LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            tool_annotation = json.loads(f.read())
            tool_annotation["workflow_engine_uuid"] = self.workflow_engine.uuid
            create_tool_definition(tool_annotation)
        with open(
                "{}/workflow_LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = json.loads(f.read())
            tool_annotation["workflow_engine_uuid"] = self.workflow_engine.uuid
            create_tool_definition(tool_annotation)

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.view(self.get_request)

        self.tool_json = self.get_response.data[0]

        self.delete_request = self.factory.delete(
            urljoin(self.url_root, self.tool_json['uuid']))
        force_authenticate(self.delete_request, self.user)
        self.delete_response = self.view(self.delete_request)
        self.put_request = self.factory.put(
            self.url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.put_request, self.user)
        self.put_response = self.view(self.put_request)
        self.post_request = self.factory.post(
            self.url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.view(self.post_request)
        self.options_request = self.factory.options(
            self.url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.options_request, self.user)
        self.options_response = self.view(self.options_request)

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
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
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
            for parameter in tool_definition["parameters"]:
                if tool_definition["tool_type"] == ToolDefinition.WORKFLOW:
                    self.assertIn("galaxy_workflow_step", parameter.keys())
                elif (tool_definition["tool_type"] ==
                      ToolDefinition.VISUALIZATION):
                    self.assertNotIn("galaxy_workflow_step", parameter.keys())


class ToolDefinitionGenerationTests(TestCase):
    def setUp(self):
        self.mock_vis_annotations_reference = (
            "tool_manager.management.commands.generate_tool_definitions"
            ".get_visualization_annotations_list"
        )
        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )

    def test_workflow_improperly_annotated(self):
        with open(
                "{}/workflow_annotation_invalid.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_invalid_filetype(self):
        with open(
                "{}/workflow_annotation_bad_filetype.json".format(
                    TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid

            self.assertIsNone(
                validate_tool_annotation(workflow_annotation))
            self.assertRaises(
                FileTypeValidationError,
                create_tool_definition,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_with_bad_nesting(self):
        with open(
                "{}/workflow_annotation_bad_nesting.json".format(
                    TEST_DATA_PATH)
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
                "{}/workflow_annotation_valid_parameters.json".format(
                    TEST_DATA_PATH
                )
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_workflow_with_bad_parameters_validation(self):
        with open(
                "{}/workflow_annotation_invalid_parameters.json".format(
                    TEST_DATA_PATH
                )
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation, workflow_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_list_visualization_tool_def_validation(self):
        with open("{}/visualization_LIST_hello_world.json".format(
                TEST_DATA_PATH
        )) as f:
            visualization_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(visualization_annotation)
            )

    def test_list_visualization_tool_def_generation(self):
        with open(
            "{}/visualization_LIST_igv.json".format(TEST_DATA_PATH)
        ) as f:
            visualization_annotation = json.loads(f.read())
            create_tool_definition(visualization_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(
                name=visualization_annotation["name"]
            )
            self.assertEqual(td.output_files.count(), 0)
            self.assertEqual(td.parameters.count(), 3)
            self.assertEqual(td.file_relationship.file_relationship.count(), 0)
            self.assertEqual(td.file_relationship.input_files.count(), 1)

    def test_list_workflow_tool_def_validation(self):
        with open("{}/workflow_LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_workflow_tool_def_generation(self):
        with open("{}/workflow_LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            self.assertEqual(td.output_files.count(), 4)
            self.assertEqual(td.parameters.count(), 7)
            self.assertEqual(td.file_relationship.file_relationship.count(), 0)
            self.assertEqual(td.file_relationship.input_files.count(), 1)
            self.assertIsNotNone(td.workflow_engine)

    def test_list_pair_workflow_tool_def_validation(self):
        with open("{}/workflow_LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_pair_workflow_tool_def_generation(self):
        with open("{}/workflow_LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            self.assertEqual(td.output_files.count(), 1)
            self.assertEqual(td.parameters.count(), 5)
            self.assertEqual(td.file_relationship.file_relationship.count(), 1)
            second_nested_file_relationship = \
                td.file_relationship.file_relationship.all()[0]
            self.assertEqual(
                second_nested_file_relationship.file_relationship.count(), 0)
            self.assertEqual(
                second_nested_file_relationship.input_files.count(), 2)
            self.assertIsNotNone(td.workflow_engine)

    def test_list_list_pair_workflow_tool_def_validation(self):
        with open(
                "{}/workflow_LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_list_pair_workflow_tool_def_generation(self):
        with open(
                "{}/workflow_LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            self.assertEqual(td.output_files.count(), 1)
            self.assertEqual(td.parameters.count(), 3)
            self.assertEqual(td.file_relationship.file_relationship.count(), 1)
            second_nested_file_relationship = \
                td.file_relationship.file_relationship.all()[0]
            self.assertEqual(
                second_nested_file_relationship.file_relationship.count(), 1)
            third_nested_file_relationship = \
                second_nested_file_relationship.file_relationship.all()[0]
            self.assertEqual(
                third_nested_file_relationship.file_relationship.count(), 0)
            self.assertEqual(
                third_nested_file_relationship.input_files.count(), 2)
            self.assertIsNotNone(td.workflow_engine)

    def test_list_workflow_related_object_deletion(self):
        with open("{}/workflow_LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            td.delete()

            self.assertEqual(ToolDefinition.objects.count(), 0)
            self.assertEqual(FileRelationship.objects.count(), 0)
            self.assertEqual(GalaxyParameter.objects.count(), 0)
            self.assertEqual(Parameter.objects.count(), 0)
            self.assertEqual(InputFile.objects.count(), 0)
            self.assertEqual(OutputFile.objects.count(), 0)

    def test_list_pair_workflow_related_object_deletion(self):
        with open("{}/workflow_LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            td.delete()

            self.assertEqual(ToolDefinition.objects.count(), 0)
            self.assertEqual(FileRelationship.objects.count(), 0)
            self.assertEqual(GalaxyParameter.objects.count(), 0)
            self.assertEqual(Parameter.objects.count(), 0)
            self.assertEqual(InputFile.objects.count(), 0)
            self.assertEqual(OutputFile.objects.count(), 0)

    def test_list_list_pair_workflow_related_object_deletion(self):
        with open(
                "{}/workflow_LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            td.delete()

            self.assertEqual(ToolDefinition.objects.count(), 0)
            self.assertEqual(FileRelationship.objects.count(), 0)
            self.assertEqual(GalaxyParameter.objects.count(), 0)
            self.assertEqual(Parameter.objects.count(), 0)
            self.assertEqual(InputFile.objects.count(), 0)
            self.assertEqual(OutputFile.objects.count(), 0)

    def test_deletion_of_tooldefinitions_objects_only(self):
        with open(
                "{}/workflow_LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td1 = ToolDefinition.objects.get(name=workflow_annotation["name"])
        with open("{}/workflow_LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td2 = ToolDefinition.objects.get(name=workflow_annotation["name"])
        with open("{}/workflow_LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td3 = ToolDefinition.objects.get(name=workflow_annotation["name"])

        td1.delete()

        self.assertEqual(ToolDefinition.objects.count(), 2)
        self.assertEqual(FileRelationship.objects.count(), 3)
        self.assertEqual(GalaxyParameter.objects.count(), 12)
        self.assertEqual(Parameter.objects.count(), 12)
        self.assertEqual(InputFile.objects.count(), 3)
        self.assertEqual(OutputFile.objects.count(), 5)

        td2.delete()

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(FileRelationship.objects.count(), 1)
        self.assertEqual(GalaxyParameter.objects.count(), 7)
        self.assertEqual(Parameter.objects.count(), 7)
        self.assertEqual(InputFile.objects.count(), 1)
        self.assertEqual(OutputFile.objects.count(), 4)

        td3.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)
        self.assertEqual(OutputFile.objects.count(), 0)

    def test_valid_workflow_step_annotations_a(self):
        with open(
                "{}/workflow_step_annotation_valid_a.json".format(
                    TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(
                    workflow_step_annotation
                )
            )

    def test_valid_workflow_step_annotations_b(self):
        with open(
                "{}/workflow_step_annotation_valid_b.json".format(
                    TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(
                    workflow_step_annotation
                )
            )

    def test_valid_workflow_step_annotations_c(self):
        with open(
                "{}/workflow_step_annotation_valid_c.json".format(
                    TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(workflow_step_annotation)
            )

    def test_invalid_workflow_step_annotation_a(self):
        with open(
                "{}/workflow_step_annotation_invalid_a.json".format(
                    TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
            )

    def test_invalid_workflow_step_annotation_b(self):
        with open(
                "{}/workflow_step_annotation_invalid_b.json".format(
                    TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
            )

    def test_invalid_workflow_step_annotation_c(self):
        with open(
                "{}/workflow_step_annotation_invalid_c.json".format(
                    TEST_DATA_PATH)
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
                "{}/invalid_galaxy_workflows.json".format(TEST_DATA_PATH)
            ).read()
        )
        valid_workflows = json.loads(
            open(
                "{}/valid_galaxy_workflows.json".format(TEST_DATA_PATH)
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
                    "{}/visualization_LIST_igv.json".format(TEST_DATA_PATH)
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
                self.assertEqual(Parameter.objects.count(), 12)
                self.assertEqual(InputFile.objects.count(), 6)
                self.assertEqual(OutputFile.objects.count(), 3)

    def test_workflow_pair_too_many_inputs(self):
        with open(
                "{}/workflow_PAIR_too_many_inputs.json".format(TEST_DATA_PATH)
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
                "{}/workflow_PAIR_not_enough_inputs.json".format(
                    TEST_DATA_PATH
                )
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)


class ToolAPITests(APITestCase):
    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)

        self.factory = APIRequestFactory()
        self.view = ToolsViewSet.as_view(
            {
                'get': 'list',
                'post': 'create'
            }
        )

        self.url_root = '/api/v2/tools/'

        # Make some sample data
        with open(
                "{}/visualization_LIST_igv.json".format(TEST_DATA_PATH)
        ) as f:
            self.td = create_tool_definition(json.loads(f.read()))

        # Create mock ToolLaunchConfiguration
        self.post_data = {
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": [
                "http://www.example.com/tool_manager/test_data/sample.seg"
            ],
            "parameters": ""
        }
        self.post_request = self.factory.post(
            self.url_root,
            data=self.post_data,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.view(self.post_request)

        try:
            self.tool_launch = Tool.objects.get(
                tool_definition__uuid=self.td.uuid
            )
        except(Tool.DoesNotExist, Tool.MultipleObjectsReturned) as e:
            raise RuntimeError("Couldn't properly fetch Tool: {}".format(e))

        self.get_request = self.factory.get(self.url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.view(self.get_request)

        self.tool_json = self.get_response.data[0]

        self.delete_request = self.factory.delete(
            urljoin(self.url_root, self.tool_json['uuid']))
        force_authenticate(self.delete_request, self.user)
        self.delete_response = self.view(self.delete_request)
        self.put_request = self.factory.put(
            self.url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.put_request, self.user)
        self.put_response = self.view(self.put_request)
        self.options_request = self.factory.options(
            self.url_root,
            data=self.tool_json,
            format="json"
        )
        force_authenticate(self.options_request, self.user)
        self.options_response = self.view(self.options_request)

    def tearDown(self):
        # Purge Docker Containers that we've spun up
        DockerClientWrapper().purge_by_label(self.tool_launch.uuid)

    def test_tool_launches_exist(self):
        self.assertEqual(Tool.objects.count(), 1)
        self.assertEqual(
            Tool.objects.filter(
                tool_definition__tool_type=ToolDefinition.VISUALIZATION
            ).count(),
            1
        )

    def test_get_request_authenticated(self):
        self.assertIsNotNone(self.get_response)

    def test_get_request_no_auth(self):
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
        self.assertEqual(self.get_response.status_code, 403)

    def test_unallowed_http_verbs(self):
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


class ToolLaunchTests(StaticLiveServerTestCase):
    # Don't delete data migration data after test runs: http://bit.ly/2lAYqVJ
    serialized_rollback = True

    def setUp(self):
        self.display = Display(visible=0, size=(1366, 768))
        self.display.start()
        self.browser = webdriver.Firefox()
        self.browser.maximize_window()

        self.mock_vis_annotations_reference = (
            "tool_manager.management.commands.generate_tool_definitions"
            ".get_visualization_annotations_list"
        )

        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.container_name = ""
        self.factory = APIRequestFactory()
        self.view = ToolsViewSet.as_view({'post': 'create'})
        self.url_root = '/api/v2/tools'

    def tearDown(self):
        # NOTE: quit() destroys ANY currently running webdriver instances.
        # This could become an issue if tests are ever run in parallel.
        self.browser.quit()
        self.display.stop()
        try:
            tool_launch = Tool.objects.get(
                container_name=self.container_name
            )
        except Tool.DoesNotExist:
            pass
        else:
            # Purge Docker Containers that we've spun up
            DockerClientWrapper().purge_by_label(tool_launch.uuid)

    def test_visualization_container_launch_and_access_hello_world(self):
        with open(
                "{}/visualization_LIST_hello_world.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = [json.loads(f.read())]

        with mock.patch(
            self.mock_vis_annotations_reference,
            return_value=tool_annotation
        ) as mocked_method:

            call_command("generate_tool_definitions", visualizations=True)

            self.assertTrue(mocked_method.called)
            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.td = ToolDefinition.objects.all()[0]
            self.post_data = {
                "tool_definition_uuid": self.td.uuid,
                "file_relationships": "",
                "parameters": ""
            }

            self.post_request = self.factory.post(
                self.url_root,
                data=self.post_data,
                format="json"
            )
            force_authenticate(self.post_request, self.user)
            self.post_response = self.view(self.post_request)

            try:
                tool_launch = Tool.objects.get(
                    tool_definition__uuid=self.td.uuid
                )
            except(Tool.DoesNotExist, Tool.MultipleObjectsReturned) as e:
                raise RuntimeError(
                    "Couldn't properly fetch Tool: {}".format(e))

            self.container_name = tool_launch.container_name
            self.assertEqual(tool_launch.get_owner(), self.user)
            self.assertEqual(
                tool_launch.get_tool_type(),
                ToolDefinition.VISUALIZATION
            )

            response = requests.get(
                urljoin(
                    self.live_server_url,
                    tool_launch.get_relative_container_url()
                )
            )
            self.assertIn("Welcome to nginx!", response.content)

    def test_visualization_container_launch_IGV(self):
        with open(
            "{}/visualization_LIST_igv.json".format(TEST_DATA_PATH)
        ) as f:
            tool_annotation = [json.loads(f.read())]

        with mock.patch(
            self.mock_vis_annotations_reference,
            return_value=tool_annotation
        ) as mocked_method:

            call_command("generate_tool_definitions", visualizations=True)

            self.assertTrue(mocked_method.called)
            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.td = ToolDefinition.objects.all()[0]

            # Create mock ToolLaunchConfiguration
            self.post_data = {
                "tool_definition_uuid": self.td.uuid,
                "file_relationships": [
                    urljoin(
                        self.live_server_url,
                        "tool_manager/test_data/sample.seg"
                    )
                ],
                "parameters": ""
            }

            self.post_request = self.factory.post(
                self.url_root,
                data=self.post_data,
                format="json"
            )
            force_authenticate(self.post_request, self.user)
            self.post_response = self.view(self.post_request)

            try:
                tool_launch = Tool.objects.get(
                    tool_definition__uuid=self.td.uuid
                )
            except(Tool.DoesNotExist, Tool.MultipleObjectsReturned) as e:
                raise RuntimeError(
                    "Couldn't properly fetch Tool: {}".format(e))

            self.container_name = tool_launch.container_name
            self.assertEqual(tool_launch.get_owner(), self.user)
            self.assertEqual(
                tool_launch.get_tool_type(),
                ToolDefinition.VISUALIZATION
            )
            # Check to see if IGV shows what we want
            igv_url = urljoin(
                self.live_server_url,
                tool_launch.get_relative_container_url()
            )

            self.browser.get(igv_url)

            wait_until_class_visible(self.browser, "igv-track-label", MAX_WAIT)
            self.assertEqual(
                "sample.seg",
                self.browser.find_elements_by_class_name(
                    "igv-track-label"
                )[0].text
            )
