import logging

from django.test import TestCase


logger = logging.getLogger(__name__)


class UserFilesAPITests(TestCase):

    def test_get(self):
        response = self.client.get('/api/v2/user/files/')
        self.assertEqual(response.status_code, 200)
