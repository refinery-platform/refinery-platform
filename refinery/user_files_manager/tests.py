import logging
from urlparse import urljoin

from django.contrib.staticfiles.testing import StaticLiveServerTestCase

from guardian.utils import get_anonymous_user
import requests
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

from .views import UserFiles

logger = logging.getLogger(__name__)


class UserFilesAPITests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = UserFiles.as_view()
        self.url_root = '/api/v2/user/files/'
        self.user = get_anonymous_user()

    def test_get(self):
        request = self.factory.get(self.url_root)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertItemsEqual(sorted(response.data.keys()), [
            'attributes',
            'facet_field_counts',
            'nodes',
            'nodes_count'
        ])


class UserFilesUITests(StaticLiveServerTestCase):
    def test_get(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'user/files/'
            )
        )
        self.assertIn("All Files", response.content)
