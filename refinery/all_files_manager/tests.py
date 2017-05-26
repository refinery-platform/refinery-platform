import logging

from django.test import TestCase


logger = logging.getLogger(__name__)


class AllFilesAPITests(TestCase):

    def test_get(self):
        response = self.client.get('/api/v2/all_files/')
        self.assertEqual(response.status_code, 200)
