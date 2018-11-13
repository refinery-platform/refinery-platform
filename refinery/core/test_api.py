import json
import uuid

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from factory_boy.django_model_factories import GalaxyInstanceFactory
from factory_boy.utils import (create_dataset_with_necessary_models,
                               make_analyses_with_single_dataset)
from guardian.shortcuts import assign_perm
from tastypie.exceptions import NotFound
from tastypie.test import ResourceTestCase

from data_set_manager.api import NodeResource
from data_set_manager.models import Investigation, Study

from .api import AnalysisResource, DataSetResource
from .models import (Analysis, Node, Project, UserProfile, Workflow,
                     WorkflowEngine)


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


class AnalysisResourceTest(LoginResourceTestCase):
    """Test Analysis REST API operations"""

    def setUp(self):
        super(AnalysisResourceTest, self).setUp()
        self.project = Project.objects.create()
        self.user_catch_all_project = UserProfile.objects.get(
            user=self.user
        ).catch_all_project
        self.dataset = create_dataset_with_necessary_models()
        self.dataset2 = create_dataset_with_necessary_models()
        self.galaxy_instance = GalaxyInstanceFactory()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            workflow_engine=self.workflow_engine
        )

    def test_get_analysis(self):
        """Test retrieving an existing Analysis that belongs to a user who
        created it
        """
        self.dataset.set_owner(self.user)
        workflow_dict = {'a': True}
        workflow_as_repr = repr(workflow_dict)
        analysis = Analysis.objects.create(name='bla', summary='keks',
                                           project=self.user_catch_all_project,
                                           data_set=self.dataset,
                                           workflow=self.workflow,
                                           workflow_copy=workflow_as_repr)
        analysis.set_owner(self.user)
        response = self.api_client.get(
            api_uri(AnalysisResource, analysis.uuid), format='json'
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)

        expected_keys = set(AnalysisResource._meta.fields)
        expected_keys.add(u'workflow_json')

        self.assertEqual(set(data.keys()), expected_keys)
        self.assertEqual(data['uuid'], analysis.uuid)

        workflow_as_json = json.dumps(workflow_dict)
        self.assertNotEqual(workflow_as_json, workflow_as_repr)
        self.assertEqual(data['workflow_json'], workflow_as_json)

    def test_get_analysis_list(self):
        """Test retrieving a list of Analysis instances that belong to a user
        who created them.
        """
        self.dataset.set_owner(self.user)
        analysis1 = Analysis.objects.create(
            name='a1', summary='keks', project=self.user_catch_all_project,
            data_set=self.dataset, workflow=self.workflow
        )
        assign_perm(
            'read_%s' % Analysis._meta.model_name, self.user, analysis1
        )
        analysis2 = Analysis.objects.create(
            name='a2', summary='keks', project=self.user_catch_all_project,
            data_set=self.dataset, workflow=self.workflow
        )
        assign_perm(
            'read_%s' % Analysis._meta.model_name, self.user, analysis2
        )
        analysis_uri = api_uri(AnalysisResource)
        response = self.api_client.get(analysis_uri, format='json',
                                       data={'order_by': '-name'})
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], analysis2.name)

    def test_get_analysis_without_login(self):
        """Test retrieving an existing Analysis without logging in"""
        self.api_client.client.logout()
        analysis = Analysis.objects.create(name='bla', summary='keks',
                                           project=self.project,
                                           data_set=self.dataset,
                                           workflow=self.workflow)
        analysis.set_owner(self.user)
        analysis_uri = api_uri(AnalysisResource, analysis.uuid)
        response = self.api_client.get(analysis_uri, format='json')
        self.assertHttpNotFound(response)

    def test_get_analysis_without_permission(self):
        """Test retrieving an existing Analysis that belongs to a different
        user
        """
        analysis = Analysis.objects.create(name='bla', summary='keks',
                                           project=self.project,
                                           data_set=self.dataset,
                                           workflow=self.workflow)
        analysis.set_owner(self.user2)
        analysis_uri = api_uri(AnalysisResource, analysis.uuid)
        response = self.api_client.get(analysis_uri, format='json')
        self.assertHttpNotFound(response)

    def test_get_analysis_with_invalid_uuid(self):
        """Test retrieving an Analysis instance that doesn't exist.
        """
        analysis = Analysis.objects.create(project=self.project,
                                           data_set=self.dataset,
                                           workflow=self.workflow)
        assign_perm(
            "read_%s" % Analysis._meta.model_name, self.user, analysis
        )
        analysis_uri = api_uri(AnalysisResource, 'Invalid UUID')
        response = self.api_client.get(analysis_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpNotFound(response)

    def test_get_analysis_list_for_given_dataset(self):
        """Test retrieving a list of Analysis instances for a given dataset"""
        self.dataset.set_owner(self.user)
        analysis1 = Analysis.objects.create(
            name='a1', project=self.user_catch_all_project,
            data_set=self.dataset, workflow=self.workflow
        )
        analysis1.set_owner(self.user)
        analysis2 = Analysis.objects.create(
            name='a2', project=self.user_catch_all_project,
            data_set=self.dataset2, workflow=self.workflow
        )
        analysis2.set_owner(self.user)
        analysis_uri = api_uri(AnalysisResource)
        response = self.api_client.get(
            analysis_uri, format='json',
            data={'data_set__uuid': self.dataset.uuid}
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], analysis1.name)

    def test_get_sorted_analysis_list(self):
        """Get a list of Analysis instances with sorting params applied
        (e.g., order_by=name)
        """
        self.dataset.set_owner(self.user)
        self.dataset2.set_owner(self.user)
        analysis1 = Analysis.objects.create(
            name='a1', project=self.user_catch_all_project,
            data_set=self.dataset, workflow=self.workflow
        )
        analysis1.set_owner(self.user)
        analysis2 = Analysis.objects.create(
            name='a2', project=self.user_catch_all_project,
            data_set=self.dataset2, workflow=self.workflow
        )
        analysis2.set_owner(self.user)
        analysis_uri = api_uri(AnalysisResource)
        response = self.api_client.get(analysis_uri, format='json',
                                       data={'order_by': 'name'})
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], analysis1.name)

    def test_get_empty_analysis_list(self):
        """Test retrieving a list of Analysis instances when none exist"""
        analysis_uri = api_uri(AnalysisResource)
        response = self.api_client.get(analysis_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 0)

    def test_delete_analysis(self):
        """Test deleting an existing Analysis instance"""
        analysis = Analysis.objects.create(project=self.project,
                                           data_set=self.dataset,
                                           workflow=self.workflow)
        self.assertEqual(Analysis.objects.count(), 1)
        assign_perm(
            "delete_%s" % Analysis._meta.model_name, self.user, analysis
        )

        analysis_uri = api_uri(AnalysisResource, analysis.uuid)
        response = self.api_client.delete(
            analysis_uri, format='json', authentication=self.get_credentials()
        )
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(Analysis.objects.count(), 1)

    def test_delete_analysis_without_login(self):
        """Test deleting an existing Analysis instance with logging in"""
        analysis = Analysis.objects.create(project=self.project,
                                           data_set=self.dataset,
                                           workflow=self.workflow)
        self.assertEqual(Analysis.objects.count(), 1)
        assign_perm(
            "delete_%s" % Analysis._meta.model_name, self.user, analysis
        )
        analysis_uri = api_uri(AnalysisResource, analysis.uuid)
        response = self.api_client.delete(analysis_uri, format='json')
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(Analysis.objects.count(), 1)


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

    def test_get_dataset_expecting_analyses(self):
        analyses_to_create = 2
        analyses, dataset = make_analyses_with_single_dataset(
            analyses_to_create, self.user
        )
        dataset_uri = api_uri(DataSetResource, dataset.uuid)
        response = self.api_client.get(dataset_uri, format='json')
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertEqual(data['uuid'], dataset.uuid)
        self.assertEqual(len(data['analyses']), analyses_to_create)

        for analysis in data['analyses']:
            self.assertEqual(analysis['owner'],
                             UserProfile.objects.get(user=self.user).uuid)
            self.assertIsNotNone(analysis.get('status'))
            self.assertIsNotNone(analysis.get('name'))
            self.assertIsNotNone(analysis.get('uuid'))

    def test_get_dataset_expecting_no_analyses(self):
        dataset_uri = api_uri(DataSetResource, self.tabular_dataset.uuid)
        response = self.api_client.get(dataset_uri, format='json')
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertEqual(data['uuid'], self.tabular_dataset.uuid)
        self.assertEqual(data['analyses'], [])

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


class NodeAPITest(LoginResourceTestCase):

    def setUp(self):
        super(NodeAPITest, self).setUp()
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.node = Node.objects.create(study=self.study)

    def test_get_node_list_count(self):
        response = self.api_client.get(api_uri(NodeResource))
        node_list_dict = self.deserialize(response)
        self.assertEqual(node_list_dict['meta']['total_count'], 1)
        self.assertEqual(len(node_list_dict['objects']), 1)

    def test_get_node_detail_fields(self):
        response = self.api_client.get(api_uri(NodeResource, self.node.uuid))
        node_fields = self.deserialize(response).keys()
        expected_fields = NodeResource._meta.fields + [
            'file_import_status', 'resource_uri'
        ]
        self.assertItemsEqual(node_fields, expected_fields)


class NodeAPIUnauthenticatedAccessTest(ResourceTestCase):

    def test_get_node_list(self):
        self.assertHttpOK(self.api_client.get(api_uri(NodeResource)))

    def test_get_node_detail(self):
        investigation = Investigation.objects.create()
        study = Study.objects.create(investigation=investigation)
        node = Node.objects.create(study=study)
        response = self.api_client.get(api_uri(NodeResource, node.uuid))
        self.assertHttpOK(response)

    def test_patch_node(self):
        response = self.api_client.patch(
            api_uri(NodeResource, str(uuid.uuid4())), data={}
        )
        self.assertHttpMethodNotAllowed(response)

    def test_post_node(self):
        response = self.api_client.post(api_uri(NodeResource))
        self.assertHttpMethodNotAllowed(response)

    def test_put_node(self):
        response = self.api_client.put(api_uri(NodeResource))
        self.assertHttpMethodNotAllowed(response)

    def test_delete_node(self):
        response = self.api_client.delete(api_uri(NodeResource))
        self.assertHttpMethodNotAllowed(response)
