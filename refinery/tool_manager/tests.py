import json
from urlparse import urljoin

from django.contrib.auth.models import User
from django.test import TestCase

from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

from core.models import ExtendedGroup
from tool_manager.utils import (create_tool_definition_from_workflow,
                                FileTypeValidationError,
                                validate_workflow_annotation,
                                WorkflowAnnotationValidationError)

from .models import ToolDefinition
from .views import ToolDefinitionsViewSet


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

        # Make some sample data
        with open("tool_manager/test-data/workflow_LIST.json") as f:
            create_tool_definition_from_workflow(json.loads(f.read()))
        with open("tool_manager/test-data/workflow_LIST:PAIR.json") as f:
            create_tool_definition_from_workflow(json.loads(f.read()))
        with open("tool_manager/test-data/workflow_LIST:LIST:PAIR.json") as f:
            create_tool_definition_from_workflow(json.loads(f.read()))

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.view(self.get_request)

        self.tool_json = self.get_response.data[0]

        self.delete_request = self.factory.delete(
            urljoin(self.url_root,  self.tool_json['uuid']))
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
        self.assertEqual(ToolDefinition.objects.count(), 3)

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


class ToolDefinitionGenerationTests(TestCase):

    def test_workflow_improperly_annotated(self):
        with open("tool_manager/test-data/workflow_annotation_invalid.json",
                  "r") as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                WorkflowAnnotationValidationError,
                validate_workflow_annotation, workflow_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_invalid_filetype(self):
        with open(
                "tool_manager/test-data/workflow_annotation_bad_filetype.json",
                "r") as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_annotation(workflow_annotation))
            self.assertRaises(FileTypeValidationError,
                              create_tool_definition_from_workflow,
                              workflow_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_with_bad_nesting(self):
        with open(
                "tool_manager/test-data/workflow_annotation_bad_nesting.json",
                "r") as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                WorkflowAnnotationValidationError,
                validate_workflow_annotation, workflow_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_list_workflow_tool_def_generation(self):
        with open("tool_manager/test-data/workflow_LIST.json", "r") as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_annotation(workflow_annotation))
            create_tool_definition_from_workflow(workflow_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            self.assertEqual(td.output_files.count(), 4)
            self.assertEqual(td.parameters.count(), 0)
            self.assertEqual(td.file_relationship.file_relationship.count(), 0)
            self.assertEqual(td.file_relationship.input_files.count(), 1)

    def test_list_pair_workflow_tool_def_generation(self):
        with open("tool_manager/test-data/workflow_LIST:PAIR.json", "r") as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_annotation(workflow_annotation))
            create_tool_definition_from_workflow(workflow_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            self.assertEqual(td.output_files.count(), 1)
            self.assertEqual(td.parameters.count(), 0)
            self.assertEqual(td.file_relationship.file_relationship.count(), 1)
            second_nested_file_relationship = \
                td.file_relationship.file_relationship.all()[0]
            self.assertEqual(
                second_nested_file_relationship.file_relationship.count(), 0)
            self.assertEqual(
                second_nested_file_relationship.input_files.count(), 2)

    def test_list_list_pair_workflow_tool_def_generation(self):
        with open("tool_manager/test-data/workflow_LIST:LIST:PAIR.json",
                  "r") as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_annotation(workflow_annotation))
            create_tool_definition_from_workflow(workflow_annotation)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            td = ToolDefinition.objects.get(name=workflow_annotation["name"])
            self.assertEqual(td.output_files.count(), 1)
            self.assertEqual(td.parameters.count(), 0)
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
