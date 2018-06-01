import json
import random
import string
from urlparse import urljoin


from django.contrib.auth.models import User
from django.utils.functional import SimpleLazyObject

import mock
import mockcache as memcache
from rest_framework.test import (
    APIClient, APIRequestFactory, APITestCase, force_authenticate
)
from data_set_manager.models import (Assay, Investigation, Node, Study)
from factory_boy.django_model_factories import (
    GalaxyInstanceFactory, WorkflowEngineFactory, WorkflowFactory
)
from factory_boy.utils import create_dataset_with_necessary_models

from .models import (Analysis, DataSet, ExtendedGroup, Project,
                     Workflow, WorkflowEngine)
from .views import AnalysesViewSet, DataSetsViewSet, WorkflowViewSet

cache = memcache.Client(["127.0.0.1:11211"])


class APIV2TestCase(APITestCase):
    def setUp(self, **kwargs):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, 'user@fake.com',
                                             self.password)

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.url_root = '/api/v2/{}'.format(kwargs.get("api_base_name"))
        self.view = kwargs.get("view")

        self.client.login(username=self.username, password=self.password)


class DataSetApiV2Tests(APIV2TestCase):
    def create_rand_str(self, count):
        return ''.join(
            random.choice(string.ascii_lowercase) for _ in xrange(count)
        )

    def setUp(self):
        super(DataSetApiV2Tests, self).setUp(
            api_base_name="datasets/",
            view=DataSetsViewSet.as_view()
        )

        # Create Datasets
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.data_set_2 = create_dataset_with_necessary_models(user=self.user)

        self.node_json = json.dumps([{
            "uuid": "cfb31cca-4f58-4ef0-b1e2-4469c804bf73",
            "relative_file_store_item_url": None,
            "parent_nodes": [],
            "child_nodes": [
                "1d9ee2ee-d804-4458-93b9-b1fb9a08a2c8"
            ],
            "auxiliary_nodes": [],
            "is_auxiliary_node": False,
            "file_extension": None,
            "auxiliary_file_generation_task_state": None,
            "ready_for_igv_detail_view": None
        }])

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
        self.put_request = self.factory.put(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.put_response = self.view(self.put_request)
        self.options_request = self.factory.options(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.options_response = self.view(self.options_request)

    def test_unallowed_http_verbs(self):
        self.assertEqual(
            self.put_response.data['detail'], 'Method "PUT" not allowed.')
        self.assertEqual(
            self.options_response.data['detail'], 'Method "OPTIONS" not '
                                                  'allowed.')

    def test_get_data_set_with_auth(self):
        self.get_request.user = self.user
        get_response = self.view(self.get_request)
        self.assertEqual(len(get_response.data), 2)

    def test_get_data_set_with_anon_user(self):
        self.assertEqual(len(self.get_response.data), 0)

    @mock.patch('core.views.DataSetsViewSet.is_filtered_data_set')
    def test_get_data_set_not_call_helper_method(self, mock_is_filtered):
        self.get_request.user = self.user
        self.view(self.get_request)
        self.assertFalse(mock_is_filtered.called)

    @mock.patch('core.views.DataSetsViewSet.is_filtered_data_set')
    def test_get_data_set_calls_helper_with_owner(self, mock_is_filtered):
        params = {'is_owner': True}
        get_request = self.factory.get(self.url_root, params)
        get_request.user = self.user
        self.view(get_request)
        self.assertTrue(mock_is_filtered.called)

    @mock.patch('core.views.DataSetsViewSet.is_filtered_data_set')
    def test_get_data_set_calls_helper_with_public(self, mock_is_filtered):
        params = {'public': True}
        get_request = self.factory.get(self.url_root, params)
        get_request.user = self.user
        self.view(get_request)
        self.assertTrue(mock_is_filtered.called)

    @mock.patch('core.views.DataSetsViewSet.is_filtered_data_set')
    def test_get_data_set_calls_helper_with_group(self, mock_is_filtered):
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        params = {'group': group.id}
        get_request = self.factory.get(self.url_root, params)
        get_request.user = self.user
        self.view(get_request)
        self.assertTrue(mock_is_filtered.called)

    def test_dataset_delete_successful(self):

        self.assertEqual(DataSet.objects.all().count(), 2)

        self.delete_request1 = self.factory.delete(
           urljoin(self.url_root, self.data_set.uuid)
        )

        force_authenticate(self.delete_request1, user=self.user)

        self.delete_response = self.view(self.delete_request1,
                                         self.data_set.uuid)

        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(DataSet.objects.all().count(), 1)

        self.delete_request2 = self.factory.delete(
          urljoin(self.url_root, self.data_set_2.uuid)
        )

        force_authenticate(self.delete_request2, user=self.user)

        self.delete_response = self.view(self.delete_request2,
                                         self.data_set_2.uuid)
        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(DataSet.objects.all().count(), 0)

    def test_dataset_delete_no_auth(self):
        self.assertEqual(DataSet.objects.all().count(), 2)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, self.data_set.uuid)
        )

        self.delete_response = self.view(self.delete_request,
                                         self.data_set.uuid)

        self.assertEqual(self.delete_response.status_code, 403)

        self.assertEqual(DataSet.objects.all().count(), 2)

    def test_dataset_delete_not_found(self):
        self.assertEqual(DataSet.objects.all().count(), 2)

        uuid = self.data_set.uuid

        self.data_set.delete()

        self.assertEqual(DataSet.objects.all().count(), 1)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, uuid)
        )
        force_authenticate(self.delete_request, user=self.user)

        self.delete_response = self.view(self.delete_request,
                                         uuid)

        self.assertEqual(self.delete_response.status_code, 404)

        self.assertEqual(DataSet.objects.all().count(), 1)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms')
    @mock.patch('core.views.DataSetsViewSet.send_transfer_notification_email')
    def test_dataset_patch_success_returns_202(self, mock_update, mock_email):
        new_owner_email = 'new_owner@fake.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms')
    @mock.patch('core.views.DataSetsViewSet.send_transfer_notification_email')
    def test_dataset_patch_returns_updated_is_owner(self, mock_update,
                                                    mock_email):
        new_owner_email = 'new_owner@fake.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertFalse(patch_response.data.get('is_owner'))

    def test_dataset_patch_fails_not_found_email_returns_404(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True,
             "new_owner_email": 'not_valid@fake.com'}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 404)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms')
    @mock.patch('core.views.DataSetsViewSet.send_transfer_notification_email')
    def test_dataset_calls_corrent_mock_methods(self, mock_update, mock_email):
        new_owner_email = 'new_owner@fake.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, self.data_set.uuid)
        self.assertTrue(mock_update.called)
        self.assertTrue(mock_email.called)

    # Accession too long
    def test_dataset_patch_accession_fails(self):
        new_accession = self.create_rand_str(33)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"accession": new_accession}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('accession')[0],
            'Ensure this field has no more than 32 characters.'
        )

    def test_dataset_patch_accession_successful(self):
        new_accession = self.create_rand_str(10)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"accession": new_accession},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('accession'), new_accession)

    def test_dataset_patch_auth_fails(self):
        new_description = self.create_rand_str(50)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"description": new_description},
        )
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 401)

    def test_dataset_patch_description_fails(self):
        new_description = self.create_rand_str(5001)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"description": new_description},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('description')[0],
            'Ensure this field has no more than 5000 characters.'
        )

    def test_dataset_patch_description_successful(self):
        new_description = self.create_rand_str(500)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"description": new_description},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(
            patch_response.data.get('description'), new_description
        )

    # Slug too long
    def test_dataset_patch_slug_fails(self):
        new_slug = self.create_rand_str(251)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('slug')[0],
            'Ensure this field has no more than 250 characters.'
        )

    # Slugs must be unique
    def test_dataset_patch_slug_fails_unique(self):
        new_slug = self.create_rand_str(10)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug)

        # Duplicate request
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set_2.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set_2.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('slug')[0],
            'Slugs must be unique.'
        )

    def test_dataset_patch_slug_successful(self):
        new_slug = self.create_rand_str(10)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"slug": new_slug},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug)

    def test_dataset_patch_slug_trim_whitespace(self):
        new_slug = '  Test Slug Name  '
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"slug": new_slug},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug.strip())

    # Summary too long
    def test_dataset_patch_summary_fails(self):
        new_summary = self.create_rand_str(1001)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"summary": new_summary}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('summary')[0],
            'Ensure this field has no more than 1000 characters.'
        )

    def test_dataset_patch_summary_successful(self):
        new_summary = self.create_rand_str(500)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"summary": new_summary},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('summary'), new_summary)

    # Title too long
    def test_dataset_patch_title_fails(self):
        new_title = self.create_rand_str(251)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"title": new_title}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('title')[0],
            'Ensure this field has no more than 250 characters.'
            )

    def test_dataset_patch_title_successful(self):
        new_title = "decaf coffee data_set"
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"title": new_title},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('title'), new_title)

    def test_is_filtered_data_set_returns_true_for_is_owner(self):
        filter = {'is_owner': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_is_owner(self):
        filter = {'is_owner': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: None)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_is_filtered_data_set_returns_true_for_public(self):
        filter = {'is_public': True}
        self.data_set.share(ExtendedGroup.objects.public_group())
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_public(self):
        filter = {'is_public': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_is_filtered_data_set_returns_true_for_group(self):
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group}
        self.data_set.share(group)
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_group(self):
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_is_filtered_data_set_returns_true_for_owned_public_group(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group, 'is_owner': True, 'is_public': True}
        self.data_set.share(group)
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_owned_public_group(self):
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group, 'is_owner': True, 'is_public': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_is_filtered_data_set_returns_true_for_owned_public(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        filter = {'is_owner': True, 'is_public': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_owned_public(self):
        filter = {'is_owner': True, 'is_public': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: None)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_is_filtered_data_set_returns_true_for_owned_group(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group, 'is_owner': True}
        self.data_set.share(group)
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_owned_group(self):
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group, 'is_owner': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_is_filtered_data_set_returns_true_for_public_group(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group, 'is_public': True}
        self.data_set.share(group)
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertTrue(is_filtered)

    def test_is_filtered_data_set_returns_false_for_public_group(self):
        group = ExtendedGroup.objects.create(name="Test Group", is_public=True)
        filter = {'group': group, 'is_public': True}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        is_filtered = view_set.is_filtered_data_set(self.data_set, filter)
        self.assertFalse(is_filtered)

    def test_send_transfer_notification_email_corrent_users(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        groups = {'group_with_access': [], 'group_without_access': []}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        email = view_set.send_transfer_notification_email(self.user,
                                                          new_owner, groups)
        self.assertEquals(email.to, [new_owner_email, self.user.email])

    def test_send_transfer_notification_email_sends_names(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        groups = {'group_with_access': [], 'group_without_access': []}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        email = view_set.send_transfer_notification_email(self.user,
                                                          new_owner, groups)
        self.assertIn(self.user.username, email.body)
        self.assertIn(new_owner.username, email.body)

    def test_send_transfer_notification_email_sends_profiles(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1',
                                             new_owner_email,
                                             self.password)
        groups = {'group_with_access': [], 'group_without_access': []}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        email = view_set.send_transfer_notification_email(self.user,
                                                          new_owner, groups)
        self.assertIn(
            'http://{}/users/{}'.format(
                view_set.current_site, self.user.profile.uuid
            ),
            email.body)
        self.assertIn(
            'http://{}/users/{}'.format(
                view_set.current_site, new_owner.profile.uuid
            ),
            email.body)

    def test_send_transfer_notification_email_sends_data_set(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        groups = {'group_with_access': [], 'group_without_access': []}
        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.request.user = SimpleLazyObject(lambda: self.user)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        email = view_set.send_transfer_notification_email(self.user,
                                                          new_owner, groups)
        self.assertIn(self.data_set.name, email.body)
        self.assertIn(self.data_set.uuid, email.body)

    def test_update_group_perms_remove_access(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        self.data_set.share(ExtendedGroup.objects.public_group())
        group_union = ExtendedGroup.objects.create(name="Group Union",
                                                   is_public=True)
        group_non_union = ExtendedGroup.objects.create(name="Group Non-Union",
                                                       is_public=True)
        self.data_set.share(group_union)
        group_union.group_ptr.user_set.add(self.user)
        group_union.group_ptr.user_set.add(new_owner)
        self.data_set.share(group_non_union)
        group_non_union.group_ptr.user_set.add(self.user)

        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        groups = view_set.update_group_perms(new_owner)

        self.assertEqual(len(groups.get('groups_without_access')), 1)
        self.assertEqual(
            groups.get('groups_without_access')[0].get('name'),
            group_non_union.extendedgroup.name
        )
        self.assertEqual(
            groups.get('groups_without_access')[0].get('profile'),
            'http://{}/groups/{}'.format(view_set.current_site,
                                         group_non_union.extendedgroup.uuid)
        )

    def test_update_group_perms_retains_access(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        self.data_set.share(ExtendedGroup.objects.public_group())
        group_union = ExtendedGroup.objects.create(name="Group Union",
                                                   is_public=True)
        self.data_set.share(group_union)
        group_union.group_ptr.user_set.add(self.user)
        group_union.group_ptr.user_set.add(new_owner)

        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        groups = view_set.update_group_perms(new_owner)

        self.assertEqual(len(groups.get('groups_with_access')), 2)
        self.assertEqual(
            groups.get('groups_with_access')[0].get('name'),
            group_union.extendedgroup.name
        )
        self.assertEqual(
            groups.get('groups_with_access')[0].get('profile'),
            'http://{}/groups/{}'.format(view_set.current_site,
                                         group_union.extendedgroup.uuid)
        )

    def test_update_group_perms_retains_public(self):
        new_owner_email = 'new_owner@fake.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        group_public = ExtendedGroup.objects.public_group()
        self.data_set.share(group_public)

        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        groups = view_set.update_group_perms(new_owner)

        self.assertEqual(len(groups.get('groups_with_access')), 1)
        self.assertEqual(
            groups.get('groups_with_access')[0].get('name'),
            group_public.extendedgroup.name
        )
        self.assertEqual(
            groups.get('groups_with_access')[0].get('profile'),
            'http://{}/groups/{}'.format(view_set.current_site,
                                         group_public.extendedgroup.uuid)
        )


class AnalysisApiV2Tests(APIV2TestCase):

    def setUp(self):
        super(AnalysisApiV2Tests, self).setUp(
            api_base_name="analyses/",
            view=AnalysesViewSet.as_view()
        )
        self.project = Project.objects.create()

        self.galaxy_instance = GalaxyInstanceFactory()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            workflow_engine=self.workflow_engine
        )

        # Create Datasets
        self.data_set = DataSet.objects.create(name="coffee data_set")
        self.data_set_2 = DataSet.objects.create(name="cool data_set")

        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

        # Create Analyses
        self.analysis = Analysis.objects.create(
            name='Coffee Analysis',
            summary='coffee',
            project=self.project,
            data_set=self.data_set,
            workflow=self.workflow
        )
        self.analysis.set_owner(self.user)

        self.analysis2 = Analysis.objects.create(
            name='Coffee Analysis2',
            summary='coffee2',
            project=self.project,
            data_set=self.data_set,
            workflow=self.workflow
        )
        self.analysis2.set_owner(self.user)

        # Create Nodes
        self.node = Node.objects.create(assay=self.assay, study=self.study)

        self.node_json = json.dumps([{
            "uuid": "cfb31cca-4f58-4ef0-b1e2-4469c804bf73",
            "relative_file_store_item_url": None,
            "parent_nodes": [],
            "child_nodes": [
                "1d9ee2ee-d804-4458-93b9-b1fb9a08a2c8"
            ],
            "auxiliary_nodes": [],
            "is_auxiliary_node": False,
            "file_extension": None,
            "auxiliary_file_generation_task_state": None,
            "ready_for_igv_detail_view": None
        }])

        self.client.login(username=self.username, password=self.password)

        # Make reusable requests & responses
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
        self.put_request = self.factory.put(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.put_response = self.view(self.put_request)
        self.patch_request = self.factory.patch(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.patch_response = self.view(self.patch_request)
        self.options_request = self.factory.options(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.options_response = self.view(self.options_request)

    def test_unallowed_http_verbs(self):
        self.assertEqual(
            self.put_response.data['detail'], 'Method "PUT" not allowed.')
        self.assertEqual(
            self.patch_response.data['detail'], 'Method "PATCH" not allowed.')
        self.assertEqual(
            self.options_response.data['detail'], 'Method "OPTIONS" not '
                                                  'allowed.')
        self.assertEqual(
            self.get_response.data['detail'], 'Method "GET" not allowed.')

    def test_analysis_delete_successful(self):

        self.assertEqual(Analysis.objects.all().count(), 2)

        self.delete_request1 = self.factory.delete(
           urljoin(self.url_root, self.analysis.uuid)
        )

        force_authenticate(self.delete_request1, user=self.user)

        self.delete_response = self.view(self.delete_request1,
                                         self.analysis.uuid)

        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(Analysis.objects.all().count(), 1)

        self.delete_request2 = self.factory.delete(
          urljoin(self.url_root, self.analysis2.uuid)
        )

        force_authenticate(self.delete_request2, user=self.user)

        self.delete_response = self.view(self.delete_request2,
                                         self.analysis2.uuid)
        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(Analysis.objects.all().count(), 0)

    def test_analysis_delete_no_auth(self):
        self.assertEqual(Analysis.objects.all().count(), 2)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, self.analysis.uuid)
        )

        self.delete_response = self.view(self.delete_request,
                                         self.analysis.uuid)

        self.assertEqual(self.delete_response.status_code, 403)

        self.assertEqual(Analysis.objects.all().count(), 2)

    def test_analysis_delete_not_found(self):
        self.assertEqual(Analysis.objects.all().count(), 2)

        uuid = self.analysis.uuid

        self.analysis.delete()

        self.assertEqual(Analysis.objects.all().count(), 1)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, uuid)
        )
        force_authenticate(self.delete_request, user=self.user)

        self.delete_response = self.view(self.delete_request,
                                         uuid)

        self.assertEqual(self.delete_response.status_code, 404)

        self.assertEqual(Analysis.objects.all().count(), 1)


class WorkflowApiV2Tests(APIV2TestCase):
    def setUp(self):
        self.mock_workflow_graph = "{is_test_workflow_graph: true}"
        super(WorkflowApiV2Tests, self).setUp(
            api_base_name="workflows/",
            view=WorkflowViewSet.as_view({"get": "graph"})
        )
        self.workflow = WorkflowFactory(
            graph=self.mock_workflow_graph,
            workflow_engine=WorkflowEngineFactory(
                instance=GalaxyInstanceFactory()
            )
        )

    def test_get_workflow_graph(self):
        workflow_graph_url = urljoin(
            self.url_root,
            "<uuid>/graph/"
        )
        get_request = self.factory.get(workflow_graph_url)
        get_response = self.get_response = self.view(
            get_request,
            uuid=self.workflow.uuid
        )
        self.assertEqual(get_response.content, self.mock_workflow_graph)
