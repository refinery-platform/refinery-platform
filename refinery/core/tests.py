import json
from django.contrib.auth.models import User, Group
from django.utils import unittest
from guardian.shortcuts import assign_perm
import mockcache as memcache
from tastypie.test import ResourceTestCase
from core.api import AnalysisResource
from core.management.commands.init_refinery import create_public_group
from core.management.commands.create_user import init_user
from core.models import (
    NodeSet, create_nodeset, get_nodeset, delete_nodeset, update_nodeset,
    ExtendedGroup, DataSet, InvestigationLink, Project, Analysis, Workflow,
    WorkflowEngine, UserProfile, invalidate_cached_object,
    AnalysisNodeConnection, Node)
from file_store.models import FileExtension
import data_set_manager
from galaxy_connector.models import Instance

cache = memcache.Client(["127.0.0.1:11211"])


class UserCreateTest(unittest.TestCase):
    """Test User instance creation"""

    def setUp(self):
        self.username = "testuser"
        self.password = "password"
        self.email = "test@example.com"
        self.first_name = "John"
        self.last_name = "Sample"
        self.affiliation = "University"
        create_public_group()
        self.public_group_name = ExtendedGroup.objects.public_group().name

    def tearDown(self):
        User.objects.all().delete()
        Group.objects.all().delete()

    def test_add_new_user_to_public_group(self):
        """Test if User accounts are added to Public group"""
        new_user = User.objects.create_user(self.username)
        self.assertEqual(
            new_user.groups.filter(name=self.public_group_name).count(), 1)

    def test_init_user(self):
        """Test if User account are created correctly using the management
        command
        """
        init_user(self.username, self.password, self.email, self.first_name,
                  self.last_name, self.affiliation)
        new_user = User.objects.get(username=self.username)
        self.assertEqual(
            new_user.groups.filter(name=self.public_group_name).count(), 1)


class NodeSetTest(unittest.TestCase):
    """Test all NodeSet operations"""

    def setUp(self):
        self.investigation = \
            data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(
            investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(
            study=self.study)
        self.query = json.dumps({
            "facets": {
                "platform_Characteristics_10_5_s": [],
                "cell_or_tissue_Characteristics_10_5_s": [],
                "REFINERY_TYPE_10_5_s": [],
                "species_Characteristics_10_5_s": [],
                "treatment_Characteristics_10_5_s": [],
                "factor_Characteristics_10_5_s": [],
                "factor_function_Characteristics_10_5_s": [],
                "data_source_Characteristics_10_5_s": [],
                "genome_build_Characteristics_10_5_s": [],
                "REFINERY_FILETYPE_10_5_s": [],
                "antibody_Characteristics_10_5_s": [],
                "data_type_Characteristics_10_5_s": [],
                "lab_Characteristics_10_5_s": []
            },
            "nodeSelection": [],
            "nodeSelectionBlacklistMode": True
        })

    def test_create_minimal_nodeset(self):
        """Test adding a new NodeSet with required fields only"""
        name = 'nodeset'
        nodeset = create_nodeset(name=name, study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertEqual(nodeset.name, name)
        self.assertEqual(nodeset.summary, '')
        self.assertEqual(nodeset.solr_query, '')

    def test_create_full_nodeset(self):
        """Test adding a new NodeSet with a list of Node instances and summary
        """
        name = 'nodeset'
        summary = 'sample summary'
        nodeset = create_nodeset(name=name, study=self.study, assay=self.assay,
                                 summary=summary, solr_query=self.query)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertEqual(nodeset.name, name)
        self.assertEqual(nodeset.summary, summary)
        self.assertEqual(nodeset.solr_query, self.query)

    def test_get_nodeset_with_valid_uuid(self):
        """Test retrieving an existing NodeSet instance"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        self.assertEqual(get_nodeset(nodeset.uuid), nodeset)

    def test_get_nodeset_with_invalid_uuid(self):
        """Test retrieving a NodeSet instance that doesn't exist"""
        self.assertRaises(
            NodeSet.DoesNotExist, get_nodeset, uuid='Invalid UUID'
        )

    def test_delete_nodeset_with_valid_uuid(self):
        """Test deleting an existing NodeSet instance"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        delete_nodeset(nodeset.uuid)
        self.assertRaises(
            NodeSet.DoesNotExist, NodeSet.objects.get, uuid=nodeset.uuid
        )

    def test_delete_nodeset_with_invalid_uuid(self):
        """Test deleting a NodeSet instance that doesn't exist"""
        self.assertIsNone(delete_nodeset(uuid='Invalid UUID'))

    def test_update_nodeset_name(self):
        """Test updating NodeSet name"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        new_name = 'new nodeset name'
        update_nodeset(uuid=nodeset.uuid, name=new_name)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).name, new_name
        )

    def test_update_nodeset_summary(self):
        """Test updating NodeSet summary"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        new_summary = 'new nodeset summary'
        update_nodeset(uuid=nodeset.uuid, summary=new_summary)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).summary, new_summary)

    def test_update_nodeset_study(self):
        """Test updating NodeSet study"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        new_study = data_set_manager.models.Study.objects.create(
            investigation=self.investigation)
        update_nodeset(uuid=nodeset.uuid, study=new_study)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).study, new_study
        )

    def test_update_nodeset_assay(self):
        """Test updating NodeSet assay"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        new_assay = data_set_manager.models.Assay.objects.create(
            study=self.study)
        update_nodeset(uuid=nodeset.uuid, assay=new_assay)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).assay, new_assay
        )

    def test_update_nodeset_with_solr_query(self):
        """Test updating NodeSet with a new Solr query"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay, solr_query='')
        update_nodeset(uuid=nodeset.uuid, solr_query=self.query)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).solr_query, self.query
        )

    def test_update_nodeset_with_blank_solr_query(self):
        """Test deleting Solr query from a NodeSet"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay,
                                         solr_query=self.query)
        new_query = ''
        update_nodeset(uuid=nodeset.uuid, solr_query=new_query)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).solr_query, new_query
        )

    def test_update_nodeset_with_invalid_uuid(self):
        """Test updating a NodeSet instance that doesn't exist"""
        self.assertRaises(
            NodeSet.DoesNotExist, update_nodeset, uuid='Invalid UUID'
        )


def make_api_uri(resource_name, resource_id=''):
    """Helper function to build Tastypie REST URIs"""
    base_url = '/api/v1'
    if resource_id:
        return '/'.join([base_url, resource_name, resource_id]) + '/'
    else:
        return '/'.join([base_url, resource_name]) + '/'


class NodeSetResourceTest(ResourceTestCase):
    """Test NodeSet REST API operations"""

    def setUp(self):
        super(NodeSetResourceTest, self).setUp()
        self.investigation = \
            data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(
            investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(
            study=self.study)
        self.investigation2 = \
            data_set_manager.models.Investigation.objects.create()
        self.study2 = data_set_manager.models.Study.objects.create(
            investigation=self.investigation)
        self.assay2 = data_set_manager.models.Assay.objects.create(
            study=self.study2)
        self.query = {
            "facets": {
                "platform_Characteristics_10_5_s": [],
                "cell_or_tissue_Characteristics_10_5_s": [],
                "REFINERY_TYPE_10_5_s": [],
                "species_Characteristics_10_5_s": [],
                "treatment_Characteristics_10_5_s": [],
                "factor_Characteristics_10_5_s": [],
                "factor_function_Characteristics_10_5_s": [],
                "data_source_Characteristics_10_5_s": [],
                "genome_build_Characteristics_10_5_s": [],
                "REFINERY_FILETYPE_10_5_s": [],
                "antibody_Characteristics_10_5_s": [],
                "data_type_Characteristics_10_5_s": [],
                "lab_Characteristics_10_5_s": []
            },
            "nodeSelection": [],
            "nodeSelectionBlacklistMode": True
        }
        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(self.username2, '',
                                              self.password2)

    def get_credentials(self):
        """Authenticate as self.user"""
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(username=self.username,
                                            password=self.password)

    def test_get_nodeset(self):
        """Test retrieving an existing NodeSet that belongs to a user who
        created it
        """
        nodeset = NodeSet.objects.create(
            name='ns',
            study=self.study,
            assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm("read_%s" % nodeset._meta.module_name, self.user, nodeset)
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.get(
            nodeset_uri,
            format='json',
            authentication=self.get_credentials()
        )
        self.assertValidJSONResponse(response)
        keys = ['name', 'summary', 'assay', 'study', 'uuid', 'is_implicit',
                'node_count', 'solr_query', 'solr_query_components',
                'resource_uri', 'is_current']
        self.assertKeys(self.deserialize(response), keys)

    # Test fails because the API doesn't authorize users.
    # def test_get_nodeset_list(self):
    #     """Test retrieving a list of NodeSets that belong to a user who
    #     created them
    #     """
    #     nodeset1 = NodeSet.objects.create(
    #         name='ns1',
    #         study=self.study,
    #         assay=self.assay,
    #         solr_query=json.dumps(self.query)
    #     )
    #     # nodeset1.set_owner(self.user)
    #     assign_perm(
    #         "read_%s" % nodeset1._meta.module_name,
    #         self.user,
    #         nodeset1
    #     )
    #     nodeset2 = NodeSet.objects.create(
    #         name='ns2',
    #         study=self.study,
    #         assay=self.assay,
    #         solr_query=json.dumps(self.query)
    #     )
    #     # nodeset2.set_owner(self.user2)
    #     assign_perm(
    #         "read_%s" % nodeset2._meta.module_name,
    #         self.user2,
    #         nodeset2
    #     )
    #     nodeset_uri = make_api_uri('nodeset')
    #     self.api_client.client.logout()
    #     response = self.api_client.get(
    #         nodeset_uri,
    #         format='json',
    #         authentication=self.get_credentials()
    #     )
    #     self.assertValidJSONResponse(response)
    #     data = self.deserialize(response)['objects']
    #     self.assertEqual(len(data), 1)
    #     self.assertEqual(data[0]['name'], nodeset1.name)

    def test_get_nodeset_list_for_given_study_and_assay(self):
        """Test retrieving a list of NodeSets for given study and assay"""
        nodeset1 = NodeSet.objects.create(
            name='ns1', study=self.study, assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset1._meta.module_name, self.user, nodeset1
        )
        nodeset2 = NodeSet.objects.create(
            name='ns2', study=self.study2, assay=self.assay2,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset2._meta.module_name, self.user2, nodeset2
        )
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials(),
                                       data={'study__uuid': self.study.uuid,
                                             'assay__uuid': self.assay.uuid})
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], nodeset1.name)

    def test_get_sorted_nodeset_list(self):
        """Get a list of NodeSets with sorting params applied
        (e.g., order_by=name)
        """
        nodeset1 = NodeSet.objects.create(
            name='ns1', study=self.study, assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset1._meta.module_name, self.user, nodeset1
        )
        nodeset2 = NodeSet.objects.create(
            name='ns2', study=self.study2, assay=self.assay2,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset2._meta.module_name, self.user, nodeset2
        )
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials(),
                                       data={'order_by': 'name'})
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], nodeset1.name)

    def test_get_empty_nodeset_list(self):
        """Test retrieving a list of NodeSets when none exist"""
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 0)

    def test_get_nodeset_without_login(self):
        """Test retrieving an existing NodeSet without logging in"""
        nodeset = NodeSet.objects.create(
            name='ns', study=self.study, assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm("read_%s" % nodeset._meta.module_name, self.user, nodeset)
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.get(nodeset_uri, format='json')
        self.assertHttpUnauthorized(response)

    def test_get_nodeset_list_without_login(self):
        """Test retrieving a list of NodeSets without logging in"""
        nodeset1 = NodeSet.objects.create(
            name='ns1', study=self.study, assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset1._meta.module_name, self.user, nodeset1)
        nodeset2 = NodeSet.objects.create(
            name='ns2', study=self.study, assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset2._meta.module_name, self.user2, nodeset2
        )
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.get(nodeset_uri, format='json')
        self.assertHttpUnauthorized(response)

    # See https://github.com/parklab/refinery-platform/issues/586
    # def test_get_nodeset_without_owner(self):
    #     """Test retrieving an existing NodeSet that belongs to no one.
    #     """
    #     nodeset = NodeSet.objects.create(
    #         name='nodeset',
    #         study=self.study,
    #         assay=self.assay,
    #         solr_query=json.dumps(self.query)
    #     )
    #     nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
    #     response = self.api_client.get(
    #         nodeset_uri,
    #         format='json',
    #         authentication=self.get_credentials()
    #     )
    #     self.assertHttpNotFound(response)

    # See https://github.com/parklab/refinery-platform/issues/586
    # def test_get_nodeset_without_permission(self):
    #     """Test retrieving an existing NodeSet that belongs to a different
    #     user
    #     """
    #     nodeset = NodeSet.objects.create(
    #         name='nodeset',
    #         study=self.study,
    #         assay=self.assay,
    #         solr_query=json.dumps(self.query)
    #     )
    #     assign_perm(
    #         "read_%s" % nodeset._meta.module_name, self.user2, nodeset
    #     )
    #     nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
    #     response = self.api_client.get(
    #         nodeset_uri,
    #         format='json',
    #         authentication=self.get_credentials()
    #     )
    #     self.assertHttpNotFound(response)

    def test_get_nodeset_with_invalid_uuid(self):
        """Test retrieving a NodeSet instance that doesn't exist"""
        nodeset = NodeSet.objects.create(
            name='nodeset', study=self.study, assay=self.assay,
            solr_query=json.dumps(self.query))
        assign_perm("read_%s" % nodeset._meta.module_name, self.user, nodeset)
        nodeset_uri = make_api_uri('nodeset', 'Invalid UUID')
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpNotFound(response)

    def test_create_minimal_nodeset(self):
        """Test adding a new NodeSet with required fields only"""
        dataset = DataSet.objects.create()
        InvestigationLink.objects.create(data_set=dataset,
                                         investigation=self.investigation)
        assign_perm("read_%s" % dataset._meta.module_name, self.user, dataset)
        nodeset_data = {
            'name': 'nodeset1',
            'study': make_api_uri('study', self.study.uuid),
            'assay': make_api_uri('assay', self.assay.uuid),
            'is_implicit': True
        }
        nodeset_uri = make_api_uri('nodeset')

        self.assertEqual(NodeSet.objects.count(), 0)
        response = self.api_client.post(nodeset_uri, format='json',
                                        data=nodeset_data,
                                        authentication=self.get_credentials())
        self.assertHttpCreated(response)
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset = NodeSet.objects.get(name=nodeset_data['name'])
        self.assertEqual(nodeset.get_owner(), self.user)

    def test_create_minimal_nodeset_without_login(self):
        """Test adding a new NodeSet without logging in"""
        self.assertEqual(NodeSet.objects.count(), 0)
        nodeset_data = {
            'name': 'nodeset1',
            'study': make_api_uri('study', self.study.uuid),
            'assay': make_api_uri('assay', self.assay.uuid),
            'is_implicit': True
        }
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.post(nodeset_uri, format='json',
                                        data=nodeset_data)
        self.assertHttpUnauthorized(response)
        self.assertEqual(NodeSet.objects.count(), 0)

    def test_create_minimal_nodeset_without_permission(self):
        """Test adding a new NodeSet by a user that doesn't have read_dataset
        permission on the linked dataset object.
        """
        self.assertEqual(NodeSet.objects.count(), 0)
        nodeset_data = {
            'name': 'nodeset1',
            'study': make_api_uri('study', self.study.uuid),
            'assay': make_api_uri('assay', self.assay.uuid),
            'is_implicit': True
        }
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.post(nodeset_uri, format='json',
                                        data=nodeset_data,
                                        authentication=self.get_credentials())
        self.assertHttpUnauthorized(response)
        self.assertEqual(NodeSet.objects.count(), 0)

    def test_update_nodeset(self):
        """Test updating an existing NodeSet instance with new data"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        self.assertEqual(NodeSet.objects.count(), 1)
        self.assertEqual(nodeset.name, 'nodeset')
        self.assertFalse(nodeset.is_implicit)
        assign_perm(
            "change_%s" % nodeset._meta.module_name, self.user, nodeset)

        new_nodeset_data = {'name': 'new_nodeset', 'is_implicit': True}
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        self.api_client.put(nodeset_uri, format='json', data=new_nodeset_data,
                            authentication=self.get_credentials())
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset = NodeSet.objects.get(uuid=nodeset.uuid)
        self.assertEqual(nodeset.name, 'new_nodeset')
        self.assertTrue(nodeset.is_implicit)

    # def test_update_failure_nodeset(self):
    #     """Test failing update for an existing NodeSet instance when the user
    #     has no change permission.
    #     """
    #     nodeset = NodeSet.objects.create(
    #         name='nodeset',
    #         study=self.study,
    #         assay=self.assay
    #     )
    #     self.assertEqual(NodeSet.objects.count(), 1)
    #     self.assertEqual(nodeset.name, 'nodeset')
    #     self.assertFalse(nodeset.is_implicit)
    #     nodeset.set_owner(self.user2)
    #     new_nodeset_data = {'name': 'new_nodeset', 'is_implicit': True}
    #     nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
    #     response = self.api_client.put(
    #         nodeset_uri,
    #         format='json',
    #         data=new_nodeset_data,
    #         authentication=self.get_credentials()
    #     )
    #     self.assertHttpUnauthorized(response)
    #     self.assertEqual(NodeSet.objects.count(), 1)
    #     nodeset = NodeSet.objects.get(uuid=nodeset.uuid)
    #     self.assertEqual(nodeset.name, 'nodeset')
    #     self.assertFalse(nodeset.is_implicit)

    def test_delete_nodeset(self):
        """Test deleting an existing NodeSet instance"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        self.assertEqual(NodeSet.objects.count(), 1)
        assign_perm(
            "delete_%s" % nodeset._meta.module_name, self.user, nodeset
        )
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.delete(
            nodeset_uri, format='json', authentication=self.get_credentials()
        )
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(NodeSet.objects.count(), 1)


class NodeSetListResourceTest(ResourceTestCase):
    """Test NodeSetListResource REST API operations"""

    def setUp(self):
        super(NodeSetListResourceTest, self).setUp()
        self.investigation = \
            data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(
            investigation=self.investigation
        )
        self.assay = data_set_manager.models.Assay.objects.create(
            study=self.study
        )
        self.investigation2 = \
            data_set_manager.models.Investigation.objects.create()
        self.study2 = data_set_manager.models.Study.objects.create(
            investigation=self.investigation
        )
        self.assay2 = data_set_manager.models.Assay.objects.create(
            study=self.study2
        )
        self.query = {
            "facets": {
                "platform_Characteristics_10_5_s": [],
                "cell_or_tissue_Characteristics_10_5_s": [],
                "REFINERY_TYPE_10_5_s": [],
                "species_Characteristics_10_5_s": [],
                "treatment_Characteristics_10_5_s": [],
                "factor_Characteristics_10_5_s": [],
                "factor_function_Characteristics_10_5_s": [],
                "data_source_Characteristics_10_5_s": [],
                "genome_build_Characteristics_10_5_s": [],
                "REFINERY_FILETYPE_10_5_s": [],
                "antibody_Characteristics_10_5_s": [],
                "data_type_Characteristics_10_5_s": [],
                "lab_Characteristics_10_5_s": []
            },
            "nodeSelection": [],
            "nodeSelectionBlacklistMode": True
        }
        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(self.username2, '',
                                              self.password2)
        self.nodeset_uri = make_api_uri('nodesetlist')

    def get_credentials(self):
        """Authenticate as self.user"""
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(username=self.username,
                                            password=self.password)

    # Same reason
    # def test_get_nodeset_list(self):
    #     """Test retrieving a list of NodeSets that belong to a user who
    #     created them
    #     """
    #     nodeset1 = NodeSet.objects.create(
    #         name='ns1',
    #         study=self.study,
    #         assay=self.assay,
    #         node_count=1,
    #         is_implicit=True,
    #         solr_query=json.dumps(self.query)
    #     )
    #     assign_perm(
    #         "read_%s" % nodeset1._meta.module_name,
    #         self.user,
    #         nodeset1
    #     )
    #     nodeset2 = NodeSet.objects.create(
    #         name='ns2',
    #         study=self.study2,
    #         assay=self.assay2,
    #         node_count=1,
    #         is_implicit=True,
    #         solr_query=json.dumps(self.query)
    #     )
    #     assign_perm(
    #         "read_%s" % nodeset2._meta.module_name,
    #         self.user2,
    #         nodeset2
    #     )
    #     response = self.api_client.get(
    #         self.nodeset_uri,
    #         format='json',
    #         authentication=self.get_credentials()
    #     )
    #     self.assertValidJSONResponse(response)
    #     data = self.deserialize(response)['objects']
    #     self.assertEqual(len(data), 1)
    #     self.assertEqual(data[0]['name'], nodeset1.name)

    def test_get_sorted_nodeset_list(self):
        """Get a list of NodeSets with sorting params applied
        (e.g., order_by=name)
        """
        nodeset1 = NodeSet.objects.create(
            name='ns1', study=self.study, assay=self.assay, node_count=1,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset1._meta.module_name, self.user, nodeset1
        )
        nodeset2 = NodeSet.objects.create(
            name='ns2', study=self.study2, assay=self.assay2, node_count=1,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset2._meta.module_name, self.user, nodeset2
        )
        response = self.api_client.get(self.nodeset_uri, format='json',
                                       authentication=self.get_credentials(),
                                       data={'order_by': 'name'})
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], nodeset1.name)

    def test_get_nodeset_list_for_given_study_and_assay(self):
        """Test retrieving a list of NodeSets for given study and assay"""
        nodeset1 = NodeSet.objects.create(
            name='ns1', study=self.study, assay=self.assay, node_count=1,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset1._meta.module_name, self.user, nodeset1
        )
        nodeset2 = NodeSet.objects.create(
            name='ns2', study=self.study2, assay=self.assay2, node_count=1,
            solr_query=json.dumps(self.query))
        assign_perm(
            "read_%s" % nodeset2._meta.module_name, self.user2, nodeset2
        )
        response = self.api_client.get(self.nodeset_uri, format='json',
                                       authentication=self.get_credentials(),
                                       data={'study__uuid': self.study.uuid,
                                             'assay__uuid': self.assay.uuid})
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], nodeset1.name)

    def test_get_empty_nodeset_list(self):
        """Test retrieving a list of NodeSets when none exist"""
        response = self.api_client.get(self.nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 0)

    def test_get_nodeset_list_without_login(self):
        """Test retrieving a list of NodeSets without logging in"""
        response = self.api_client.get(self.nodeset_uri, format='json')
        self.assertHttpUnauthorized(response)

    def test_delete_nodeset_list(self):
        """Test deleting a list of NodeSets"""
        nodeset = NodeSet.objects.create(
            name='nodeset', study=self.study, assay=self.assay)
        self.assertEqual(NodeSet.objects.count(), 1)
        assign_perm(
            "delete_%s" % nodeset._meta.module_name, self.user, nodeset
        )
        response = self.api_client.delete(
            self.nodeset_uri, format='json',
            authentication=self.get_credentials()
        )
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(NodeSet.objects.count(), 1)


class AnalysisResourceTest(ResourceTestCase):
    """Test Analysis REST API operations"""

    def setUp(self):
        super(AnalysisResourceTest, self).setUp()
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(
            self.username2, '', self.password2
        )
        self.get_credentials()
        self.project = Project.objects.create()
        self.user_catch_all_project = UserProfile.objects.get(
            user=self.user
        ).catch_all_project
        self.dataset = DataSet.objects.create()
        self.dataset2 = DataSet.objects.create()
        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            workflow_engine=self.workflow_engine
        )

    def tearDown(self):
        FileExtension.objects.all().delete()

    def get_credentials(self):
        """Authenticate as self.user"""
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(
            username=self.username,
            password=self.password
        )

    def test_get_analysis(self):
        """Test retrieving an existing Analysis that belongs to a user who
        created it
        """

        self.dataset.set_owner(self.user)

        analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        analysis.set_owner(self.user)
        analysis_uri = make_api_uri(Analysis._meta.module_name, analysis.uuid)
        response = self.api_client.get(
            analysis_uri,
            format='json'
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertKeys(data, AnalysisResource.Meta.fields)
        self.assertEqual(data['uuid'], analysis.uuid)

    def test_get_analysis_list(self):
        """Test retrieving a list of Analysis instances that belong to a user
        who created them.
        """

        self.dataset.set_owner(self.user)

        analysis1 = Analysis.objects.create(
            name='a1',
            summary='keks',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        assign_perm(
            'read_%s' % Analysis._meta.module_name,
            self.user,
            analysis1
        )
        analysis2 = Analysis.objects.create(
            name='a2',
            summary='keks',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        assign_perm(
            'read_%s' % Analysis._meta.module_name,
            self.user,
            analysis2
        )
        analysis_uri = make_api_uri(Analysis._meta.module_name)
        response = self.api_client.get(
            analysis_uri,
            format='json'
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], analysis2.name)

    def test_get_analysis_without_login(self):
        """Test retrieving an existing Analysis without logging in"""
        self.api_client.client.logout()
        analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        analysis.set_owner(self.user)
        analysis_uri = make_api_uri(Analysis._meta.module_name, analysis.uuid)
        response = self.api_client.get(analysis_uri, format='json')
        self.assertHttpNotFound(response)

    def test_get_analysis_without_permission(self):
        """Test retrieving an existing Analysis that belongs to a different
        user
        """
        analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        analysis.set_owner(self.user2)
        analysis_uri = make_api_uri(Analysis._meta.module_name, analysis.uuid)
        response = self.api_client.get(
            analysis_uri,
            format='json'
        )
        self.assertHttpNotFound(response)

    def test_get_analysis_with_invalid_uuid(self):
        """Test retrieving an Analysis instance that doesn't exist.
        """
        analysis = Analysis.objects.create(project=self.project,
                                           data_set=self.dataset,
                                           workflow=self.workflow)
        assign_perm(
            "read_%s" % Analysis._meta.module_name, self.user, analysis
        )
        analysis_uri = make_api_uri(Analysis._meta.module_name, 'Invalid UUID')
        response = self.api_client.get(analysis_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpNotFound(response)

    def test_get_analysis_list_for_given_dataset(self):
        """Test retrieving a list of Analysis instances for a given dataset"""

        self.dataset.set_owner(self.user)

        analysis1 = Analysis.objects.create(
            name='a1',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        analysis1.set_owner(self.user)
        analysis2 = Analysis.objects.create(
            name='a2',
            project=self.user_catch_all_project,
            data_set=self.dataset2,
            workflow=self.workflow
        )
        analysis2.set_owner(self.user)
        analysis_uri = make_api_uri(Analysis._meta.module_name)
        response = self.api_client.get(
            analysis_uri,
            format='json',
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
            name='a1',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        analysis1.set_owner(self.user)
        analysis2 = Analysis.objects.create(
            name='a2',
            project=self.user_catch_all_project,
            data_set=self.dataset2,
            workflow=self.workflow
        )
        analysis2.set_owner(self.user)
        analysis_uri = make_api_uri(Analysis._meta.module_name)
        response = self.api_client.get(
            analysis_uri,
            format='json',
            data={'order_by': 'name'}
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], analysis1.name)

    def test_get_empty_analysis_list(self):
        """Test retrieving a list of Analysis instances when none exist"""
        analysis_uri = make_api_uri(Analysis._meta.module_name)
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
            "delete_%s" % Analysis._meta.module_name,
            self.user,
            analysis
        )

        analysis_uri = make_api_uri(Analysis._meta.module_name, analysis.uuid)
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
            "delete_%s" % Analysis._meta.module_name,
            self.user,
            analysis
        )
        analysis_uri = make_api_uri(Analysis._meta.module_name, analysis.uuid)
        response = self.api_client.delete(analysis_uri, format='json')
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(Analysis.objects.count(), 1)


class BaseResourceSlugTest(unittest.TestCase):
    """Tests for BaseResource Slugs"""

    def setUp(self):
        # make some data
        for index, item in enumerate(range(0, 10)):
            DataSet.objects.create(slug="TestSlug%d" % index)
        Project.objects.create(name="project")

    def tearDown(self):
        DataSet.objects.all().delete()
        Project.objects.all().delete()

    def test_duplicate_slugs(self):
        DataSet.objects.create(slug="TestSlug1")
        self.assertEqual(DataSet.objects.filter(slug="TestSlug1")
                         .count(), 1)

    def test_empty_slug(self):
        self.assertTrue(DataSet.objects.create(slug=""))

    def test_edit_existing_slug(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance.summary = "Edited Summary"
        instance.save()

        self.assertTrue(DataSet.objects.get(summary="Edited Summary"))

    def test_save_slug_no_change(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance_again = DataSet.objects.get(slug="TestSlug1")
        instance_again.save()

        self.assertEqual(instance, instance_again)

    def test_save_slug_with_change(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance_again = DataSet.objects.get(slug="TestSlug1")
        instance_again.slug = "CHANGED"
        instance_again.save()

        self.assertNotEqual(instance.slug, instance_again.slug)

    def test_save_slug_when_another_model_with_same_slug_exists(self):
        project_instance = Project.objects.get(name="project")
        project_instance.slug = "TestSlug4"
        project_instance.save()

        self.assertTrue(DataSet.objects.create(slug="TestSlug4"))


class CachingTest(unittest.TestCase):
    """Testing the addition and deletion of cached objects"""

    def setUp(self):
        # make some data
        self.username = self.password = 'Cool'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.username1 = self.password1 = 'Cool1'
        self.user1 = User.objects.create_user(
            self.username1, '', self.password1
        )
        create_public_group()
        self.public_group_name = ExtendedGroup.objects.public_group().name
        for index, item in enumerate(range(0, 6)):
            DataSet.objects.create(slug="TestSlug%d" % index)
        # Adding to cache
        cache.add("{}-DataSet".format(self.user.id), DataSet.objects.all())

        # Initial data that is cached, to test against later
        self.initial_cache = cache.get("{}-DataSet".format(self.user.id))

    def tearDown(self):
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)
        DataSet.objects.all().delete()
        User.objects.all().delete()
        Group.objects.all().delete()
        ExtendedGroup.objects.all().delete()

    def test_verify_cache_invalidation(self):
        # Grab a DataSet and see if we can invalidate the cache
        ds = DataSet.objects.get(slug="TestSlug5")
        self.cache = invalidate_cached_object(ds, True)
        self.assertIsNone(self.cache.get("{}-DataSet".format(self.user.id)))

    def test_verify_data_after_save(self):
        # Grab, alter, and save an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.slug = "NewSlug"
        ds.save()

        # Invalidate cache
        self.cache = invalidate_cached_object(ds, True)

        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)
        self.assertTrue(DataSet.objects.get(slug="NewSlug"))

    def test_verify_data_after_delete(self):
        # Grab and delete an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.delete()

        # Invalidate cache
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

        self.assertFalse(self.cache.get("{}-DataSet".format(self.user.id)))
        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)

    def test_verify_data_after_perms_change(self):
        # Grab and change sharing an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.share(group=Group.objects.get(name="Public"))

        # Invalidate cache
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

        self.assertFalse(self.cache.get("{}-DataSet".format(self.user.id)))
        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)


class WorkflowDeletionTest(unittest.TestCase):
    """Testing for the deletion of Workflows"""

    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.project = Project.objects.create()
        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)
        self.dataset = DataSet.objects.create()

    def tearDown(self):
        User.objects.all().delete()
        Project.objects.all().delete()
        WorkflowEngine.objects.all().delete()
        Workflow.objects.all().delete()
        DataSet.objects.all().delete()
        Instance.objects.all().delete()
        Analysis.objects.all().delete()

    def test_verify_workflow_used_by_analysis(self):
        analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset,
            workflow=self.workflow,
            status="SUCCESS"
        )
        analysis.set_owner(self.user)
        self.assertEqual(analysis.workflow.name, "Workflow1")

    def test_verify_no_deletion_if_workflow_used_in_analysis(self):
        analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset,
            workflow=self.workflow,
            status="SUCCESS"
        )
        analysis.set_owner(self.user)
        self.workflow.delete()
        self.assertFalse(self.workflow.is_active)

    def test_verify_deletion_if_workflow_not_used_in_analysis(self):
        self.assertEqual(self.workflow.delete(), None)


class DataSetDeletionTest(unittest.TestCase):
    """Testing for the deletion of Datasets"""

    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.project = Project.objects.create()
        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)
        self.dataset_with_analysis = DataSet.objects.create()
        self.dataset_without_analysis = DataSet.objects.create()
        self.analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset_with_analysis,
            workflow=self.workflow,
            status="SUCCESS"
        )
        self.analysis.set_owner(self.user)

    def tearDown(self):
        User.objects.all().delete()
        Project.objects.all().delete()
        WorkflowEngine.objects.all().delete()
        Workflow.objects.all().delete()
        DataSet.objects.all().delete()
        Instance.objects.all().delete()
        Analysis.objects.all().delete()
        UserProfile.objects.all().delete()
        Node.objects.all().delete()
        data_set_manager.models.Study.objects.all().delete()
        data_set_manager.models.Assay.objects.all().delete()
        data_set_manager.models.Investigation.objects.all().delete()
        AnalysisNodeConnection.objects.all().delete()
        InvestigationLink.objects.all().delete()

    def test_verify_dataset_deletion_if_no_analysis_run_upon_it(self):
        self.assertEqual(self.dataset_without_analysis.delete(), None)

    def test_verify_no_dataset_deletion_if_analysis_run_upon_it(self):
        self.dataset_with_analysis.delete()
        self.assertNotEqual(self.dataset_with_analysis, None)


class AnalysisDeletionTest(unittest.TestCase):
    """Testing for the deletion of Analyses"""

    def setUp(self):
        # Create a user
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )

        # Create a Project
        self.project = Project.objects.create()
        self.project1 = Project.objects.create()

        # Creae a galaxy Instance
        self.galaxy_instance = Instance.objects.create()

        # Create a WorkflowEngine
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )

        # Create a Workflow
        self.workflow = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)
        self.workflow1 = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)

        # Create some DataSets that will have an analysis run upon them
        self.dataset_with_analysis = DataSet.objects.create()
        self.dataset_with_analysis1 = DataSet.objects.create()

        # Create a DataSet that won't have an analysis run upon it
        self.dataset_without_analysis = DataSet.objects.create()

        # Create two Analyses using the two DataSets made earlier
        self.analysis = Analysis.objects.create(
            name='analysis_without_node_analyzed_further',
            summary='This is a summary',
            project=self.project,
            data_set=self.dataset_with_analysis,
            workflow=self.workflow,
            status="SUCCESS"
        )
        self.analysis_with_node_analyzed_further = Analysis.objects.create(
            name='analysis_with_node_analyzed_further',
            summary='This is a summary',
            project=self.project1,
            data_set=self.dataset_with_analysis1,
            workflow=self.workflow1,
            status="SUCCESS"
        )
        # Set Ownership
        self.analysis.set_owner(self.user)
        self.analysis_with_node_analyzed_further.set_owner(self.user)

        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = \
            data_set_manager.models.Investigation.objects.create()
        self.investigation_link = InvestigationLink.objects.create(
            investigation=self.investigation,
            data_set=self.dataset_with_analysis)
        self.investigation1 = \
            data_set_manager.models.Investigation.objects.create()
        self.investigation_link1 = InvestigationLink.objects.create(
            investigation=self.investigation1,
            data_set=self.dataset_with_analysis1)

        # Create Studys and Assays
        self.study = data_set_manager.models.Study.objects.create(
            investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(
            study=self.study)
        self.study1 = data_set_manager.models.Study.objects.create(
            investigation=self.investigation1)
        self.assay1 = data_set_manager.models.Assay.objects.create(
            study=self.study1)

        # Create Nodes
        self.node = Node.objects.create(assay=self.assay, study=self.study,
                                        analysis_uuid=self.analysis.uuid)

        self.node2 = Node.objects.create(assay=self.assay1, study=self.study1,
                                         analysis_uuid=self.
                                         analysis_with_node_analyzed_further
                                         .uuid)
        # Create AnalysisNodeConnections
        self.analysis_node_connection = \
            AnalysisNodeConnection.objects.create(analysis=self.analysis,
                                                  node=self.node, step=1,
                                                  direction="out")
        self.analysis_node_connection_with_node_analyzed_further = \
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis_with_node_analyzed_further,
                node=self.node2, step=2,
                direction="in")

    def tearDown(self):
        User.objects.all().delete()
        Project.objects.all().delete()
        WorkflowEngine.objects.all().delete()
        Workflow.objects.all().delete()
        DataSet.objects.all().delete()
        Instance.objects.all().delete()
        Analysis.objects.all().delete()
        UserProfile.objects.all().delete()
        Node.objects.all().delete()
        data_set_manager.models.Study.objects.all().delete()
        data_set_manager.models.Assay.objects.all().delete()
        data_set_manager.models.Investigation.objects.all().delete()
        AnalysisNodeConnection.objects.all().delete()
        InvestigationLink.objects.all().delete()

    def test_verify_analysis_deletion_if_nodes_not_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'out'
        self.assertEqual(self.analysis.delete(), None)

    def test_verify_analysis_remains_if_nodes_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'in'
        self.analysis_with_node_analyzed_further.delete()
        self.assertNotEqual(self.analysis_with_node_analyzed_further, None)
