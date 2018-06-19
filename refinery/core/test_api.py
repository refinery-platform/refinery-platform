import json

from django.test import TestCase

from data_set_manager.models import Investigation, Study

from .models import Node


class NodeAPITest(TestCase):
    def setUp(self):
        self.url = '/api/v1/node/'
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.node = Node.objects.create(study=self.study)

    def test_node_list_unauthenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_node_list_count(self):
        response = self.client.get(self.url)
        data = json.loads(response.content)
        self.assertEqual(data['meta']['total_count'], 1)
        self.assertEqual(len(data['objects']), 1)

    def test_node_detail_unauthenticated(self):
        response = self.client.get('{}{}/'.format(self.url, self.node.uuid))
        self.assertEqual(response.status_code, 200)

    def test_node_detail_fields(self):
        response = self.client.get('{}{}/'.format(self.url, self.node.uuid))
        data = json.loads(response.content)
        self.assertIn('analysis_uuid', data)
        self.assertIn('assay', data)
        self.assertIn('attributes', data)
        self.assertIn('file_import_status', data)
        self.assertIn('file_url', data)
        self.assertIn('file_uuid', data)
        self.assertIn('name', data)
        self.assertIn('study', data)
        self.assertIn('type', data)
        self.assertIn('subanalysis', data)
        self.assertIn('uuid', data)
