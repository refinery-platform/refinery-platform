import StringIO
import json
import logging
import re
import time
from urlparse import urljoin
import uuid

from django.contrib.auth.models import User
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.management import CommandError, call_command
from django.http import HttpResponseBadRequest
from django.test import TestCase

import mock
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

from analysis_manager.tasks import run_analysis
from core.models import ExtendedGroup, Project, Workflow, WorkflowEngine
from data_set_manager.models import Assay, Node
from factory_boy.utils import create_dataset_with_necessary_models
from file_store.models import FileStoreItem
from galaxy_connector.models import Instance
from selenium_testing.utils import (MAX_WAIT, SeleniumTestBaseGeneric,
                                    wait_until_class_visible)

from .models import (FileRelationship, GalaxyParameter, InputFile, OutputFile,
                     Parameter, Tool, ToolDefinition)
from .utils import (FileTypeValidationError, create_tool,
                    create_tool_definition, validate_tool_annotation,
                    validate_tool_launch_configuration,
                    validate_workflow_step_annotation)
from .views import ToolDefinitionsViewSet, ToolsViewSet

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "tool_manager/test_data"


class ToolManagerTestBase(TestCase):
    # Some members in assertions are truncated if they are too long, but we
    # want to see them in their entirety
    maxDiff = None

    def setUp(self):
        self.public_group = ExtendedGroup.objects.public_group()
        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow_engine.set_manager_group(self.public_group.manager_group)

        self.dataset = create_dataset_with_necessary_models()

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

    def create_valid_tool(self, tool_type, annotation_file_name=None):
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

        test_file = StringIO.StringIO()
        test_file.write('Coffee is really great.\n')
        file_store_item = FileStoreItem.objects.create(
            source="http://www.example.com/test_file.txt"
        )

        study = self.dataset.get_latest_study()
        assay = Assay.objects.get(study=study)

        self.node = Node.objects.create(
            name="n0",
            assay=assay,
            study=study,
            file_uuid=file_store_item.uuid
        )

        # Create mock ToolLaunchConfiguration
        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": "[{}]".format(self.node.uuid),
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
                self.post_response = self.tools_view(self.post_request)
                self.assertTrue(run_mock.called)

        # Mock the run_analysis task
        elif tool_type == ToolDefinition.WORKFLOW:
            with mock.patch.object(run_analysis, 'delay', side_effect=None):
                self.post_response = self.tools_view(self.post_request)

        self.tool = Tool.objects.get(tool_definition__uuid=self.td.uuid)
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
            "django_docker_engine.docker_utils.DockerClientWrapper.pull"
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

    def test_create_valid_tool(self):
        with self.assertRaises(RuntimeError):
            self.create_valid_tool("Coffee is not a valid tool type")


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
            for parameter in tool_definition["parameters"]:
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

    def test_workflow_invalid_filetype(self):
        with open(
            "{}/workflows/annotation_bad_filetype.json".format(TEST_DATA_PATH)
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

    def test_workflow_with_bad_parameters_validation(self):
        with open(
            "{}/workflows/annotation_invalid_parameters.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation, workflow_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 0)

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

        self.assertEqual(self.td.output_files.count(), 0)
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

        self.assertEqual(self.td.output_files.count(), 4)
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
        self.assertEqual(self.td.output_files.count(), 1)
        self.assertEqual(self.td.parameters.count(), 5)
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
        self.assertEqual(self.td.output_files.count(), 1)
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
        self.assertEqual(self.td.output_files.count(), 1)
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
        self.assertEqual(OutputFile.objects.count(), 0)

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
        self.assertEqual(OutputFile.objects.count(), 0)

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
        self.assertEqual(OutputFile.objects.count(), 0)

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
        self.assertEqual(OutputFile.objects.count(), 0)

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

    def test_invalid_workflow_step_annotation_a(self):
        with open(
            "{}/workflows/step_annotation_invalid_a.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
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
                self.assertEqual(OutputFile.objects.count(), 3)

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
        self.create_valid_tool(ToolDefinition.VISUALIZATION)

        tool = Tool.objects.get(
            tool_definition__uuid=self.td.uuid
        )
        self.assertEqual(
            tool.__str__(),
            "Tool: VISUALIZATION Test LIST Visualization IGV {}".format(
                tool.uuid
            )
        )

    def test_tool_container_removed_on_deletion(self):
        self.create_valid_tool(ToolDefinition.VISUALIZATION)
        with mock.patch(
            "django_docker_engine.docker_utils.DockerClientWrapper"
            ".purge_by_label"
        ) as purge_mock:
            Tool.objects.get(tool_definition__uuid=self.td.uuid).delete()
            self.assertTrue(purge_mock.called)

    def test_node_uuids_get_populated_with_urls(self):
        self.create_vis_tool_definition()

        study = self.dataset.get_latest_study()
        assay = Assay.objects.get(study=study)

        test_file_a = StringIO.StringIO()
        test_file_a.write('Coffee is great.\n')
        file_store_item_a = FileStoreItem.objects.create(
            datafile=InMemoryUploadedFile(
                test_file_a,
                field_name='tempfile',
                name='test_file_a.txt',
                content_type='text/plain',
                size=len(test_file_a.getvalue()),
                charset='utf-8'
            )
        )
        test_file_b = StringIO.StringIO()
        test_file_b.write('Coffee is really great.\n')
        file_store_item_b = FileStoreItem.objects.create(
            datafile=InMemoryUploadedFile(
                test_file_b,
                field_name='tempfile',
                name='test_file_b.txt',
                content_type='text/plain',
                size=len(test_file_b.getvalue()),
                charset='utf-8'
            )
        )
        node_a = Node.objects.create(
            name="n0",
            assay=assay,
            study=study,
            file_uuid=file_store_item_a.uuid
        )
        node_b = Node.objects.create(
            name="n0",
            assay=assay,
            study=study,
            file_uuid=file_store_item_b.uuid
        )

        post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": "[{}, {}]".format(
                node_a.uuid,
                node_b.uuid
            )
        }
        post_request = self.factory.post(
            self.tools_url_root,
            data=post_data,
            format="json"
        )
        force_authenticate(post_request, self.user)

        # We don't want to spin up containers for unit testing
        with mock.patch(
                "django_docker_engine.docker_utils.DockerClientWrapper.run"
        ) as run_mock:
            self.post_response = self.tools_view(post_request)
            self.assertTrue(run_mock.called)

        tool = Tool.objects.get(
            tool_definition__uuid=self.td.uuid
        )

        file_relationships = tool.get_file_relationships_urls()

        # Build regex and assert that the file_relationships structure is
        # populated from the FileStoreItem's datafiles that we've associated
        # with the Nodes above
        regex = re.compile(r"test_file_[ab]\.txt")
        for url in file_relationships:
            self.assertIsNotNone(regex.search(url))

    def test_get_tool_launch_config(self):
        self.create_valid_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(
            self.tool.get_tool_launch_config(),
            {
                'file_uuid_list': [self.node.file_uuid],
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                "file_relationships": (
                    "[{}]".format(self.node.uuid)
                ),
                "file_relationships_urls": (
                    "['http://www.example.com/test_file.txt']"
                )
            }
        )

    def test_get_file_relationships_urls(self):
        self.create_valid_tool(ToolDefinition.WORKFLOW)
        self.assertEqual(
            self.tool.get_file_relationships_urls(),
            ['http://www.example.com/test_file.txt']
        )

    def test_launch_workflow_wrong_tool_type(self):
        self.create_valid_tool(ToolDefinition.VISUALIZATION)
        with self.assertRaises(NotImplementedError):
            self.tool._launch_workflow()

    def test_set_analysis_wrong_type(self):
        self.create_valid_tool(ToolDefinition.WORKFLOW)
        with self.assertRaises(RuntimeError):
            self.tool.set_analysis(str(uuid.uuid4()))


class ToolAPITests(APITestCase, ToolManagerTestBase):
    def test_tools_exist(self):
        self.create_valid_tool(ToolDefinition.VISUALIZATION)
        self.assertEqual(Tool.objects.count(), 1)
        self.assertEqual(
            Tool.objects.filter(
                tool_definition__tool_type=ToolDefinition.VISUALIZATION
            ).count(),
            1
        )

    def test_get_request_authenticated(self):
        self.create_valid_tool(ToolDefinition.VISUALIZATION)
        self.assertIsNotNone(self.get_response)

    def test_get_request_no_auth(self):
        self.create_valid_tool(ToolDefinition.WORKFLOW)
        self.get_request = self.factory.get(self.tools_url_root)
        self.get_response = self.tools_view(self.get_request)
        self.assertEqual(self.get_response.status_code, 403)

    def test_get_request_tools_owned_by_user(self):
        # Creates a valid Tool for self.user
        self.create_valid_tool(ToolDefinition.VISUALIZATION)

        # Try to GET the aforementioned Tool, and assert that another user
        # can't do so
        force_authenticate(self.get_request, self.user2)
        self.get_response = self.tools_view(self.get_request)
        self.assertEqual(len(self.get_response.data), 0)

    def test_unallowed_http_verbs(self):
        self.create_valid_tool(ToolDefinition.WORKFLOW)
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
            "file_relationships": {
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
            "file_relationships": str(
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

    def test_bad_extra_directories_path_with_rollback(self):
        with open("{}/visualizations/"
                  "LIST_visualization_bad_extra_directories_path.json"
                  .format(TEST_DATA_PATH)) as f:
            visualization_annotation = json.loads(f.read())
            create_tool_definition(visualization_annotation)

        td = ToolDefinition.objects.get(
            name=visualization_annotation["name"]
        )

        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": td.uuid,
            "file_relationships": str(["www.example.com"])
        }
        self.post_request = self.factory.post(
            self.tools_url_root,
            data=tool_launch_configuration,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.tools_view(self.post_request)

        self.assertIsInstance(self.post_response, HttpResponseBadRequest)
        self.assertEqual(
            self.post_response.content,
            'Specified path: `not_an_absolute_path` is not absolute'
        )
        self.assertEqual(Tool.objects.count(), 0)

    def test_good_extra_directories_path(self):
        with open("{}/visualizations/"
                  "LIST_visualization_good_extra_directories.json"
                  .format(TEST_DATA_PATH)) as f:
            visualization_annotation = json.loads(f.read())
            create_tool_definition(visualization_annotation)

        td = ToolDefinition.objects.get(
            name=visualization_annotation["name"]
        )

        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": td.uuid,
            "file_relationships": str(["www.example.com"])
        }
        self.post_request = self.factory.post(
            self.tools_url_root,
            data=tool_launch_configuration,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        # We don't want to spin up containers for unit testing
        with mock.patch(
            "django_docker_engine.docker_utils.DockerClientWrapper.run"
        ) as run_mock:
            self.post_response = self.tools_view(self.post_request)
            self.assertTrue(run_mock.called)

        self.assertEqual(self.post_response.status_code, 200)
        self.assertEqual(Tool.objects.count(), 1)


class ToolLaunchTests(ToolManagerTestBase):
    def test_transaction_rollback_bad_dataset_uuid(self):
        self.create_vis_tool_definition()

        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": str(["www.example.com/cool_file.txt"])
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

    def test_workflow_tool_launch_valid_workflow_object(self):
        self.create_valid_tool(ToolDefinition.WORKFLOW)

        self.assertEqual(self.tool.get_owner(), self.user)
        self.assertEqual(self.tool.get_tool_type(), ToolDefinition.WORKFLOW)
        self.assertEqual(
            json.loads(self.post_response.content)["tool_url"],
            '/data_sets2/{}/#/analyses/'.format(self.tool.dataset.uuid)
        )

    def test_many_tools_can_be_launched_from_same_dataset(self):
        self.dataset = create_dataset_with_necessary_models()
        tool_a = self.create_valid_tool(ToolDefinition.VISUALIZATION)
        tool_b = self.create_valid_tool(ToolDefinition.WORKFLOW)

        self.assertEqual(tool_a.dataset, tool_b.dataset)


class ToolLaunchSeleniumTests(ToolManagerTestBase, SeleniumTestBaseGeneric):
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

    def test_visualization_container_launch_IGV(self):
        with open("{}/visualizations/igv.json".format(TEST_DATA_PATH)) as f:
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
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                "file_relationships": "['{}']".format(
                    urljoin(
                        self.live_server_url,
                        "tool_manager/test_data/sample.seg"
                    )
                )
            }

            self.post_request = self.factory.post(
                self.tools_url_root,
                data=self.post_data,
                format="json"
            )
            force_authenticate(self.post_request, self.user)
            self.post_response = self.tools_view(self.post_request)

            tool_launch = Tool.objects.get(
                tool_definition__uuid=self.td.uuid
            )

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
            time.sleep(5)

            wait_until_class_visible(self.browser, "igv-track-label", MAX_WAIT)
            self.assertEqual(
                "sample.seg",
                self.browser.find_elements_by_class_name(
                    "igv-track-label"
                )[0].text
            )

    def test_visualization_container_launch_HiGlass(self):
        with open(
            "{}/visualizations/higlass.json".format(TEST_DATA_PATH)
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
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                "file_relationships": str(
                    [
                        "https://s3.amazonaws.com/pkerp/public/"
                        "dixon2012-h1hesc-hindiii-allreps-filtered."
                        "1000kb.multires.cool"
                    ]
                )
            }

            self.post_request = self.factory.post(
                self.tools_url_root,
                data=self.post_data,
                format="json"
            )
            force_authenticate(self.post_request, self.user)
            self.post_response = self.tools_view(self.post_request)

            tool_launch = Tool.objects.get(
                tool_definition__uuid=self.td.uuid
            )
            self.assertEqual(tool_launch.get_owner(), self.user)
            self.assertEqual(
                tool_launch.get_tool_type(),
                ToolDefinition.VISUALIZATION
            )
            # TODO: Add selenium-based test once higlass relative paths fixed


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
            "file_relationships": "!!{}!!".format(
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
            "file_relationships": str(
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
            "The `file_relationships` defined didn't yield a valid "
            "LIST/PAIR nesting.",
            context.exception.message
        )

    def test_invalid_TLC_non_file_relationships_unbalanced(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": str(
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
            "file_relationships": str(["www.example.com/cool_file.txt"])
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
            "file_relationships": str(
                ["coffee"]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_LIST_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": str(
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
            "file_relationships": str(
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
            "file_relationships": str(
                ("coffee", "coffee")
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_PAIR_LIST(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            "file_relationships": str(
                (["coffee", "coffee"], ["coffee", "coffee"])
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)
