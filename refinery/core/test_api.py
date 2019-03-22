import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from factory_boy.utils import create_dataset_with_necessary_models
from tastypie.exceptions import NotFound
from tastypie.test import ResourceTestCase

from .api import DataSetResource
from .models import Project, UserProfile


def api_uri(resource, resource_id='', sharing=False):
    """Helper function to build Tastypie REST URIs"""
    uri = reverse('api_dispatch_list', kwargs={
        'api_name': 'v1', 'resource_name': resource._meta.resource_name
    })

    if resource_id:
        if sharing:
            return uri + resource_id + '/' + 'sharing/'
        else:
            return uri + resource_id + '/'
    else:
        if sharing:
            return uri + 'sharing/'
        else:
            return uri


class LoginResourceTestCase(ResourceTestCase):

    def setUp(self):
        super(LoginResourceTestCase, self).setUp()
        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(self.username2, '',
                                              self.password2)
        self.get_credentials()

    def get_credentials(self):
        """Authenticate as self.user"""
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(username=self.username,
                                            password=self.password)


class APITest(ResourceTestCase):

    def test_xml_format_ignored(self):
        response = self.api_client.get('/api/v1/', format='xml')
        self.assertValidJSONResponse(response)


class DataSetResourceTest(LoginResourceTestCase):
    """Test DataSet V1 REST API operations"""

    def setUp(self):
        super(DataSetResourceTest, self).setUp()
        self.project = Project.objects.create()
        self.user_catch_all_project = UserProfile.objects.get(
            user=self.user
        ).catch_all_project
        self.tabular_dataset = create_dataset_with_necessary_models(
            user=self.user
        )
        self.isatab_dataset = create_dataset_with_necessary_models(
            user=self.user2, is_isatab_based=True
        )
        self.incomplete_dataset = create_dataset_with_necessary_models(
            user=self.user
        )
        # Delete InvestigationLink to simulate a Dataset that hasn't finished
        # being created
        self.incomplete_dataset.get_latest_investigation_link().delete()

    def test_get_dataset(self):
        """Test retrieving an existing Dataset that belongs to a user who
        created it
        """
        dataset_uri = api_uri(DataSetResource, self.tabular_dataset.uuid)
        response = self.api_client.get(dataset_uri, format='json')
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertEqual(data['uuid'], self.tabular_dataset.uuid)

    def test_detail_response_with_complete_dataset(self):
        # Properly created DataSets will have version information
        dataset_uri = api_uri(DataSetResource, self.tabular_dataset.uuid)
        response = self.api_client.get(dataset_uri, format='json')
        data = self.deserialize(response)
        self.assertEqual(data["version"], 1)
        self.assertIsNotNone(data["date"])

    def test_detail_response_yields_error_if_incomplete_dataset(self):
        # DataSets that aren't fully created will yield informative errors
        dataset_uri = api_uri(DataSetResource, self.incomplete_dataset.uuid)
        with self.assertRaises(NotFound):
            self.api_client.get(dataset_uri, format='json')

    def test_list_response_yields_complete_datasets_only(self):
        # DataSets that aren't fully created will not be displayed in the
        # list api response
        resp = self.api_client.get(api_uri(DataSetResource), format='json')
        self.assertValidJSONResponse(resp)
        data = json.loads(resp.content)
        self.assertEqual(data["meta"]["total_count"], 1)
        self.assertEqual(data["objects"][0]["name"], self.tabular_dataset.name)

    def test_isatab_based_dataset_specifics_in_response(self):
        response = self.api_client.get(
            api_uri(DataSetResource, self.isatab_dataset.uuid), format='json'
        )
        data = self.deserialize(response)
        isa_archive_file_store_item = \
            self.isatab_dataset.get_investigation().get_file_store_item()
        self.assertEqual(data["isa_archive"], isa_archive_file_store_item.uuid)
        self.assertEqual(data["isa_archive_url"],
                         isa_archive_file_store_item.get_datafile_url())

    def test_tabular_dataset_specifics_in_response(self):
        response = self.api_client.get(
            api_uri(DataSetResource, self.tabular_dataset.uuid), format='json'
        )
        data = self.deserialize(response)
        pre_isa_archive_file_store_item = \
            self.tabular_dataset.get_investigation().get_file_store_item()
        self.assertEqual(data["pre_isa_archive"],
                         pre_isa_archive_file_store_item.uuid)

    def test_is_owner_reflects_actual_owner(self):
        resp = self.api_client.get(api_uri(DataSetResource), format='json')
        data = json.loads(resp.content)
        dataset = data["objects"][0]
        self.assertTrue(dataset["is_owner"])
        self.assertEqual(dataset["owner"], self.user.profile.uuid)

    def test_is_owner_reflects_actual_owner_with_admin_requester(self):
        self.username = self.password = "admin"
        admin_user = User.objects.create_superuser(
            self.username, '', self.password
        )

        # use admin user's session authentication for this request
        self.get_credentials()

        resp = self.api_client.get(api_uri(DataSetResource), format='json')
        data = json.loads(resp.content)
        dataset = data["objects"][0]

        # assert that the admin user isn't displayed as the DataSet's owner
        self.assertFalse(dataset["is_owner"])
        self.assertNotEqual(dataset["owner"], admin_user.profile.uuid)
