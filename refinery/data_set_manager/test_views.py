import uuid

from django.contrib.auth.models import User

from rest_framework.test import (APIClient, APIRequestFactory, APITestCase,
                                 force_authenticate)
from factory_boy.utils import create_dataset_with_necessary_models

from .views import AddFileToNodeView


class AddFileToNodeViewTests(APITestCase):
    def setUp(self):
        self.username = 'guest_user'
        self.password = User.objects.make_random_password()
        self.user = User.objects.create_user(self.username, 'user@fake.com',
                                             self.password)

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.url_root = '/api/v2/data_set_manager/add-file/'
        self.view = AddFileToNodeView.as_view()
        self.client.login(username=self.username, password=self.password)

        # Create Datasets
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.node = self.data_set.get_nodes()[0]

        self.post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': self.node.uuid},
            format="json"
        )

    def test_post_returns_404_invalid_uuid(self):
        post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': uuid.uuid4()},
            format="json"
        )
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 404)

    def test_post_returns_403_for_non_owners(self):
        user_lm = User.objects.create_user('lab_member',
                                           'member@fake.com',
                                           self.password)
        self.post_request.user = user_lm
        force_authenticate(self.post_request, user=user_lm)
        post_response = self.view(self.post_request)
        self.assertEqual(post_response.status_code, 403)

    def test_post_returns_success_202_with_no_files(self):
        self.post_request.user = self.user
        force_authenticate(self.post_request, user=self.user)
        post_response = self.view(self.post_request)
        self.assertEqual(post_response.status_code, 202)

    def test_post_returns_400_node_uuid_not_present(self):
        post_request = self.factory.post(
            self.url_root,
            data={},
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)
