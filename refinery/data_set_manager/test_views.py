import json
import re

from django.contrib.auth.models import User

from rest_framework.test import APIClient, APIRequestFactory, APITestCase

from core.views import NodeViewSet
from .models import Assay, Investigation, Node, Study


class NodeApiV2Tests(APITestCase):

    def setUp(self):
        self.username = 'guest'
        self.password = 'guest'
        self.user = User.objects.create_user(self.username, '', self.password)

        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)
        self.node = Node.objects.create(assay=self.assay, study=self.study)

        self.node_json = json.dumps([{
            "uuid": "cfb31cca-4f58-4ef0-b1e2-4469c804bf73",
            "relative_file_store_item_url": None,
            "parent_nodes": [],
            "child_nodes": [
                "1d9ee2ee-d804-4458-93b9-b1fb9a08a2c8"
            ],
            "auxiliary_nodes": [],
            "is_auxiliary_node": False,
            "file_extension": None,
            "auxiliary_file_generation_task_state": None,
            "ready_for_igv_detail_view": None
        }])

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.view = NodeViewSet.as_view({'get': 'list'})
        self.client.login(username=self.username, password=self.password)

        # Make a reusable request & response
        self.url_root = '/api/v2/node/'
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
        self.put_request = self.factory.put(self.url_root, data=self.node_json,
                                            format='json')
        self.put_response = self.view(self.put_request)
        self.patch_request = self.factory.patch(self.url_root,
                                                data=self.node_json,
                                                format='json')
        self.patch_response = self.view(self.patch_request)
        self.options_request = self.factory.options(self.url_root,
                                                    data=self.node_json,
                                                    format='json')
        self.options_response = self.view(self.options_request)

    def test_get_request(self):
        self.assertIsNotNone(self.get_response.data[0])

    def test_get_request_anonymous_user(self):
        self.client.logout()
        self.new_get_request = self.factory.get(self.url_root)
        self.new_get_response = self.view(self.new_get_request)
        self.assertIsNotNone(self.new_get_response.data[0])
        self.assertEqual(self.new_get_request.user.id, None)

    def test_unallowed_http_verbs(self):
        self.assertEqual(self.put_response.data['detail'],
                         'Method "PUT" not allowed.')
        self.assertEqual(self.patch_response.data['detail'],
                         'Method "PATCH" not allowed.')
        self.assertEqual(self.options_response.data['detail'],
                         'Method "OPTIONS" not allowed.')

    def test_get_children(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(self.get_response.data[0]['child_nodes'], [])

    def test_get_parents(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(self.get_response.data[0]['parent_nodes'], [])

    def test_get_aux_nodes(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(self.get_response.data[0]['auxiliary_nodes'], [])

    def test_get_aux_node_task_states(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(
            self.get_response.data[0]['auxiliary_file_generation_task_state'],
            None
        )

    def test_get_file_extension(self):
        self.assertEqual(self.get_response.data[0]['file_extension'], None)

    def test_get_relative_file_store_item_url(self):
        self.assertEqual(
            self.get_response.data[0]['relative_file_store_item_url'],
            None
        )

    def test_get_basic_node(self):
        self.assertRegexpMatches(
            self.get_response.data[0]['uuid'],
            re.compile(
                '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            )
        )
        # Assert that the meaningful response fields from Node api v1 are a
        # subset of the response from Node api v2
        # NOTE: Once we move away from a reliance on Node api v1 some of the
        # tests below can most likely be removed
        self.assertTrue('analysis_uuid' in self.get_response.data[0])
        self.assertTrue('assay' in self.get_response.data[0])
        self.assertTrue('file_uuid' in self.get_response.data[0])
        self.assertTrue('name' in self.get_response.data[0])
        self.assertTrue('study' in self.get_response.data[0])
        self.assertTrue('subanalysis' in self.get_response.data[0])
        self.assertTrue('type' in self.get_response.data[0])
        self.assertTrue('uuid' in self.get_response.data[0])
