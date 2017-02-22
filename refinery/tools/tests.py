from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIRequestFactory, APIClient

from core.models import ExtendedGroup
from factory_boy.utils import make_tool_definitions
from tools.models import ToolDefinition
from tools.views import ToolDefinitionsViewSet


class ToolDefinitionAPITests(APITestCase):

    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.view = ToolDefinitionsViewSet.as_view({'get': 'list'})

        self.url_root = '/api/v2/tools/definitions/'

        self.client.login(username=self.username, password=self.password)

        # Make some sample data
        make_tool_definitions()

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)

    def test_tool_definitions_exist(self):
        self.assertEqual(ToolDefinition.objects.count(), 2)

    def test_get_request(self):
        self.assertIsNotNone(self.get_response)
        self.assertEqual(
            self.get_response.data[0]["description"], "Chip Seq using MACS2")
        self.assertEqual(
            self.get_response.data[1]["description"], "LIST:LIST:PAIR desc")
