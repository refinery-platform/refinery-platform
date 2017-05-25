import logging

from django.contrib.auth.models import User

from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

from core.models import (ExtendedGroup)

from .views import AllFilesViewSet

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "all_files_manager/test_data"


class AllFilesAPITests(APITestCase):
    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)

        self.factory = APIRequestFactory()
        self.view = AllFilesViewSet.as_view({'get': 'list'})

        self.url_root = '/api/v2/all_files/'

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.url_root)
        force_authenticate(self.get_request, self.user)
        self.get_response = self.view(self.get_request)

        self.delete_request = self.factory.delete()
        force_authenticate(self.delete_request, self.user)
        self.delete_response = self.view(self.delete_request)

        self.put_request = self.factory.put(
            self.url_root,
            data={},
            format="json"
        )
        force_authenticate(self.put_request, self.user)
        self.put_response = self.view(self.put_request)

        self.post_request = self.factory.post(
            self.url_root,
            data={},
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.view(self.post_request)

        self.options_request = self.factory.options(
            self.url_root,
            data={},
            format="json"
        )
        force_authenticate(self.options_request, self.user)
        self.options_response = self.view(self.options_request)

    def test_get_request_authenticated(self):
        self.assertIsNotNone(self.get_response)

    def test_get_request_no_auth(self):
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
        self.assertEqual(self.get_response.status_code, 200)

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
