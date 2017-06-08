import logging

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import TestCase

logger = logging.getLogger(__name__)


class UserFilesAPITests(TestCase):
    pass
    # TODO: Fails, because solr isn't running.
    # Should I mock it, or make this an integration test?

    # def test_get(self):
    #     response = self.client.get('/api/v2/user/files/')
    #     self.assertEqual(response.status_code, 200)


class UserFilesUITests(StaticLiveServerTestCase):
    pass
    # TODO: requests.get(self.live_server_url)
