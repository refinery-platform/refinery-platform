import logging
import requests

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import TestCase
from urlparse import urljoin

logger = logging.getLogger(__name__)


class UserFilesAPITests(TestCase):
    pass
    # TODO: Fails, because solr isn't running.
    # Should I mock it, or make this an integration test?

    # def test_get(self):
    #     response = self.client.get('/api/v2/user/files/')
    #     self.assertEqual(response.status_code, 200)


class UserFilesUITests(StaticLiveServerTestCase):
    def test_ui_loads(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'user_files/'
            )
        )
        self.assertIn("All Files", response.content)
