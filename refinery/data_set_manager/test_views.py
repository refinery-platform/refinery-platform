import mock
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.test import override_settings

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

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws")
    def test_aws_post_returns_400_no_identity_id(self):
        post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': uuid.uuid4()},
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws")
    def test_aws_post_returns_202_with_identity_id(self):
        post_request = self.factory.post(
            self.url_root,
            data={
                'node_uuid': self.node.uuid,
                'identity_id': uuid.uuid4()
            },
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 202)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="not aws")
    def test_non_aws_post_returns_400_if_identity_id(self):
        post_request = self.factory.post(
            self.url_root,
            data={
                'node_uuid': self.node.uuid,
                'identity_id': uuid.uuid4()
            },
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws",
                       UPLOAD_BUCKET="test_bucket",
                       REFINERY_DATA_IMPORT_DIR="/import/path",
                       CELERY_ALWAYS_EAGER=True)
    @mock.patch("data_set_manager.models.Node.update_solr_index")
    def test_aws_post_file_store_item_source_translated(self,
                                                        update_solr_mock):
        file_store_item = self.node.get_file_store_item()
        file_store_item.source = "{}/{}/test.txt".format(
            settings.REFINERY_DATA_IMPORT_DIR,
            self.user.username
        )
        file_store_item.save()
        post_request = self.factory.post(
            self.url_root,
            data={
                'node_uuid': self.node.uuid,
                'identity_id': "test_identity_id"
            },
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        self.view(post_request)
        self.assertEqual(self.node.get_file_store_item().source,
                         's3://test_bucket/test_identity_id/test.txt')
        self.assertTrue(update_solr_mock.called)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="not aws",
                       REFINERY_DATA_IMPORT_DIR="/import/path",
                       CELERY_ALWAYS_EAGER=True)
    @mock.patch("data_set_manager.models.Node.update_solr_index")
    def test_non_aws_post_file_store_item_source_translated(self,
                                                            update_solr_mock):
        file_store_item_source = "{}/{}/test.txt".format(
            settings.REFINERY_DATA_IMPORT_DIR,
            self.user.username
        )
        file_store_item = self.node.get_file_store_item()
        file_store_item.source = file_store_item_source
        file_store_item.save()

        post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': self.node.uuid},
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        self.view(post_request)
        self.assertEqual(self.node.get_file_store_item().source,
                         file_store_item_source)
        self.assertTrue(update_solr_mock.called)
