import json
import random
import string
from urlparse import urljoin

from django.contrib.auth.models import User, Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.test import TestCase

from guardian.shortcuts import assign_perm
import mock
import mockcache as memcache
from rest_framework.test import (APIRequestFactory, APIClient, APITestCase,
                                 force_authenticate)
from tastypie.test import ResourceTestCase

from .api import AnalysisResource
from .management.commands.create_user import init_user
from .models import (Analysis, AnalysisNodeConnection, create_nodeset, DataSet,
                     delete_nodeset, ExtendedGroup, get_nodeset,
                     invalidate_cached_object, InvestigationLink, NodeGroup,
                     NodeSet, Project, Tutorials, update_nodeset,
                     UserProfile, Workflow, WorkflowEngine)
from .utils import (create_current_selection_node_group,
                    filter_nodes_uuids_in_solr, get_aware_local_time,
                    move_obj_to_front)
from .views import AnalysesViewSet, DataSetsViewSet, NodeGroups
from .serializers import NodeGroupSerializer
from data_set_manager.models import Assay, Investigation, Node, Study
from file_store.models import FileStoreItem
from galaxy_connector.models import Instance


cache = memcache.Client(["127.0.0.1:11211"])


class UserCreateTest(TestCase):
    """Test User instance creation"""

    def setUp(self):
        self.username = "testuser"
        self.password = "password"
        self.email = "test@example.com"
        self.first_name = "John"
        self.last_name = "Sample"
        self.affiliation = "University"
        self.public_group_name = ExtendedGroup.objects.public_group().name

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


class NodeSetTest(TestCase):
    """Test all NodeSet operations"""

    def setUp(self):
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(
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
        new_study = Study.objects.create(investigation=self.investigation)
        update_nodeset(uuid=nodeset.uuid, study=new_study)
        self.assertEqual(
            NodeSet.objects.get(uuid=nodeset.uuid).study, new_study
        )

    def test_update_nodeset_assay(self):
        """Test updating NodeSet assay"""
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay)
        new_assay = Assay.objects.create(study=self.study)
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


def make_api_uri(resource_name, resource_id='', sharing=False):
    """Helper function to build Tastypie REST URIs"""
    base_url = '/api/v1'
    uri = '/'.join([base_url, resource_name]) + '/'
    uri_with_resource_id = '/'.join([base_url, resource_name, resource_id]) \
                           + '/'

    def add_sharing(uri):
        return uri + 'sharing/'

    if resource_id:
        if sharing:
            return add_sharing(uri_with_resource_id)
        else:
            return uri_with_resource_id
    else:
        if sharing:
            return add_sharing(uri)
        else:
            return uri


class NodeSetResourceTest(ResourceTestCase):
    """Test NodeSet REST API operations"""

    def setUp(self):
        super(NodeSetResourceTest, self).setUp()
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)
        self.investigation2 = Investigation.objects.create()
        self.study2 = Study.objects.create(investigation=self.investigation)
        self.assay2 = Assay.objects.create(study=self.study2)
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

    # See https://github.com/refinery-platform/refinery-platform/issues/586
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

    # See https://github.com/refinery-platform/refinery-platform/issues/586
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
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)
        self.investigation2 = Investigation.objects.create()
        self.study2 = Study.objects.create(investigation=self.investigation)
        self.assay2 = Assay.objects.create(study=self.study2)
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


class BaseResourceSlugTest(TestCase):
    """Tests for BaseResource Slugs"""

    def setUp(self):
        # make some data
        for index, item in enumerate(range(0, 10)):
            DataSet.objects.create(slug="TestSlug%d" % index)
        self.project = Project.objects.create(name="project")
        self.project_with_slug = Project.objects.create(
            name="project2",
            slug="project_slug"
        )
        self.project_with_empty_slug = Project.objects.create(
            name="project3",
            slug=None
        )

    def test_duplicate_slugs(self):
        # Try to create DS with existing slug
        DataSet.objects.create(slug="TestSlug1")
        self.assertEqual(DataSet.objects.filter(slug="TestSlug1")
                         .count(), 1)

    def test_empty_slug(self):
        DataSet.objects.create(slug="")
        dataset_empty_slug = DataSet.objects.get(slug="")
        self.assertIsNotNone(dataset_empty_slug)
        DataSet.objects.create(slug=None)
        dataset_none_slug = DataSet.objects.get(slug=None)
        self.assertIsNotNone(dataset_none_slug)

    def test_edit_existing_slug(self):
        instance = DataSet.objects.get(slug="TestSlug1")
        instance.summary = "Edited Summary"
        instance.save()
        data_set_edited = DataSet.objects.get(summary="Edited Summary")
        self.assertIsNotNone(data_set_edited)

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
        dataset_with_same_slug_as_project = DataSet.objects.create(
            slug=self.project_with_slug.slug)
        self.assertIsNotNone(dataset_with_same_slug_as_project)

    def test_save_empty_slug_when_another_model_with_same_slug_exists(self):
        dataset_no_slug = DataSet.objects.create(
            slug=self.project_with_empty_slug.slug)

        self.assertIsNotNone(dataset_no_slug)

    def test_save_slug_when_same_model_with_same_slug_exists(self):
        Project.objects.create(name="project", slug="TestSlug4")
        Project.objects.create(name="project_duplicate", slug="TestSlug4")
        self.assertRaises(Project.DoesNotExist,
                          Project.objects.get,
                          name="project_duplicate")

    def test_save_empty_slug_when_same_model_with_same_slug_exists(self):
        project_with_no_slug = Project.objects.create(name="project2",
                                                      slug=None)
        self.assertIsNotNone(project_with_no_slug)

    def test_save_empty_slug_when_same_model_with_same_empty_slug_exists(
            self):

        Project.objects.create(name="project_no_slug", slug="")
        Project.objects.create(name="project_no_slug_duplicate", slug="")
        self.assertIsNotNone(Project.objects.get(
            name="project_no_slug_duplicate"))

        Project.objects.create(name="project_no_slug2", slug=None)
        Project.objects.create(name="project_no_slug_duplicate2", slug=None)

        self.assertIsNotNone(Project.objects.get(
            name="project_no_slug_duplicate2"))

        Project.objects.create(name="project_no_slug3", slug="            ")
        Project.objects.create(name="project_no_slug_duplicate3",
                               slug="            ")
        self.assertIsNotNone(Project.objects.get(
            name="project_no_slug_duplicate3"))


class CachingTest(TestCase):
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


class WorkflowDeletionTest(TestCase):
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
        self.workflow_used_by_analyses = Workflow.objects.create(
            name="workflow_used_by_analyses",
            workflow_engine=self.workflow_engine)
        self.workflow_not_used_by_analyses = Workflow.objects.create(
            name="workflow_not_used_by_analyses",
            workflow_engine=self.workflow_engine)
        self.dataset = DataSet.objects.create()
        self.analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset,
            workflow=self.workflow_used_by_analyses,
            status="SUCCESS"
        )
        self.analysis.set_owner(self.user)

    def test_verify_workflow_used_by_analysis(self):
        self.assertEqual(self.analysis.workflow.name,
                         "workflow_used_by_analyses")

    def test_verify_no_deletion_if_workflow_used_in_analysis(self):
        self.workflow_used_by_analyses.delete()
        self.assertIsNotNone(self.workflow_used_by_analyses)
        self.assertFalse(self.workflow_used_by_analyses.is_active)

    def test_verify_deletion_if_workflow_not_used_in_analysis(self):
        self.assertIsNotNone(Workflow.objects.get(
            name="workflow_not_used_by_analyses"))
        self.workflow_not_used_by_analyses.delete()
        self.assertRaises(Workflow.DoesNotExist,
                          Workflow.objects.get,
                          name="workflow_not_used_by_analyses")


class DataSetDeletionTest(TestCase):
    """Testing for the deletion of Datasets"""

    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.project = Project.objects.create()
        self.galaxy_instance = Instance.objects.create()
        self.isa_archive_file = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.zip',
                'Coffee is delicious!')
        )
        self.pre_isa_archive_file = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.txt',
                'Coffee is delicious!')
        )
        self.investigation = Investigation.objects.create(
                isarchive_file=self.isa_archive_file.uuid,
                pre_isarchive_file=self.pre_isa_archive_file.uuid
            )

        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            name="Workflow1", workflow_engine=self.workflow_engine)
        self.dataset_with_analysis = DataSet.objects.create(
            name="dataset_with_analysis")
        self.dataset_without_analysis = \
            DataSet.objects.create(name="dataset_without_analysis")
        self.investigation_link = \
            InvestigationLink.objects.create(
                investigation=self.investigation,
                data_set=self.dataset_without_analysis)

        self.analysis = Analysis.objects.create(
            name='bla',
            summary='keks',
            project=self.project,
            data_set=self.dataset_with_analysis,
            workflow=self.workflow,
            status="SUCCESS"
        )
        self.analysis.set_owner(self.user)

    def test_verify_dataset_deletion_if_no_analysis_run_upon_it(self):
        self.assertIsNotNone(
            DataSet.objects.get(name="dataset_without_analysis"))
        self.dataset_without_analysis.delete()
        self.assertRaises(DataSet.DoesNotExist,
                          DataSet.objects.get,
                          name="dataset_without_analysis")

    def test_verify_dataset_deletion_if_analysis_run_upon_it(self):
        self.assertIsNotNone(
            DataSet.objects.get(name="dataset_with_analysis"))
        self.dataset_with_analysis.delete()
        self.assertRaises(DataSet.DoesNotExist,
                          DataSet.objects.get,
                          name="dataset_with_analysis")

    def test_isa_archive_deletion(self):
        self.assertIsNotNone(self.dataset_without_analysis.get_isa_archive())
        self.dataset_without_analysis.delete()
        self.assertIsNone(self.dataset_without_analysis.get_isa_archive())

    def test_pre_isa_archive_deletion(self):
        self.assertIsNotNone(
            self.dataset_without_analysis.get_pre_isa_archive())
        self.dataset_without_analysis.delete()
        self.assertIsNone(self.dataset_without_analysis.get_pre_isa_archive())


class AnalysisDeletionTest(TestCase):
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

        # Create a galaxy Instance
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
        self.investigation = Investigation.objects.create()
        self.investigation_link = InvestigationLink.objects.create(
            investigation=self.investigation,
            data_set=self.dataset_with_analysis)
        self.investigation1 = Investigation.objects.create()
        self.investigation_link1 = InvestigationLink.objects.create(
            investigation=self.investigation1,
            data_set=self.dataset_with_analysis1)

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)
        self.study1 = Study.objects.create(investigation=self.investigation1)
        self.assay1 = Assay.objects.create(study=self.study1)

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

    def test_verify_analysis_deletion_if_nodes_not_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'out'
        query = Analysis.objects.get(
            name='analysis_without_node_analyzed_further')
        self.assertIsNotNone(query)
        self.analysis.delete()
        self.assertRaises(Analysis.DoesNotExist, Analysis.objects.get,
                          name='analysis_without_node_analyzed_further')

    def test_verify_analysis_remains_if_nodes_analyzed_further(self):
        # Try to delete Analysis with a Node that has an
        # AnalysisNodeConnection with direction == 'in'
        self.analysis_with_node_analyzed_further.delete()
        self.assertIsNotNone(Analysis.objects.get(
            name='analysis_with_node_analyzed_further'))


class NodeGroupAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
        self.study = Study.objects.create(
                file_name='test_filename123.txt',
                title='Study Title Test',
                investigation=investigation)
        assay = {
            'study': self.study,
            'measurement': 'transcription factor binding site',
            'measurement_accession': 'http://www.testurl.org/testID',
            'measurement_source': 'OBI',
            'technology': 'nucleotide sequencing',
            'technology_accession': 'test info',
            'technology_source': 'test source',
            'platform': 'Genome Analyzer II',
            'file_name': 'test_assay_filename.txt'
        }
        self.assay = Assay.objects.create(**assay)
        self.node_1 = Node.objects.create(assay=self.assay,
                                          study=self.study,
                                          name='Node1')

        self.node_2 = Node.objects.create(assay=self.assay,
                                          study=self.study,
                                          name='Node2')
        self.node_group = NodeGroup.objects.create(
            assay=self.assay,
            study=self.study,
            name='Test Node Group 1'
        )
        self.nodes_list = [self.node_1, self.node_2]
        self.nodes_list_uuid = [self.node_1.uuid, self.node_2.uuid]
        self.node_group.nodes.add(*self.nodes_list)
        self.node_group.node_count = len(self.nodes_list)
        self.node_group.save()

        self.node_group_2 = NodeGroup.objects.create(
            assay=self.assay,
            study=self.study,
            name='Test Node Group 2'
        )
        self.node_group_list = [self.node_group, self.node_group_2]
        self.valid_uuid = self.node_group.uuid
        self.url_root = '/api/v2/node_groups/'
        self.view = NodeGroups.as_view()
        self.invalid_uuid = "03b5f681-35d5-4bdd-bc7d-8552fa777ebc"
        self.invalid_format_uuid = "xxxxxxxx"

    def test_get_valid_uuid(self):
        # valid_uuid
        request = self.factory.get('%s/?uuid=%s' % (
            self.url_root, self.valid_uuid))
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data,
                         NodeGroupSerializer(self.node_group).data)

    def test_get_valid_assay_uuid(self):
        # valid_assay_uuid
        request = self.factory.get('%s/?assay=%s' % (
            self.url_root, self.assay.uuid))
        response = self.view(request, self.assay.uuid)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(self.node_group_list))
        self.assertItemsEqual(response.data, NodeGroupSerializer(
            self.node_group_list, many=True).data)

    def test_get_invalid_uuid(self):
        # invalid_uuid
        request = self.factory.get('%s/?uuid=%s' % (self.url_root,
                                                    self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_assay_uuid(self):
        # invalid_assay_uuid
        request = self.factory.get('%s/?assay=%s' % (self.url_root,
                                                     self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_format_uuid(self):
        # invalid_format_uuid
        request = self.factory.get('%s/?uuid=%s'
                                   % (self.url_root,
                                      self.invalid_format_uuid))
        response = self.view(request, self.invalid_format_uuid)
        self.assertEqual(response.status_code, 404)

    def test_post_valid_form(self):
        # valid form
        new_node_group = {'name': 'Test Group3',
                          'assay': self.assay.uuid,
                          'study': self.study.uuid,
                          'nodes': self.nodes_list_uuid
                          }
        request = self.factory.post('%s/' % self.url_root, new_node_group)
        response = self.view(request)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data.get('name'), new_node_group.get('name'))
        self.assertEqual(response.data.get('node_count'),
                         len(self.nodes_list_uuid))
        self.assertItemsEqual(response.data.get('nodes'), self.nodes_list_uuid)

    def test_post_invalid_form(self):
        # invalid form
        new_node_group = {'name': 'Test Group3',
                          'assay': self.assay.uuid,
                          'study': self.study.uuid,
                          'nodes': '%s' % self.invalid_uuid}
        request = self.factory.post('%s/' % self.url_root, new_node_group)
        response = self.view(request)
        self.assertEqual(response.status_code, 400)

    def test_put_valid_uuid_and_valid_input(self):
        # valid uuid and valid input
        request = self.factory.put('%s/' % self.url_root,
                                   {'uuid': self.node_group_2.uuid,
                                    'nodes': self.nodes_list_uuid,
                                    'is_current': True})
        response = self.view(request)
        self.assertEqual(response.status_code, 202)
        self.assertItemsEqual(response.data.get('nodes'), self.nodes_list_uuid)

    def test_put_valid_uuid_and_invalid_node(self):
        # valid uuid but node invalid uuid
        request = self.factory.put('%s/' % self.url_root,
                                   {'uuid': self.node_group_2.uuid,
                                    'nodes': self.invalid_uuid,
                                    'is_current': True})
        response = self.view(request)
        self.assertEqual(response.status_code, 400)

    def test_put_invalid_uuid(self):
        # invalid_uuid
        request = self.factory.put('%s/' % self.url_root,
                                   {'uuid': self.invalid_uuid}
                                   )
        response = self.view(request)
        self.assertEqual(response.status_code, 404)

    def test_put_invalid_format_uuid(self):
        # invalid_format_uuid
        request = self.factory.put('%s/' % self.url_root,
                                   {'uuid': self.invalid_format_uuid}
                                   )
        response = self.view(request)
        self.assertEqual(response.status_code, 404)


class UtilitiesTest(TestCase):
    def setUp(self):
        investigation = Investigation.objects.create()
        self.study = Study.objects.create(
                file_name='test_filename123.txt',
                title='Study Title Test',
                investigation=investigation)
        assay = {
            'study': self.study,
            'measurement': 'transcription factor binding site',
            'measurement_accession': 'http://www.testurl.org/testID',
            'measurement_source': 'OBI',
            'technology': 'nucleotide sequencing',
            'technology_accession': 'test info',
            'technology_source': 'test source',
            'platform': 'Genome Analyzer II',
            'file_name': 'test_assay_filename.txt'
        }
        self.assay = Assay.objects.create(**assay)
        self.valid_uuid = self.assay.uuid
        self.invalid_uuid = "03b5f681-35d5-4bdd-bc7d-8552fa777ebc"
        self.node_uuids = [
            "1a50204d-49fa-4082-a708-26ee93fb0f86",
            "32e977fc-b906-4315-b6ed-6a644d173492",
            "910117c5-fda2-4700-ae87-dc897f3a5d85"
            ]

    def test_get_aware_local_time(self):
        expected_time = timezone.localtime(timezone.now())
        response_time = get_aware_local_time()
        difference_time = response_time - expected_time

        self.assertLessEqual(difference_time.total_seconds(), .99)

    def test_create_current_selection_node_group_valid(self):
        response = create_current_selection_node_group(self.valid_uuid)
        self.assertEqual(response.status_code, 201)

    def test_create_current_selection_node_group_invalid(self):
        response = create_current_selection_node_group(self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    # Mock methods used in filter_nodes_uuids_in_solr
    def fake_generate_solr_params(params, assay_uuid):
        # Method should respond with a string
        return ''

    def fake_search_solr(params, str_name):
        # Method expects solr params and a str_name. It should return a string
        # For mock purpose, pass params which are included in solr_response
        return params

    def fake_format_solr_response(solr_response):
        # Method expects solr_response and returns array of uuid objs
        if '&fq=-uuid' in solr_response:
            # if uuids are passed in
            response_node_uuids = [
                {'uuid': 'd2041706-ad2e-4f5b-a6ac-2122fe2a9751'},
                {'uuid': '57d2b371-a364-4806-b7ee-366a722ca9f4'},
                {'uuid': 'c9d7f81f-2274-4179-ad00-28227bf4b9b7'},
                {'uuid': 'e082ce03-0a83-4162-af5c-7472e450d7d0'},
                {'uuid': '880e60f7-7036-4468-b9c8-fdeebe7c21c3'},
                {'uuid': '945aaca7-dc58-47b8-8012-e9821249ca7a'},
                {'uuid': '2b939cb3-5b40-48c2-8df7-e5472c3bdcca'},
                {'uuid': 'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'}
            ]
        else:
            # else return all uuids
            response_node_uuids = [
                {'uuid': '1a50204d-49fa-4082-a708-26ee93fb0f86'},
                {'uuid': '32e977fc-b906-4315-b6ed-6a644d173492'},
                {'uuid': '910117c5-fda2-4700-ae87-dc897f3a5d85'},
                {'uuid': 'd2041706-ad2e-4f5b-a6ac-2122fe2a9751'},
                {'uuid': '57d2b371-a364-4806-b7ee-366a722ca9f4'},
                {'uuid': 'c9d7f81f-2274-4179-ad00-28227bf4b9b7'},
                {'uuid': 'e082ce03-0a83-4162-af5c-7472e450d7d0'},
                {'uuid': '880e60f7-7036-4468-b9c8-fdeebe7c21c3'},
                {'uuid': '945aaca7-dc58-47b8-8012-e9821249ca7a'},
                {'uuid': '2b939cb3-5b40-48c2-8df7-e5472c3bdcca'},
                {'uuid': 'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'}
            ]
        return {'nodes': response_node_uuids}

    @mock.patch("data_set_manager.utils.generate_solr_params",
                fake_generate_solr_params)
    @mock.patch("data_set_manager.utils.search_solr", fake_search_solr)
    @mock.patch("data_set_manager.utils.format_solr_response",
                fake_format_solr_response)
    def test_filter_nodes_uuids_in_solr_with_uuids(self):
        response_node_uuids = [
            'd2041706-ad2e-4f5b-a6ac-2122fe2a9751',
            '57d2b371-a364-4806-b7ee-366a722ca9f4',
            'c9d7f81f-2274-4179-ad00-28227bf4b9b7',
            'e082ce03-0a83-4162-af5c-7472e450d7d0',
            '880e60f7-7036-4468-b9c8-fdeebe7c21c3',
            '945aaca7-dc58-47b8-8012-e9821249ca7a',
            '2b939cb3-5b40-48c2-8df7-e5472c3bdcca',
            'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'
        ]
        response = filter_nodes_uuids_in_solr(self.valid_uuid, self.node_uuids)
        self.assertItemsEqual(response, response_node_uuids)

    @mock.patch("data_set_manager.utils.generate_solr_params",
                fake_generate_solr_params)
    @mock.patch("data_set_manager.utils.search_solr", fake_search_solr)
    @mock.patch("data_set_manager.utils.format_solr_response",
                fake_format_solr_response)
    def test_filter_nodes_uuids_in_solr_no_uuids(self):
        response_node_uuids = [
            '1a50204d-49fa-4082-a708-26ee93fb0f86',
            '32e977fc-b906-4315-b6ed-6a644d173492',
            '910117c5-fda2-4700-ae87-dc897f3a5d85',
            'd2041706-ad2e-4f5b-a6ac-2122fe2a9751',
            '57d2b371-a364-4806-b7ee-366a722ca9f4',
            'c9d7f81f-2274-4179-ad00-28227bf4b9b7',
            'e082ce03-0a83-4162-af5c-7472e450d7d0',
            '880e60f7-7036-4468-b9c8-fdeebe7c21c3',
            '945aaca7-dc58-47b8-8012-e9821249ca7a',
            '2b939cb3-5b40-48c2-8df7-e5472c3bdcca',
            'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'
        ]
        response = filter_nodes_uuids_in_solr(self.valid_uuid, [])
        self.assertItemsEqual(response, response_node_uuids)

    def test_move_obj_to_front_valid(self):
        nodes_list = [
            {
                'uuid': 'b55c3f8b-693b-4918-861b-c3e9268ec597',
                'name': 'Test Node Group'
            },
            {
                'uuid': 'c18d7a3d-f54a-42ae-9a30-37f631fa7e73',
                'name': 'Completement Nodes 2'
            },
            {
                'uuid': '22b3dc7e-bcbd-4dfc-bccb-db72b02b4d0e',
                'name': 'Current Selection'
            },
            {
                'uuid': '0c6dc0e6-1a79-427d-b7a8-1b4f4c422755',
                'name': 'Another NodeGroup'
            },
        ]
        response_arr = nodes_list
        self.assertNotEqual(response_arr[0].get('name'),
                            nodes_list[2].get('name'))
        # Should move current selection node to front
        response_arr = move_obj_to_front(nodes_list, 'name', 'Current '
                                                             'Selection')
        self.assertEqual(response_arr[0].get('name'),
                         nodes_list[0].get('name'))
        # Should leave leading node in front
        response_arr = move_obj_to_front(nodes_list, 'name', 'Current '
                                                             'Selection')
        self.assertEqual(response_arr[0].get('name'),
                         nodes_list[0].get('name'))

    def test_move_obj_to_front_missing_prop(self):
        # Method does not throw errors if obj is missing prop_key
        nodes_list = [
            {
                'uuid': 'b55c3f8b-693b-4918-861b-c3e9268ec597',
            },
            {
                'uuid': 'c18d7a3d-f54a-42ae-9a30-37f631fa7e73',
            },
            {
                'uuid': '22b3dc7e-bcbd-4dfc-bccb-db72b02b4d0e',
                'name': 'Another NodeGroup'
            },
            {
                'uuid': '0c6dc0e6-1a79-427d-b7a8-1b4f4c422755',
                'name': 'Current Selection'
            },
        ]
        response_arr = nodes_list
        self.assertNotEqual(response_arr[0].get('name'),
                            nodes_list[3].get('name'))
        # Should move current selection node to front
        response_arr = move_obj_to_front(nodes_list, 'name', 'Current '
                                                             'Selection')
        self.assertEqual(response_arr[0].get('name'),
                         nodes_list[0].get('name'))


class UserTutorialsTest(TestCase):
    """
    This test ensures that whenever a UserProfile instance is created,
    there is a Tutorial object associated with it
    """
    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.userprofile = UserProfile.objects.get(user=self.user)

    def test_tutorial_creation(self):
        self.assertIsNotNone(
            Tutorials.objects.get(user_profile=self.userprofile)
        )


class DataSetResourceTest(ResourceTestCase):
    """Test DataSet V1 REST API operations"""

    def setUp(self):
        super(DataSetResourceTest, self).setUp()
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
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(
            study=self.study)
        self.investigation_link = \
            InvestigationLink.objects.create(
                investigation=self.investigation,
                data_set=self.dataset,
                version=1
            )

    def get_credentials(self):
        """Authenticate as self.user"""
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(
            username=self.username,
            password=self.password
        )

    def test_get_dataset(self):
        """Test retrieving an existing Dataset that belongs to a user who
        created it
        """

        self.dataset.set_owner(self.user)

        dataset_uri = make_api_uri(
            "data_sets", self.dataset.uuid)
        response = self.api_client.get(
            dataset_uri,
            format='json'
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertEqual(data['uuid'], self.dataset.uuid)

    def test_get_dataset_expecting_analyses(self):
        a1 = Analysis.objects.create(
            name='a1',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )
        a2 = Analysis.objects.create(
            name='a2',
            project=self.user_catch_all_project,
            data_set=self.dataset,
            workflow=self.workflow
        )

        a1.set_owner(self.user)
        a2.set_owner(self.user)

        dataset_uri = make_api_uri("data_sets",
                                   self.dataset.uuid)
        response = self.api_client.get(
            dataset_uri,
            format='json'
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertEqual(data['uuid'], self.dataset.uuid)
        self.assertIsNotNone(data['analyses'])
        self.assertEqual(len(data['analyses']), 2)

        self.assertIsNotNone(data['analyses'][0]['is_owner'])
        self.assertTrue(data['analyses'][0]['is_owner'])
        self.assertIsNotNone(data['analyses'][0]['owner'])
        self.assertEqual(
            data['analyses'][0]['owner'],
            UserProfile.objects.get(user=self.user).uuid
        )
        self.assertEqual(data['analyses'][0]['status'], a2.status)
        self.assertEqual(data['analyses'][0]['name'], a2.name)
        self.assertEqual(data['analyses'][0]['uuid'], a2.uuid)

    def test_get_dataset_expecting_no_analyses(self):
        dataset_uri = make_api_uri("data_sets",
                                   self.dataset.uuid)
        response = self.api_client.get(
            dataset_uri,
            format='json'
        )
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)
        self.assertEqual(data['uuid'], self.dataset.uuid)
        self.assertEqual(data['analyses'], [])


class DataSetClassMethodsTest(TestCase):
    """ Testing of methods specific to the DataSet model
    """

    def setUp(self):
        self.username = self.password = 'user'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(
            self.username2, '', self.password2
        )
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
        self.investigation = Investigation.objects.create()
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(
            study=self.study)
        self.investigation_link = \
            InvestigationLink.objects.create(
                investigation=self.investigation,
                data_set=self.dataset,
                version=1
            )

        self.file_store_item = \
            FileStoreItem.objects.create(
                datafile=SimpleUploadedFile(
                    'test_file.txt',
                    'Coffee is delicious!')
            )
        self.file_store_item1 = \
            FileStoreItem.objects.create(
                datafile=SimpleUploadedFile(
                    'test_file.txt',
                    'Coffee is delicious!')
            )
        self.file_store_item2 = \
            FileStoreItem.objects.create(
                datafile=SimpleUploadedFile(
                    'test_file.txt',
                    'Coffee is delicious!')
            )
        self.node = Node.objects.create(
            name="n0", assay=self.assay, study=self.study,
            file_uuid=self.file_store_item.uuid)
        self.node1 = Node.objects.create(
            name="n1", assay=self.assay, study=self.study,
            file_uuid=self.file_store_item1.uuid)
        self.node2 = Node.objects.create(
            name="n2", assay=self.assay, study=self.study,
            file_uuid=self.file_store_item2.uuid)
        self.node3 = Node.objects.create(
            name="n3", assay=self.assay, study=self.study)
        self.node4 = Node.objects.create(
            name="n4", assay=self.assay, study=self.study)

    def test_get_file_store_items(self):
        file_store_items = self.dataset.get_file_store_items()
        self.assertEqual(len(file_store_items), 3)
        self.assertIn(self.file_store_item, file_store_items)
        self.assertIn(self.file_store_item1, file_store_items)
        self.assertIn(self.file_store_item2, file_store_items)


class DataSetApiV2Tests(APITestCase):

    def create_rand_str(self, count):
        return ''.join(
            random.choice(string.ascii_lowercase) for _ in xrange(count)
        )

    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.view = DataSetsViewSet.as_view()

        self.url_root = '/api/v2/data_sets/'

        # Create Datasets
        self.dataset = DataSet.objects.create(
            name="coffee dataset",
            title="coffee dataset"
        )
        self.dataset2 = DataSet.objects.create(
            name="cool dataset",
            title="cool dataset"
        )

        # Set Data Sets Owner
        self.dataset.set_owner(self.user)
        self.dataset2.set_owner(self.user)

        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

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
        self.assertEqual(
            self.get_response.data['detail'], 'Method "GET" not allowed.')

    def test_dataset_delete_successful(self):

        self.assertEqual(DataSet.objects.all().count(), 2)

        self.delete_request1 = self.factory.delete(
           urljoin(self.url_root, self.dataset.uuid)
        )

        force_authenticate(self.delete_request1, user=self.user)

        self.delete_response = self.view(self.delete_request1,
                                         self.dataset.uuid)

        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(DataSet.objects.all().count(), 1)

        self.delete_request2 = self.factory.delete(
          urljoin(self.url_root, self.dataset2.uuid)
        )

        force_authenticate(self.delete_request2, user=self.user)

        self.delete_response = self.view(self.delete_request2,
                                         self.dataset2.uuid)
        self.assertEqual(self.delete_response.status_code, 200)

        self.assertEqual(DataSet.objects.all().count(), 0)

    def test_dataset_delete_no_auth(self):
        self.assertEqual(DataSet.objects.all().count(), 2)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, self.dataset.uuid)
        )

        self.delete_response = self.view(self.delete_request,
                                         self.dataset.uuid)

        self.assertEqual(self.delete_response.status_code, 403)

        self.assertEqual(DataSet.objects.all().count(), 2)

    def test_dataset_delete_not_found(self):
        self.assertEqual(DataSet.objects.all().count(), 2)

        uuid = self.dataset.uuid

        self.dataset.delete()

        self.assertEqual(DataSet.objects.all().count(), 1)

        self.delete_request = self.factory.delete(
           urljoin(self.url_root, uuid)
        )
        force_authenticate(self.delete_request, user=self.user)

        self.delete_response = self.view(self.delete_request,
                                         uuid)

        self.assertEqual(self.delete_response.status_code, 404)

        self.assertEqual(DataSet.objects.all().count(), 1)

    # Accession too long
    def test_dataset_patch_accession_fails(self):
        new_accession = self.create_rand_str(33)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"accession": new_accession}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('accession')[0],
            'Ensure this field has no more than 32 characters.'
        )

    def test_dataset_patch_accession_successful(self):
        new_accession = self.create_rand_str(10)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"accession": new_accession},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('accession'), new_accession)

    def test_dataset_patch_auth_fails(self):
        new_description = self.create_rand_str(50)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"description": new_description},
        )
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 401)

    def test_dataset_patch_description_fails(self):
        new_description = self.create_rand_str(5001)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"description": new_description},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('description')[0],
            'Ensure this field has no more than 5000 characters.'
        )

    def test_dataset_patch_description_successful(self):
        new_description = self.create_rand_str(500)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"description": new_description},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(
            patch_response.data.get('description'), new_description
        )

    # Slug too long
    def test_dataset_patch_slug_fails(self):
        new_slug = self.create_rand_str(251)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('slug')[0],
            'Ensure this field has no more than 250 characters.'
        )

    # Slugs must be unique
    def test_dataset_patch_slug_fails_unique(self):
        new_slug = self.create_rand_str(10)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug)

        # Duplicate request
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset2.uuid),
            {"slug": new_slug}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset2.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('slug')[0],
            'Slugs must be unique.'
        )

    def test_dataset_patch_slug_successful(self):
        new_slug = self.create_rand_str(10)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"slug": new_slug},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug)

    def test_dataset_patch_slug_trim_whitespace(self):
        new_slug = '  Test Slug Name  '
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"slug": new_slug},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('slug'), new_slug.strip())

    # Summary too long
    def test_dataset_patch_summary_fails(self):
        new_summary = self.create_rand_str(1001)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"summary": new_summary}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('summary')[0],
            'Ensure this field has no more than 1000 characters.'
        )

    def test_dataset_patch_summary_successful(self):
        new_summary = self.create_rand_str(500)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"summary": new_summary},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('summary'), new_summary)

    # Title too long
    def test_dataset_patch_title_fails(self):
        new_title = self.create_rand_str(251)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"title": new_title}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data.get('title')[0],
            'Ensure this field has no more than 250 characters.'
            )

    def test_dataset_patch_title_successful(self):
        new_title = "decaf coffee dataset"
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.dataset.uuid),
            {"title": new_title},
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.dataset.uuid)
        self.assertEqual(patch_response.status_code, 202)
        self.assertEqual(patch_response.data.get('title'), new_title)


class AnalysisApiV2Tests(APITestCase):

    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)
        self.project = Project.objects.create()

        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            workflow_engine=self.workflow_engine
        )
        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.view = AnalysesViewSet.as_view()

        self.url_root = '/api/v2/analyses/'

        # Create Datasets
        self.dataset = DataSet.objects.create(name="coffee dataset")
        self.dataset2 = DataSet.objects.create(name="cool dataset")

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
            data_set=self.dataset,
            workflow=self.workflow
        )
        self.analysis.set_owner(self.user)

        self.analysis2 = Analysis.objects.create(
            name='Coffee Analysis2',
            summary='coffee2',
            project=self.project,
            data_set=self.dataset,
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
