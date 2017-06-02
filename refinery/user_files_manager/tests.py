import logging
import json

from django.test import TestCase


logger = logging.getLogger(__name__)


class UserFilesAPITests(TestCase):
    # TODO: Fails, because solr isn't running.
    # Should I mock it, or make this an integration test?
    def test_get(self):
        response = self.client.get('/api/v2/user/files/')
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        # TODO: Load fixtures? This is what happens to be in my index...
        self.assertEqual(content['facet_field_counts'], {})
        self.assertEqual(content['attributes'],
                         [{"display_name": "", "internal_name": ""}])
        self.assertEqual(content['nodes_count'], 4)
        self.assertEqual(len(content['nodes']), 4)
