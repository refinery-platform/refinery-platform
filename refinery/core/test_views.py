import json
import random
import string
from urlparse import urljoin

from cuser.middleware import CuserMiddleware
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.http import Http404
from django.test import Client, override_settings
from django.test.testcases import TestCase
from django.utils.functional import SimpleLazyObject

from guardian.shortcuts import get_groups_with_perms
from guardian.utils import get_anonymous_user
import mock
import mockcache as memcache
from rest_framework.test import (
    APIClient, APIRequestFactory, APITestCase, force_authenticate
)

from data_set_manager.models import (Assay, Investigation, Node, Study)
from factory_boy.django_model_factories import (
    GalaxyInstanceFactory, WorkflowEngineFactory, WorkflowFactory
)
from factory_boy.utils import (create_dataset_with_necessary_models,
                               create_tool_with_necessary_models)

from .models import (Analysis, DataSet, Event, ExtendedGroup, Project,
                     SiteProfile, SiteStatistics, SiteVideo, Workflow,
                     WorkflowEngine)


from .serializers import DataSetSerializer, UserSerializer

from .views import (AnalysisViewSet, DataSetsViewSet, EventViewSet,
                    GroupViewSet, ObtainAuthTokenValidSession,
                    SiteProfileViewSet, UserProfileViewSet, WorkflowViewSet,
                    user)

cache = memcache.Client(["127.0.0.1:11211"])


class APIV2TestCase(APITestCase):
    def setUp(self, **kwargs):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, 'user@example.com',
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
            view=DataSetsViewSet.as_view({'get': 'list'})
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
        self.options_request = self.factory.options(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.get_ds_view = DataSetsViewSet.as_view({'get': 'retrieve'})
        self.patch_view = DataSetsViewSet.as_view({'patch': 'partial_update'})
        self.options_response = self.view(self.options_request)
        self.user_2 = User.objects.create_user('jane_lab',
                                               'jane@example.com',
                                               'coffeecoffee')
        self.user_2_data_set = create_dataset_with_necessary_models(
            user=self.user_2
        )
        self.user_3 = User.objects.create_user('john_lab',
                                               'john@example.com',
                                               'coffeecoffee')
        self.user_3_data_set = create_dataset_with_necessary_models(
            user=self.user_3
        )
        self.user_2_data_set.share(ExtendedGroup.objects.public_group())
        self.user_3_data_set.share(ExtendedGroup.objects.public_group())
        self.group = ExtendedGroup.objects.create(name="Test Group")
        self.user_2_data_set.share(self.group)
        self.group.user_set.add(self.user_2)
        self.group.user_set.add(self.user_3)

    def test_get_data_sets_with_auth(self):
        self.get_request.user = self.user
        get_response = self.view(self.get_request)
        self.assertEqual(len(get_response.data), 2)

    def test_get_data_set_with_anon_user(self):
        self.assertEqual(len(self.get_response.data.get('data_sets')), 0)

    def test_get_data_set_pagination_offset(self):
        create_dataset_with_necessary_models(user=self.user)
        params = {'offset': 1}
        get_request = self.factory.get(self.url_root, params)
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 5)
        self.assertEqual(get_response.data.get('data_sets')[0].get('uuid'),
                         self.user_3_data_set.uuid)

    def test_get_data_set_pagination_limit(self):
        data_set_3 = create_dataset_with_necessary_models(user=self.user)
        params = {'limit': 1}
        get_request = self.factory.get(self.url_root, params)
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(len(get_response.data.get('data_sets')), 1)
        self.assertEqual(get_response.data.get('data_sets')[0].get('uuid'),
                         data_set_3.uuid)

    def test_get_returns_only_owned(self):
        get_request = self.factory.get(self.url_root, {'is_owner': True})
        get_request.user = self.user_2
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 1)
        self.assertEqual(get_response.data.get('data_sets')[0]['uuid'],
                         self.user_2_data_set.uuid)

    def test_get_returns_only_public(self):
        get_request = self.factory.get(self.url_root, {'is_public': True})
        get_request.user = self.user_2
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 2)

    def test_get_returns_public_owned(self):
        get_request = self.factory.get(self.url_root,
                                       {'is_public': True,
                                        'is_owner': True})
        get_request.user = self.user_2
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 1)
        self.assertEqual(get_response.data.get('data_sets')[0]['uuid'],
                         self.user_2_data_set.uuid)

    def test_get_returns_public_group(self):
        get_request = self.factory.get(self.url_root,
                                       {'is_public': True,
                                        'group': self.group.id})
        get_request.user = self.user_3
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 1)
        self.assertEqual(get_response.data.get('data_sets')[0]['uuid'],
                         self.user_2_data_set.uuid)

    def test_get_returns_owned_group(self):
        get_request = self.factory.get(self.url_root,
                                       {'is_owner': True,
                                        'group': self.group.id})
        create_dataset_with_necessary_models(user=self.user_2)  # not shared
        get_request.user = self.user_2
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 1)
        self.assertEqual(get_response.data.get('data_sets')[0]['uuid'],
                         self.user_2_data_set.uuid)

    def test_get_returns_owned_group_public(self):
        get_request = self.factory.get(self.url_root,
                                       {'is_public': True,
                                        'is_owner': True,
                                        'group': self.group.id})
        get_request.user = self.user_2
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 1)
        self.assertEqual(get_response.data.get('data_sets')[0]['uuid'],
                         self.user_2_data_set.uuid)
        get_request.user = self.user_3  # user_3 does not share data_set
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 0)

    def test_get_returns_only_grouped(self):
        get_request = self.factory.get(self.url_root, {'group': self.group.id})
        get_request.user = self.user_2
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 1)

    def test_get_data_set_pagination_limit_and_offset(self):
        create_dataset_with_necessary_models(user=self.user)
        params = {'limit': 1, 'offset': 2}
        get_request = self.factory.get(self.url_root, params)
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(get_response.data.get('total_data_sets'), 5)
        self.assertEqual(get_response.data.get('data_sets')[0].get('uuid'),
                         self.user_2_data_set.uuid)

    def test_total_data_sets_returned_correctly(self):
        create_dataset_with_necessary_models(user=self.user)
        get_request = self.factory.get(self.url_root)
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(len(get_response.data.get('data_sets')),
                         get_response.data.get('total_data_sets'))

    def test_get_data_set_with_auth(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('uuid'), self.data_set.uuid)

    def test_get_data_set_returns_401(self):
        # anon user on a non-public data set
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.status_code, 401)

    def test_get_data_set_returns_public_data_set(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('uuid'), self.data_set.uuid)

    def test_get_data_set_returns_title(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('title'),
                         self.data_set.title)

    def test_get_data_set_returns_summary(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('summary'),
                         self.data_set.summary)

    def test_get_data_set_returns_description(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('description'),
                         self.data_set.description)

    def test_get_data_set_returns_is_owner(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('is_owner'),
                         self.user == self.data_set.get_owner())

    def test_get_data_set_returns_public(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('public'),
                         self.data_set.is_public())

    def test_get_data_set_returns_is_clean(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('is_clean'),
                         self.data_set.is_clean())

    def test_get_data_set_returns_file_count(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(get_ds_response.data.get('file_count'),
                         self.data_set.get_file_count())

    def test_get_data_set_returns_owner(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        self.assertEqual(
            get_ds_response.data.get('owner').get('profile').get('uuid'),
            self.user.profile.uuid
        )

    def test_get_data_set_returns_user_perms_for_owner(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_request.user = self.user
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        response_perms = get_ds_response.data.get('user_perms')
        self.assertEqual(True, response_perms.get('change'))
        self.assertEqual(True, response_perms.get('read'))
        self.assertEqual(True, response_perms.get('read_meta'))

    def test_get_public_data_set_returns_user_perms_for_anon(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.data_set.uuid))
        get_ds_response = self.get_ds_view(get_request, self.data_set.uuid)
        response_perms = get_ds_response.data.get('user_perms')
        self.assertEqual(False, response_perms.get('change'))
        self.assertEqual(True, response_perms.get('read'))
        self.assertEqual(True, response_perms.get('read_meta'))

    def test_dataset_delete_successful(self):
        delete_view = DataSetsViewSet.as_view({'delete': 'destroy'})
        self.assertEqual(DataSet.objects.all().count(), 4)

        self.delete_request1 = self.factory.delete(
           urljoin(self.url_root, self.data_set.uuid)
        )

        force_authenticate(self.delete_request1, user=self.user)

        self.delete_response = delete_view(self.delete_request1,
                                           self.data_set.uuid)

        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(DataSet.objects.all().count(), 3)

        self.delete_request2 = self.factory.delete(
          urljoin(self.url_root, self.data_set_2.uuid)
        )

        force_authenticate(self.delete_request2, user=self.user)

        self.delete_response = delete_view(self.delete_request2,
                                           self.data_set_2.uuid)
        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(DataSet.objects.all().count(), 2)

    def test_dataset_delete_no_auth(self):
        delete_view = DataSetsViewSet.as_view({'delete': 'destroy'})
        self.assertEqual(DataSet.objects.all().count(), 4)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, self.data_set.uuid)
        )

        self.delete_response = delete_view(self.delete_request,
                                           self.data_set.uuid)

        self.assertEqual(self.delete_response.status_code, 403)

        self.assertEqual(DataSet.objects.all().count(), 4)

    def test_dataset_delete_not_found(self):
        delete_view = DataSetsViewSet.as_view({'delete': 'destroy'})
        self.assertEqual(DataSet.objects.all().count(), 4)

        uuid = self.data_set.uuid

        self.data_set.delete()

        self.assertEqual(DataSet.objects.all().count(), 3)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, uuid)
        )
        force_authenticate(self.delete_request, user=self.user)

        self.delete_response = delete_view(self.delete_request, uuid)

        self.assertEqual(self.delete_response.status_code, 404)

        self.assertEqual(DataSet.objects.all().count(), 3)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms')
    @mock.patch('core.views.DataSetsViewSet.send_transfer_notification_email')
    def test_dataset_patch_success_returns_202(self, mock_update, mock_email):
        new_owner_email = 'new_owner@example.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms')
    @mock.patch('core.views.DataSetsViewSet.send_transfer_notification_email')
    def test_dataset_patch_returns_updated_is_owner(self, mock_update,
                                                    mock_email):
        new_owner_email = 'new_owner@example.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertFalse(patch_response.data.get('is_owner'))

    def test_dataset_patch_fails_not_found_email_returns_404(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True,
             "new_owner_email": 'not_valid@example.com'}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 404)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms')
    @mock.patch('core.views.DataSetsViewSet.send_transfer_notification_email')
    def test_dataset_calls_current_mock_methods(self, mock_update, mock_email):
        new_owner_email = 'new_owner@example.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        self.patch_view(patch_request, self.data_set.uuid)
        self.assertTrue(mock_update.called)
        self.assertTrue(mock_email.called)

    @mock.patch('core.views.DataSetsViewSet.update_group_perms',
                side_effect=RuntimeError)
    def test_dataset_patch_fails_and_rollback_owner(self, mock_update):
        new_owner_email = 'new_owner@example.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(response.status_code, 412)
        self.assertEqual(self.data_set.get_owner(), self.user)

    @mock.patch('core.views.get_groups_with_perms')
    def test_dataset_patch_fails_and_rollback_group_perms(self, mock_perms):
        new_owner_email = 'new_owner@example.com'
        User.objects.create_user('NewOwner1', new_owner_email, self.password)
        group_non_union_0 = ExtendedGroup.objects.create(name="Group 0")
        group_non_union_1 = ExtendedGroup.objects.create(name="Group 1")
        self.data_set.share(group_non_union_0)
        self.data_set.share(group_non_union_1)
        group_non_union_0.user_set.add(self.user)
        group_non_union_1.user_set.add(self.user)

        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"transfer_data_set": True, "new_owner_email": new_owner_email}
        )
        # empty object will force the error
        mock_perms.return_value = [group_non_union_0, group_non_union_1, {}]
        patch_request.user = self.user
        force_authenticate(patch_request, user=self.user)
        response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(response.status_code, 412)
        self.assertEqual(len(get_groups_with_perms(self.data_set)), 2)

    # Accession too long
    def test_dataset_patch_accession_fails(self):
        new_accession = self.create_rand_str(33)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"accession": new_accession}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('accession'), new_accession)

    def test_dataset_patch_auth_fails(self):
        new_description = self.create_rand_str(50)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"description": new_description},
        )
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 401)

    def test_dataset_patch_description_fails(self):
        new_description = self.create_rand_str(5001)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"description": new_description},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug)

        # Duplicate request
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set_2.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set_2.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug)

    def test_dataset_patch_slug_trim_whitespace(self):
        new_slug = '  Test Slug Name  '
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.data_set.uuid),
            {"slug": new_slug},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
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
        patch_response = self.patch_view(patch_request, self.data_set.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('title'), new_title)

    def test_send_transfer_notification_email_corrent_users(self):
        new_owner_email = 'new_owner@example.com'
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
        new_owner_email = 'new_owner@example.com'
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
        new_owner_email = 'new_owner@example.com'
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
        new_owner_email = 'new_owner@example.com'
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
        new_owner_email = 'new_owner@example.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        self.data_set.share(ExtendedGroup.objects.public_group())
        group_union = ExtendedGroup.objects.create(name="Group Union")
        group_non_union = ExtendedGroup.objects.create(name="Group Non-Union")
        self.data_set.share(group_union)
        group_union.user_set.add(self.user)
        group_union.user_set.add(new_owner)
        self.data_set.share(group_non_union)
        group_non_union.user_set.add(self.user)

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
        new_owner_email = 'new_owner@example.com'
        new_owner = User.objects.create_user('NewOwner1', new_owner_email,
                                             self.password)
        group_union = ExtendedGroup.objects.create(name="Group Union")
        self.data_set.share(group_union)
        group_union.user_set.add(self.user)
        group_union.user_set.add(new_owner)

        view_set = DataSetsViewSet()
        view_set.request = self.factory.get(self.url_root)
        view_set.data_set = SimpleLazyObject(lambda: self.data_set)
        view_set.current_site = SimpleLazyObject(lambda: 'test_site')
        groups = view_set.update_group_perms(new_owner)

        self.assertEqual(len(groups.get('groups_with_access')), 1)
        self.assertEqual(groups.get('groups_with_access')[0].get('name'),
                         group_union.extendedgroup.name)
        self.assertEqual(
            groups.get('groups_with_access')[0].get('profile'),
            'http://{}/groups/{}'.format(view_set.current_site,
                                         group_union.extendedgroup.uuid)
        )

    def test_update_group_perms_retains_public(self):
        new_owner_email = 'new_owner@example.com'
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

    def test_get_data_set_is_clean(self):
        self.get_request.user = self.user
        get_response = self.view(self.get_request)
        self.assertTrue(get_response.data.get('data_sets')[0]["is_clean"])

    def test_get_data_set_is_not_clean(self):
        # Create a DataSet along with a Visualization Tool
        create_tool_with_necessary_models("VISUALIZATION", user=self.user)
        self.get_request.user = self.user
        get_response = self.view(self.get_request)
        self.assertFalse(get_response.data.get('data_sets')[0]["is_clean"])

    def test_is_owner_reflects_actual_owner(self):
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.user_3_data_set.uuid))
        get_request.user = self.user_3
        get_response = self.view(get_request)
        data_set = get_response.data.get('data_sets')[0]
        self.assertTrue(data_set["is_owner"])

    def test_is_owner_reflects_actual_owner_with_admin_requester(self):
        username = password = "admin"
        admin_user = User.objects.create_superuser(username, '', password)
        get_request = self.factory.get(urljoin(self.url_root,
                                               self.user_3_data_set.uuid))
        get_request.user = admin_user
        get_response = self.view(self.get_request)
        data_set = get_response.data.get('data_sets')[0]
        self.assertFalse(data_set["is_owner"])


class GroupApiV2Tests(APIV2TestCase):
    def setUp(self):
        super(GroupApiV2Tests, self).setUp(
            api_base_name="groups/", view=GroupViewSet.as_view({'get': 'list'})
        )
        self.patch_view = GroupViewSet.as_view({'patch': 'partial_update'})
        self.post_view = GroupViewSet.as_view({'post': 'create'})
        self.delete_view = GroupViewSet.as_view({'delete': 'destroy'})
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.group = ExtendedGroup.objects.create(name="Test Group")
        self.group.manager_group.user_set.add(self.user)
        self.group_2 = ExtendedGroup.objects.create(name="Test Group 2")
        self.group_2.manager_group.user_set.add(self.user)
        self.group.user_set.add(self.user)
        self.group_2.user_set.add(self.user)
        self.data_set.share(self.group)
        self.data_set.share(self.group_2)

    def test_delete_group_returns_403_for_non_managers(self):
        non_manager = User.objects.create_user('Non-owner',
                                               'user@example.com',
                                               self.password)
        self.group.user_set.add(non_manager)
        delete_request = self.factory.delete(urljoin(self.url_root,
                                                     self.group.uuid))
        force_authenticate(delete_request, user=non_manager)
        delete_response = self.delete_view(delete_request, self.group.uuid)
        self.assertEqual(delete_response.status_code, 403)

    def test_delete_group_returns_200(self):
        delete_request = self.factory.delete(urljoin(self.url_root,
                                                     self.group.uuid))
        force_authenticate(delete_request, user=self.user)
        delete_response = self.delete_view(delete_request, self.group.uuid)
        self.assertEqual(delete_response.status_code, 200)

    def test_delete_group_deletes_group(self):
        public_group = ExtendedGroup.objects.public_group()
        delete_request = self.factory.delete(urljoin(self.url_root,
                                                     self.group.uuid))
        force_authenticate(delete_request, user=self.user)
        delete_response = self.delete_view(delete_request, self.group.uuid)
        remaining_group_uuids = [self.group_2.uuid, public_group.uuid]
        self.assertNotIn(delete_response.data, remaining_group_uuids)

    def test_get_groups_no_params_returns_all_user_groups(self):
        public_group = ExtendedGroup.objects.public_group()
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        group_uuid_list = [get_response.data[0].get('id'),
                           get_response.data[1].get('id'),
                           get_response.data[2].get('id')]
        self.assertIn(public_group.id, group_uuid_list)
        self.assertIn(self.group.id, group_uuid_list)
        self.assertIn(self.group_2.id, group_uuid_list)

    def test_get_groups_no_params_returns_member_list(self):
        new_user = User.objects.create_user('Non-owner',
                                            'user@example.com',
                                            self.password)
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=new_user)
        get_response = self.view(get_request)
        user_ids = [self.user.profile.uuid, new_user.profile.uuid]
        self.assertEqual(len(get_response.data[0].get('member_list')), 2)
        member_list = get_response.data[0].get('member_list')
        self.assertIn(member_list[0].get('profile').get('uuid'), user_ids)
        self.assertIn(member_list[1].get('profile').get('uuid'), user_ids)

    def test_get_groups_no_params_has_can_edit_true(self):
        # remove user from public group for testing can_edit
        public_group = ExtendedGroup.objects.public_group()
        public_group.user_set.remove(self.user)
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('can_edit'), True)

    def test_get_groups_no_params_has_can_edit_false(self):
        new_user = User.objects.create_user('Non-owner',
                                            'user@example.com',
                                            self.password)
        self.group.user_set.add(new_user)
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=new_user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('can_edit'), False)

    def test_get_groups_no_params_returns_401_for_anon(self):
        get_request = self.factory.get(self.url_root)
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 401)

    def test_get_groups_with_data_set_uuid_returns_403_for_anon(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 403)

    def test_get_groups_invalid_data_set_uuid_returns_404(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': 'xxx2'})
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 404)

    def test_get_groups_with_data_set_uuid_returns_correct_groups(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(len(get_response.data), 2)
        group_uuid_list = [self.group.uuid, self.group_2.uuid]
        self.assertIn(get_response.data[0].get('uuid'), group_uuid_list)
        self.assertIn(get_response.data[1].get('uuid'), group_uuid_list)

    def test_get_groups_with_data_set_uuid_returns_public_group(self):
        public_group = ExtendedGroup.objects.public_group()
        self.data_set.share(public_group)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(len(get_response.data), 3)
        group_uuid_list = [get_response.data[0].get('id'),
                           get_response.data[1].get('id'),
                           get_response.data[2].get('id')]
        self.assertIn(public_group.id, group_uuid_list)

    def test_get_groups_with_data_set_uuid_has_name_field(self):
        self.data_set.unshare(self.group_2)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(self.group.name, get_response.data[0].get('name'))

    def test_get_groups_with_data_set_uuid_has_id_field(self):
        self.data_set.unshare(self.group_2)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(self.group.id, get_response.data[0].get('id'))

    def test_get_groups_with_data_set_uuid_has_uuid(self):
        self.data_set.unshare(self.group_2)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(self.group.uuid, get_response.data[0].get('uuid'))

    def test_get_groups_with_data_set_uuid_has_can_edit_true(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('can_edit'), True)

    def test_get_groups_with_data_set_uuid_has_can_edit_false(self):
        new_user = User.objects.create_user('Non-owner',
                                            'user@example.com',
                                            self.password)
        self.group.user_set.add(new_user)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=new_user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('can_edit'), False)

    def test_get_groups_with_data_set_uuid_has_correct_perms_field(self):
        self.data_set.unshare(self.group_2)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_request.user = self.user
        get_response = self.view(get_request)
        response_perms = get_response.data[0].get('perm_list')
        self.assertEqual(False, response_perms.get('change'))
        self.assertEqual(True, response_perms.get('read'))
        self.assertEqual(True, response_perms.get('read_meta'))

    def test_get_groups_with_data_set_uuid_returns_groups_with_user(self):
        public_group = ExtendedGroup.objects.public_group()
        self.data_set.share(public_group)
        self.new_user = User.objects.create_user('Non-owner',
                                                 'user@example.com',
                                                 self.password)
        self.group.user_set.add(self.new_user)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.new_user)
        get_response = self.view(get_request)
        # public group plus group one
        self.assertEqual(len(get_response.data), 2)
        group_uuid_list = [self.group.uuid, public_group.uuid]
        self.assertIn(get_response.data[0].get('uuid'), group_uuid_list)
        self.assertIn(get_response.data[1].get('uuid'), group_uuid_list)

    def test_get_groups_with_data_set_uuid_and_all_perms_returns_groups(self):
        self.data_set.unshare(self.group_2)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid,
                                        'allPerms': True})
        get_request.user = self.user
        get_response = self.view(get_request)
        # public plus the two groups created in set-up
        self.assertEqual(len(get_response.data), 3)

    def test_get_groups_with_data_set_uuid_and_all_perms_returns_perms(self):
        self.data_set.unshare(self.group_2)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid,
                                        'allPerms': True})
        get_request.user = self.user
        get_response = self.view(get_request)

        for group in get_response.data:
            response_perms = group.get('perm_list')
            if group.get('id') == self.group.id:
                self.assertEqual(False, response_perms.get('change'))
                self.assertEqual(True, response_perms.get('read'))
                self.assertEqual(True, response_perms.get('read_meta'))
            else:
                self.assertEqual(False, response_perms.get('change'))
                self.assertEqual(False, response_perms.get('read'))
                self.assertEqual(False, response_perms.get('read_meta'))

    def test_get_groups_for_anon_with_all_perms_returns_empty_list(self):
        public_group = ExtendedGroup.objects.public_group()
        self.data_set.share(public_group)
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid,
                                        'allPerms': True})
        get_response = self.view(get_request)
        self.assertEqual(get_response.data, [])

    def test_patch_groups_returns_status_code_200(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': True,
                           'read': True,
                           'read_meta': True},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.status_code, 200)

    def test_patch_groups_updates_change_field(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': True,
                           'read': True,
                           'read_meta': True},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.data.get('perm_list').get('change'),
                         True)

    def test_patch_groups_updates_read_field(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': False,
                           'read': False,
                           'read_meta': True},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.data.get('perm_list').get('read'),
                         False)
        self.assertEqual(patch_response.data.get('perm_list').get('read_meta'),
                         True)

    def test_patch_groups_updates_read_meta_field(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': False,
                           'read': False,
                           'read_meta': False},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.data.get('perm_list').get('read_meta'),
                         False)

    def test_patch_groups_updates_based_on_highest_perm_field(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': True,
                           'read': False,
                           'read_meta': False},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.data.get('perm_list').get('change'),
                         True)
        self.assertEqual(patch_response.data.get('perm_list').get('read'),
                         True)
        self.assertEqual(patch_response.data.get('perm_list').get('read_meta'),
                         True)

    def test_patch_groups_only_allows_owners_and_returns_403(self):
        self.non_owner = User.objects.create_user('Non-owner',
                                                  'user@example.com',
                                                  self.password)
        self.group.user_set.add(self.non_owner)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': True,
                           'read': False,
                           'read_meta': False},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.non_owner)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.status_code, 403)

    def test_patch_groups_invalid_data_set_uuid_returns_404(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.group.uuid),
            {'dataSetUuid': 'xxxxxx',
             'perm_list': {'change': True,
                           'read': False,
                           'read_meta': False},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.group.uuid)
        self.assertEqual(patch_response.status_code, 404)

    def test_patch_groups_invalid_group_uuid_returns_404(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, 'xxxxx5'),
            {'dataSetUuid': self.data_set.uuid,
             'perm_list': {'change': True,
                           'read': False,
                           'read_meta': False},
             },
            format='json'
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, 'xxxx5')
        self.assertEqual(patch_response.status_code, 404)

    def test_post_groups_returns_401_for_anon(self):
        post_request = self.factory.post(self.url_root, {'name': 'Group 231'})
        post_response = self.post_view(post_request)
        self.assertEqual(post_response.status_code, 401)

    def test_post_groups_returns_201_for_new_group(self):
        post_request = self.factory.post(self.url_root, {'name': 'Group 311'})
        force_authenticate(post_request, user=self.user)
        post_response = self.post_view(post_request)
        self.assertEqual(post_response.status_code, 201)

    def test_post_groups_returns_group_object_when_successful(self):
        new_group_name = 'Test Group 865'
        post_request = self.factory.post(self.url_root,
                                         {'name': new_group_name})
        force_authenticate(post_request, user=self.user)
        post_response = self.post_view(post_request)
        self.assertEqual(post_response.data.get('name'), new_group_name)

    def test_post_groups_returns_400_for_too_short_name(self):
        post_request = self.factory.post(self.url_root, {'name': 'Ty'})
        force_authenticate(post_request, user=self.user)
        post_response = self.post_view(post_request)
        self.assertEqual(post_response.status_code, 400)

    def test_post_groups_returns_400_for_duplicate_name(self):
        new_group_name = 'Test Group 967'
        post_request = self.factory.post(self.url_root,
                                         {'name': new_group_name})
        force_authenticate(post_request, user=self.user)
        self.post_view(post_request)
        post_request = self.factory.post(self.url_root,
                                         {'name': new_group_name})
        force_authenticate(post_request, user=self.user)
        post_response = self.post_view(post_request)
        self.assertEqual(post_response.status_code, 400)


class AnalysisApiV2Tests(APIV2TestCase):

    def setUp(self):
        super(AnalysisApiV2Tests, self).setUp(
            api_base_name="analyses/",
            view=AnalysisViewSet.as_view()
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
        self.data_set.set_owner(self.user)
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
            workflow=self.workflow,
            time_start='2019-03-02T06:12:03.819446Z'
        )
        self.analysis.set_owner(self.user)

        self.analysis2 = Analysis.objects.create(
            name='Coffee Analysis2',
            summary='coffee2',
            project=self.project,
            data_set=self.data_set,
            workflow=self.workflow,
            time_start='2019-03-02T06:20:41.853987Z'
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

    def test_get_analysis_returns_empty_list_for_no_public_data_sets(self):
        get_request = self.factory.get(self.url_root)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data, [])

    def test_get_analysis_returns_analyses_for_public_data_sets(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        get_request = self.factory.get(self.url_root)
        get_response = self.view(get_request)
        analysis_list = [self.analysis.uuid, self.analysis2.uuid]
        self.assertEqual(len(get_response.data), 2)
        self.assertIn(get_response.data[0].get('uuid'), analysis_list)
        self.assertIn(get_response.data[1].get('uuid'), analysis_list)

    def test_get_analysis_returns_sorted_analyses_for_user(self):
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        # sorted in reverse time_start
        self.assertEqual(get_response.data[1].get('uuid'), self.analysis.uuid)
        self.assertEqual(get_response.data[0].get('uuid'), self.analysis2.uuid)

    def test_get_analysis_returns_paged_analyses_for_user(self):
        limit = 1
        get_request = self.factory.get(self.url_root,
                                       {'limit': limit, 'offset': 0})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(len(get_response.data), limit)

    def test_get_analysis_returns_offset_analyses_for_user(self):
        offset = 1
        get_request = self.factory.get(self.url_root, {'offset': offset})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        # know the total length off analyses is 2
        self.assertEqual(len(get_response.data), 1)

    def test_get_analysis_with_data_set_uuid_returns_401(self):
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.status_code, 401)

    def test_get_analysis_with_invalid_data_set_uuid_returns_404(self):
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': 'xxx5'}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.status_code, 404)

    def test_get_analysis_with_data_set_uuid_returns_analyses(self):
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        analysis_list = [self.analysis.uuid, self.analysis2.uuid]
        self.assertEqual(len(get_response.data), 2)
        self.assertIn(get_response.data[0].get('uuid'), analysis_list)
        self.assertIn(get_response.data[1].get('uuid'), analysis_list)

    def test_get_analysis_with_data_set_uuid_returns_names_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('name'), self.analysis.name)

    def test_get_analysis_with_data_set_uuid_returns_status_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('status'),
                         self.analysis.status)

    def test_get_analysis_with_data_set_uuid_returns_summary_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('summary'),
                         self.analysis.summary)

    def test_get_analysis_with_data_set_uuid_returns_time_start_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('time_start'),
                         self.analysis.time_start)

    def test_get_analysis_with_data_set_uuid_returns_time_end_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('time_end'),
                         self.analysis.time_end)

    def test_get_analysis_with_data_set_uuid_returns_uuid_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('uuid'), self.analysis.uuid)

    def test_get_analysis_with_data_set_uuid_returns_workflow_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(get_response.data[0].get('workflow'),
                         self.analysis.workflow.id)

    def test_get_analysis_with_data_set_uuid_returns_owner_field(self):
        self.analysis2.delete()
        get_request_with_ds = self.factory.get(
            self.url_root, {'dataSetUuid': self.data_set.uuid}
        )
        force_authenticate(get_request_with_ds, user=self.user)
        get_response = self.view(get_request_with_ds)
        self.assertEqual(
            get_response.data[0].get('owner').get('profile').get('uuid'),
            self.analysis.get_owner().profile.uuid
        )

    def test_get_analysis_with_data_set_uuid_returns_sorted_analyses(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        # sorted in reverse time_start
        self.assertEqual(get_response.data[1].get('uuid'), self.analysis.uuid)
        self.assertEqual(get_response.data[0].get('uuid'), self.analysis2.uuid)

    def test_get_analysis_with_data_set_uuid_returns_paged_analyses(self):
        limit = 1
        get_request = self.factory.get(self.url_root,
                                       {'limit': limit,
                                        'offset': 0,
                                        'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(len(get_response.data), limit)

    def test_get_analysis_with_data_set_uuid_returns_offset_analyses(self):
        offset = 1
        get_request = self.factory.get(self.url_root,
                                       {'offset': offset,
                                        'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        # know the total length off analysis is 2
        self.assertEqual(len(get_response.data), 1)

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


class SiteProfileApiV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(SiteProfileApiV2Tests, self).setUp(
            api_base_name="site_profiles",
            view=SiteProfileViewSet.as_view()
        )
        self.current_site = Site.objects.get_current()
        self.site_profile = SiteProfile.objects.create(
            site=self.current_site,
            about_markdown='About the platform paragraph.',
            intro_markdown='The refinery platform intro paragraph.',
            twitter_username='Mock_twitter_name'
        )
        self.site_video_1 = SiteVideo.objects.create(
            caption="Dashboard video",
            site_profile=self.site_profile,
            source="YouTube",
            source_id="yt_5tc"
        )
        self.site_video_2 = SiteVideo.objects.create(
            caption="Analysis video",
            site_profile=self.site_profile,
            source="YouTube",
            source_id="yt_875"
        )

        username = password = "admin"
        self.admin_user = User.objects.create_superuser(username, '', password)
        self.get_request = self.factory.get(self.url_root)

    def test_get_returns_404_status_for_missing_site_profiles(self):
        SiteProfile.objects.all().delete()
        get_response = self.view(self.get_request)
        self.assertEqual(get_response.status_code, 404)

    def test_get_returns_200_status_for_anon_user(self):
        get_response = self.view(self.get_request)
        self.assertEqual(get_response.status_code, 200)

    def test_get_returns_site_profile(self):
        get_response = self.view(self.get_request)
        self.assertEqual(get_response.data.get('site'), self.current_site.id)

    def test_get_returns_site_markdown_fields(self):
        get_response = self.view(self.get_request)
        self.assertEqual(get_response.data.get('about_markdown'),
                         self.site_profile.about_markdown)
        self.assertEqual(get_response.data.get('intro_markdown'),
                         self.site_profile.intro_markdown)

    def test_get_returns_twitter_username(self):
        get_response = self.view(self.get_request)
        self.assertEqual(get_response.data.get('twitter_username'),
                         self.site_profile.twitter_username)

    def test_get_returns_site_videos(self):
        get_response = self.view(self.get_request)
        response_videos = [video.get('source_id') for video in
                           get_response.data.get('site_videos')]
        self.assertItemsEqual(response_videos, [self.site_video_1.source_id,
                                                self.site_video_2.source_id])

    def test_patch_returns_401_status_for_anon_user(self):
        patch_request = self.factory.patch(
            self.url_root,
            {'about_markdown': 'New paragraph about the site.'}
        )
        patch_response = self.view(patch_request)
        self.assertEqual(patch_response.status_code, 401)

    def test_patch_returns_202_status_for_admin(self):
        patch_request = self.factory.patch(
            self.url_root,
            {'about_markdown': 'New paragraph about the site.'}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.assertEqual(patch_response.status_code, 202)

    def test_patch_updates_about_markdown(self):
        new_about_markdown = 'New paragraph about the site.'
        patch_request = self.factory.patch(
            self.url_root,
            {'about_markdown': new_about_markdown}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.assertEqual(patch_response.data.get('about_markdown'),
                         new_about_markdown)

    def test_patch_updates_intro_markdown(self):
        new_intro_markdown = 'New introduction to the refinery-platform.'
        patch_request = self.factory.patch(
            self.url_root,
            {'intro_markdown': new_intro_markdown}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.assertEqual(patch_response.data.get('intro_markdown'),
                         new_intro_markdown)

    def test_patch_updates_twitter_username(self):
        new_twitter_username = 'newTwitterName'
        patch_request = self.factory.patch(
            self.url_root,
            {'twitter_username': new_twitter_username}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.assertEqual(patch_response.data.get('twitter_username'),
                         new_twitter_username)

    def test_patch_updates_site_videos_lists_add(self):
        site_video_1_data = {
            "caption": self.site_video_1.caption,
            "site_profile": self.site_profile.id,
            "source": self.site_video_1.source,
            "source_id": self.site_video_1.source_id,
            "id": self.site_video_1.id
        }
        site_video_2_data = {
            "caption": self.site_video_2.caption,
            "site_profile": self.site_profile.id,
            "source": self.site_video_2.source,
            "source_id": self.site_video_2.source_id,
            "id": self.site_video_2.id
        }
        site_video_3_data = {
            "caption": "Video caption three.",
            "site_profile": self.site_profile.id,
            "source": "youtube",
            "source_id": "yt_349v"
        }
        patch_request = self.factory.patch(
            self.url_root,
            {"site_videos": json.dumps([
                site_video_1_data, site_video_2_data, site_video_3_data
            ])}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.site_profile.refresh_from_db()
        self.assertEqual(len(self.site_profile.sitevideo_set.all()),
                         len(patch_response.data.get('site_videos')))

    def test_patch_updates_site_videos_lists_removal(self):
        site_video_2_data = {
            "caption": self.site_video_2.caption,
            "site_profile": self.site_profile.id,
            "source": self.site_video_2.source,
            "source_id": self.site_video_2.source_id,
            "id": self.site_video_2.id,
        }
        patch_request = self.factory.patch(
            self.url_root,
            {"site_videos": json.dumps([site_video_2_data])}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.site_profile.refresh_from_db()
        self.assertEqual(len(self.site_profile.sitevideo_set.all()),
                         len(patch_response.data.get('site_videos')))

    def test_patch_updates_site_videos_lists_updates_video_caption(self):
        new_caption = 'New analysis video caption.'
        site_video_1_data = {
            "caption": new_caption,
            "site_profile": self.site_profile.id,
            "source": self.site_video_1.source,
            "source_id": self.site_video_1.source_id,
            "id": self.site_video_1.id
        }
        patch_request = self.factory.patch(
            self.url_root,
            {"site_videos": json.dumps([site_video_1_data])}
        )
        patch_request.user = self.admin_user
        patch_response = self.view(patch_request)
        self.assertEqual(
            patch_response.data.get('site_videos')[0].get('caption'),
            new_caption)


class UserViewTest(TestCase):
    def setUp(self, **kwargs):
        self.username = 'test_user'
        self.password = '12345@'
        self.user = User.objects.create_user(self.username,
                                             'test@example.com',
                                             self.password)
        self.client = Client()

    def test_returns_200_status_with_correct_template(self):
        get_request = self.client.get(
            'users/{}/'.format(self.user.profile.uuid)
        )
        get_request.user = self.user
        with self.assertTemplateUsed('core/user.html'):
            response = user(get_request, self.user.username)
            self.assertEqual(response.status_code, 200)

    def test_raises_404_status_for_anon(self):
        get_request = self.client.get(
            'users/{}/'.format(self.user.profile.uuid)
        )
        get_request.user = get_anonymous_user()
        with self.assertRaises(Http404):
            user(get_request, '')


class UserProfileApiV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(UserProfileApiV2Tests, self).setUp(
            api_base_name="user_profiles/",
            view=UserProfileViewSet.as_view()
        )
        self.user_lm = User.objects.create_user('lab_member',
                                                'member@example.com',
                                                self.password)
        self.lab_group = ExtendedGroup.objects.create(name="Lab Group")
        self.non_lab_group = ExtendedGroup.objects.create(name="Test Group")
        self.lab_group.user_set.add(self.user_lm)
        self.non_lab_group.user_set.add(self.user)

    def test_patch_primary_group_returns_success_status(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.user_lm.profile.uuid),
            {"primary_group": self.lab_group.id}
        )
        patch_request.user = self.user_lm
        force_authenticate(patch_request, user=self.user_lm)
        patch_response = self.view(patch_request, self.user_lm.profile.uuid)
        self.assertEqual(patch_response.status_code, 202)

    def test_patch_primary_group_returns_success_group_id(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.user_lm.profile.uuid),
            {"primary_group": self.lab_group.id}
        )
        patch_request.user = self.user_lm
        force_authenticate(patch_request, user=self.user_lm)
        patch_response = self.view(patch_request, self.user_lm.profile.uuid)
        self.assertEqual(patch_response.data.get('primary_group'),
                         self.lab_group.id)

    def test_patch_primary_group_success_updates_profile(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.user_lm.profile.uuid),
            {"primary_group": self.lab_group.id}
        )
        patch_request.user = self.user_lm
        force_authenticate(patch_request, user=self.user_lm)
        self.view(patch_request, self.user_lm.profile.uuid)
        self.assertEqual(self.user_lm.profile.primary_group_id,
                         self.lab_group.id)

    def test_patch_primary_group_returns_unauthorized_for_anon_user(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.user_lm.profile.uuid),
            {"primary_group": self.lab_group.id}
        )
        patch_response = self.view(patch_request, self.user_lm.profile.uuid)
        self.assertEqual(patch_response.status_code, 401)

    def test_patch_primary_group_returns_bad_request_for_invalid_group(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.user_lm.profile.uuid),
            {"primary_group": 0}
        )
        patch_request.user = self.user_lm
        force_authenticate(patch_request, user=self.user_lm)
        patch_response = self.view(patch_request, self.user_lm.profile.uuid)
        self.assertEqual(patch_response.status_code, 400)

    def test_patch_primary_group_returns_bad_request_for_non_member(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.user_lm.profile.uuid),
            {"primary_group": self.non_lab_group.id}
        )
        patch_request.user = self.user_lm
        force_authenticate(patch_request, user=self.user_lm)
        patch_response = self.view(patch_request, self.user_lm.profile.uuid)
        self.assertEqual(patch_response.status_code, 400)


class EventApiV2Tests(APIV2TestCase):
    maxDiff = None

    def setUp(self):
        super(EventApiV2Tests, self).setUp(
            api_base_name="events/",
            view=EventViewSet.as_view()
        )

    def test_get_event_list_provides_access_control_between_users(self):
        # Create objects that trigger Events for "another_user"
        another_user = User.objects.create_user("Another", "User",
                                                "another_user@example.com")
        create_tool_with_necessary_models("VISUALIZATION", user=another_user)
        events = Event.objects.all()
        self.assertEqual(len(events), 2)

        get_request = self.factory.get(urljoin(self.url_root, '/'))
        get_request.user = self.user
        get_response = self.view(get_request).render()
        # Ensure that request made by "self.user" doesn't return Events from
        #  "another_user"
        self.assertEqual(json.loads(get_response.content), [])

    def test_get_event_list(self):
        CuserMiddleware.set_user(self.user)
        create_tool_with_necessary_models("VISUALIZATION", user=self.user)
        create_tool_with_necessary_models("WORKFLOW", user=self.user)
        events = Event.objects.all()
        self.assertEqual(events.count(), 4)

        messages = [str(event) for event in events]
        data_sets = [DataSet.objects.get(uuid=event.data_set.uuid) for event in
                     events]
        display_names = [
            event.get_details_as_dict().get('display_name') for event in events
        ]
        date_times = [
            event.date_time.isoformat().replace('+00:00', 'Z') for event in
            events
        ]

        get_request = self.factory.get(urljoin(self.url_root, '/'))
        get_request.user = self.user
        get_response = self.view(get_request)
        self.assertEqual(
            get_response.data,
            [
                {
                    'date_time': date_times[3],
                    'message': messages[3],
                    'data_set': DataSetSerializer(
                        data_sets[3], context={'request': get_request}
                    ).data,
                    'group': None,
                    'user': UserSerializer(self.user).data,
                    'type': 'UPDATE',
                    'sub_type': 'ANALYSIS_CREATION',
                    'details': {'display_name': display_names[3]}
                },
                {
                    'date_time': date_times[2],
                    'message': messages[2],
                    'data_set': DataSetSerializer(
                        data_sets[2], context={'request': get_request}
                    ).data,
                    'group': None,
                    'user': UserSerializer(self.user).data,
                    'type': 'CREATE',
                    'sub_type': '',
                    'details': {}
                },
                {
                    'date_time': date_times[1],
                    'message': messages[1],
                    'data_set': DataSetSerializer(
                        data_sets[1], context={'request': get_request}
                    ).data,
                    'group': None,
                    'user': UserSerializer(self.user).data,
                    'type': 'UPDATE',
                    'sub_type': 'VISUALIZATION_CREATION',
                    'details': {'display_name': display_names[1]}
                },
                {
                    'date_time': date_times[0],
                    'message': messages[0],
                    'data_set': DataSetSerializer(
                        data_sets[0], context={'request': get_request}
                    ).data,
                    'group': None,
                    'user': UserSerializer(self.user).data,
                    'type': 'CREATE',
                    'sub_type': '',
                    'details': {}
                }
            ]
        )


class CustomRegistrationViewTests(TestCase):
    @override_settings(
        REFINERY_GOOGLE_RECAPTCHA_SITE_KEY="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",  # noqa: E501
        REFINERY_GOOGLE_RECAPTCHA_SECRET_KEY="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"  # noqa: E501
    )
    def test_user_registration_successful_recaptcha(self):
        username = "new-test-user"
        password = make_password('password')
        response = self.client.post(
            "/accounts/register/",
            data={
                "username": username,
                "email": "test@example.com",
                "first_name": "test",
                "last_name": "user",
                "affiliation": "Test Users",
                "password1": password,
                "password2": password
            }
        )
        self.assertTrue(response.wsgi_request.recaptcha_is_valid)
        self.assertIsNotNone(User.objects.get(username=username))

    @override_settings(
        REFINERY_GOOGLE_RECAPTCHA_SITE_KEY="invalid_site_key",
        REFINERY_GOOGLE_RECAPTCHA_SECRET_KEY="invalid_secret_key"
    )
    def test_user_registration_unsuccessful_recaptcha(self):
        username = "new-test-user"
        password = make_password('password')
        response = self.client.post(
            "/accounts/register/",
            data={
                "username": username,
                "email": "test@example.com",
                "first_name": "test",
                "last_name": "user",
                "affiliation": "Test Users",
                "password1": password,
                "password2": password
            }
        )
        self.assertEqual(400, response.status_code)
        self.assertFalse(response.wsgi_request.recaptcha_is_valid)
        self.assertRaises(User.DoesNotExist, User.objects.get,
                          username=username)


class SiteStatisticsViewTests(TestCase):
    def setUp(self):
        # Simulate a day of user activity
        self.user = User.objects.create_superuser("user", "", "user")
        self.client.login(username="user", password="user")
        self.dataset_a = create_dataset_with_necessary_models(user=self.user)
        self.dataset_b = create_dataset_with_necessary_models(user=self.user)
        self.site_statistics_a = SiteStatistics.objects.create()
        self.site_statistics_a.collect()

    def test_is_accessible_by_admins_only(self):
        self.user.is_staff = False
        self.user.save()
        response = self.client.get("/sitestatistics/deltas.csv")
        self.assertEqual(response.status_code, 302)
        self.assertIn("login/?next", response.url)

    @mock.patch.object(SiteStatistics, "get_csv_row")
    def test_get_deltas_csv(self, get_csv_row_mock):
        response = self.client.get("/sitestatistics/deltas.csv")
        self.assertIn(",".join(SiteStatistics.CSV_COLUMN_HEADERS),
                      response.content)
        get_csv_row_mock.assert_called_with(aggregates=False)

        # first entry ignored for deltas
        self.assertEqual(get_csv_row_mock.call_count, 1)

    @mock.patch.object(SiteStatistics, "get_csv_row")
    def test_get_totals_csv(self, get_csv_row_mock):
        response = self.client.get("/sitestatistics/totals.csv")
        self.assertIn(",".join(SiteStatistics.CSV_COLUMN_HEADERS),
                      response.content)
        get_csv_row_mock.assert_called_with(aggregates=True)
        self.assertEqual(get_csv_row_mock.call_count, 2)


class ObtainAuthTokenValidSessionApiV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(ObtainAuthTokenValidSessionApiV2Tests, self).setUp(
            api_base_name="obtain-auth-token/",
            view=ObtainAuthTokenValidSession.as_view()
        )

    def test_get_with_valid_session(self):
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(json.loads(get_response.content),
                         {"token": self.user.auth_token.key})

    def test_get_without_valid_session(self):
        get_request = self.factory.get(self.url_root)
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 403)
