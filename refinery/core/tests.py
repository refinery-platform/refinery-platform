"""

These will pass when you run "manage.py test".

"""


from django.contrib.auth.models import User, Group
from django.utils import unittest, simplejson
from tastypie.test import ResourceTestCase
from core.management.commands.init_refinery import create_public_group
from core.management.commands.create_user import init_user
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset, update_nodeset,\
                        ExtendedGroup
import data_set_manager
from guardian.shortcuts import assign


class UserCreateTest(unittest.TestCase):
    '''Test User instance creation

    '''
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
        '''Test if User accounts are added to Public group

        '''
        new_user = User.objects.create_user(self.username)
        self.assertEqual(new_user.groups.filter(name=self.public_group_name).count(), 1)

    def test_init_user(self):
        '''Test if User account are created correctly using the management command

        '''
        init_user(self.username, self.password, self.email, self.first_name,
                  self.last_name, self.affiliation)
        new_user = User.objects.get(username=self.username)
        self.assertEqual(new_user.groups.filter(name=self.public_group_name).count(), 1)


class NodeSetTest(unittest.TestCase):
    '''Test all NodeSet operations

    '''
    def setUp(self):
        self.investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(study=self.study)
        self.query = simplejson.dumps({
            "facets":{
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
        '''Test adding a new NodeSet with required fields only

        '''
        name = 'nodeset'
        nodeset = create_nodeset(name=name, study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertEqual(nodeset.name, name)
        self.assertEqual(nodeset.summary, '')
        self.assertEqual(nodeset.solr_query, '')

    def test_create_full_nodeset(self):
        '''Test adding a new NodeSet with a list of Node instances and summary

        '''
        name = 'nodeset'
        summary = 'sample summary'
        nodeset = create_nodeset(name=name, study=self.study, assay=self.assay,
                                 summary=summary, solr_query=self.query)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertEqual(nodeset.name, name)
        self.assertEqual(nodeset.summary, summary)
        self.assertEqual(nodeset.solr_query, self.query)

    def test_get_nodeset_with_valid_uuid(self):
        '''Test retrieving an existing NodeSet instance

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        self.assertEqual(get_nodeset(nodeset.uuid), nodeset)

    def test_get_nodeset_with_invalid_uuid(self):
        '''Test retrieving a NodeSet instance that doesn't exist

        '''
        self.assertRaises(NodeSet.DoesNotExist, get_nodeset, uuid='Invalid UUID')

    def test_delete_nodeset_with_valid_uuid(self):
        '''Test deleting an existing NodeSet instance

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        delete_nodeset(nodeset.uuid)
        self.assertRaises(NodeSet.DoesNotExist, NodeSet.objects.get, uuid=nodeset.uuid)

    def test_delete_nodeset_with_invalid_uuid(self):
        '''Test deleting a NodeSet instance that doesn't exist

        '''
        self.assertIsNone(delete_nodeset(uuid='Invalid UUID'))

    def test_update_nodeset_name(self):
        '''Test updating NodeSet name

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        new_name = 'new nodeset name'
        update_nodeset(uuid=nodeset.uuid, name=new_name)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).name, new_name)

    def test_update_nodeset_summary(self):
        '''Test updating NodeSet summary

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        new_summary = 'new nodeset summary'
        update_nodeset(uuid=nodeset.uuid, summary=new_summary)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).summary, new_summary)

    def test_update_nodeset_study(self):
        '''Test updating NodeSet study

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        new_study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        update_nodeset(uuid=nodeset.uuid, study=new_study)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).study, new_study)

    def test_update_nodeset_assay(self):
        '''Test updating NodeSet assay

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        new_assay = data_set_manager.models.Assay.objects.create(study=self.study)
        update_nodeset(uuid=nodeset.uuid, assay=new_assay)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).assay, new_assay)

    def test_update_nodeset_with_solr_query(self):
        '''Test updating NodeSet with a new Solr query

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay, solr_query='')
        update_nodeset(uuid=nodeset.uuid, solr_query=self.query)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).solr_query, self.query)

    def test_update_nodeset_with_blank_solr_query(self):
        '''Test deleting Solr query from a NodeSet.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study,
                                         assay=self.assay, solr_query=self.query)
        new_query = ''
        update_nodeset(uuid=nodeset.uuid, solr_query=new_query)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).solr_query, new_query)

    def test_update_nodeset_with_invalid_uuid(self):
        '''Test updating a NodeSet instance that doesn't exist

        '''
        self.assertRaises(NodeSet.DoesNotExist, update_nodeset, uuid='Invalid UUID')


def make_api_uri(resource_name, resource_id=''):
    '''Helper function to build Tastypie REST URIs

    '''
    base_url = '/api/v1'
    if resource_id:
        return '/'.join([base_url, resource_name, resource_id]) + '/'
    else:
        return '/'.join([base_url, resource_name]) + '/'


class NodeSetResourceTest(ResourceTestCase):
    '''Test NodeSet REST API operations.

    '''
    def setUp(self):
        super(NodeSetResourceTest, self).setUp()

        self.investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(study=self.study)
        self.query = {
            "facets":{
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
        self.user2 = User.objects.create_user(self.username2, '', self.password2)

    def get_credentials(self):
        '''Authenticate as self.user

        '''
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(username=self.username,
                                            password=self.password)

    def test_get_nodeset(self):
        '''Test retrieving an existing NodeSet that belongs to a user who created it.

        '''
        nodeset = NodeSet.objects.create(name='ns', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset._meta.module_name, self.user, nodeset)
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertValidJSONResponse(response)
        keys = ['name', 'summary', 'assay', 'study', 'uuid', 'is_implicit',
                'node_count', 'solr_query', 'solr_query_components', 'resource_uri']
        self.assertKeys(self.deserialize(response), keys)

    def test_get_nodeset_list(self):
        '''Test retrieving a list of NodeSets that belong to a user who created them.

        '''
        nodeset1 = NodeSet.objects.create(name='ns1', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset1._meta.module_name, self.user, nodeset1)
        nodeset2 = NodeSet.objects.create(name='ns2', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset2._meta.module_name, self.user2, nodeset2)
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertValidJSONResponse(response)
        data = self.deserialize(response)['objects']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'ns1')

    def test_get_nodeset_without_login(self):
        '''Test retrieving an existing NodeSet without logging in.

        '''
        nodeset = NodeSet.objects.create(name='ns', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset._meta.module_name, self.user, nodeset)
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.get(nodeset_uri, format='json')
        self.assertHttpUnauthorized(response)

    def test_get_nodeset_list_without_login(self):
        '''Test retrieving a list of NodeSets that belong to a user who created them.

        '''
        nodeset1 = NodeSet.objects.create(name='ns1', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset1._meta.module_name, self.user, nodeset1)
        nodeset2 = NodeSet.objects.create(name='ns2', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset2._meta.module_name, self.user2, nodeset2)
        nodeset_uri = make_api_uri('nodeset')
        response = self.api_client.get(nodeset_uri, format='json')
        self.assertHttpUnauthorized(response)

    def test_get_nodeset_without_owner(self):
        '''Test retrieving an existing NodeSet that belongs to no one.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpUnauthorized(response)

    def test_get_nodeset_without_permission(self):
        '''Test retrieving an existing NodeSet that belongs to a different user.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset._meta.module_name, self.user2, nodeset)
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpUnauthorized(response)

    def test_get_nodeset_with_invalid_uuid(self):
        '''Test retrieving a NodeSet instance that doesn't exist.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))
        assign("read_%s" % nodeset._meta.module_name, self.user, nodeset)
        nodeset_uri = make_api_uri('nodeset', 'Invalid UUID')
        response = self.api_client.get(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpNotFound(response)

    def test_create_minimal_nodeset(self):
        '''Test adding a new NodeSet with required fields only

        '''
        assign('core.add_nodeset', self.user)
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
        self.assertHttpCreated(response)
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset = NodeSet.objects.get(name='nodeset1')
        self.assertEqual(nodeset.get_owner(), self.user)

    def test_create_minimal_nodeset_without_login(self):
        '''Test adding a new NodeSet without logging in

        '''
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
        '''Test adding a new NodeSet by a user that doesn't have core.add_nodeset permission

        '''
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
        '''Test updating an existing NodeSet instance with new data.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        self.assertEqual(NodeSet.objects.count(), 1)
        self.assertEqual(nodeset.name, 'nodeset')
        self.assertFalse(nodeset.is_implicit)
        assign("change_%s" % nodeset._meta.module_name, self.user, nodeset)

        new_nodeset_data = {'name': 'new_nodeset', 'is_implicit': True}
        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.put(nodeset_uri, format='json',
                                       data=new_nodeset_data,
                                       authentication=self.get_credentials())
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset = NodeSet.objects.get(uuid=nodeset.uuid)
        self.assertEqual(nodeset.name, 'nodeset')
        self.assertFalse(nodeset.is_implicit)

    def test_delete_nodeset(self):
        '''Test deleting an existing NodeSet instance.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        self.assertEqual(NodeSet.objects.count(), 1)
        assign("delete_%s" % nodeset._meta.module_name, self.user, nodeset)

        nodeset_uri = make_api_uri('nodeset', nodeset.uuid)
        response = self.api_client.delete(nodeset_uri, format='json',
                                       authentication=self.get_credentials())
        self.assertHttpMethodNotAllowed(response)
        self.assertEqual(NodeSet.objects.count(), 1)
