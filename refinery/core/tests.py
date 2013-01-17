"""

These will pass when you run "manage.py test".

"""


from django.contrib.auth.models import User
from django.utils import unittest, simplejson
from tastypie.test import ResourceTestCase
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset,\
    update_nodeset, get_nodesets
import data_set_manager


class NodeSetTest(unittest.TestCase):
    '''Test all NodeSet operations

    '''
    def setUp(self):
        self.investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(study=self.study)

    def test_create_minimal_nodeset(self):
        '''Test adding a new NodeSet with required fields only

        '''
        name = 'nodeset'
        nodeset = create_nodeset(name=name, study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertItemsEqual(nodeset.nodes.all(), [])
        self.assertEqual(nodeset.name, name)

    def test_create_full_nodeset(self):
        '''Test adding a new NodeSet with a list of Node instances and summary

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        name = 'nodeset'
        summary = 'sample summary'
        nodeset = create_nodeset(name=name, summary=summary, nodes=[n1, n2], study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertItemsEqual(nodeset.nodes.all(), [n1, n2])
        self.assertEqual(nodeset.name, name)
        self.assertEqual(nodeset.summary, summary)

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

    def test_update_nodeset_nodes(self):
        '''Test updating NodeSet with a new list of Node instances

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        nodeset.nodes.add(n1, n2)
        n3 = data_set_manager.models.Node.objects.create(study=self.study)
        n4 = data_set_manager.models.Node.objects.create(study=self.study)
        new_nodes = [n3, n4]
        update_nodeset(uuid=nodeset.uuid, nodes=new_nodes)
        self.assertItemsEqual(nodeset.nodes.all(), new_nodes)

    def test_get_nodesets_with_valid_node_uuid(self):
        '''Test retrieving NodeSets for a given valid Node UUID.

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        n3 = data_set_manager.models.Node.objects.create(study=self.study)
        n4 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset1 = NodeSet.objects.create(name='nodeset1', study=self.study, assay=self.assay)
        nodeset1.nodes.add(n1, n2)
        nodeset2 = NodeSet.objects.create(name='nodeset2', study=self.study, assay=self.assay)
        nodeset2.nodes.add(n2, n3)
        self.assertItemsEqual(get_nodesets(n1.uuid), [nodeset1])
        self.assertItemsEqual(get_nodesets(n2.uuid), [nodeset1, nodeset2])
        self.assertItemsEqual(get_nodesets(n4.uuid), [])

    def test_get_nodesets_with_invalid_node_uuid(self):
        '''Test retrieving NodeSets using an invalid Node UUID.

        '''
        self.assertRaises(data_set_manager.models.Node.DoesNotExist, get_nodesets, node_uuid='Invalid UUID')


def make_uri(resource_name, resource_id=''):
    '''Helper function to create Tastypie REST URIs

    '''
    base_url = '/api/v1'
    if resource_id:
        return base_url + '/' + resource_name + '/' + resource_id + '/'
    else:
        return base_url + '/' + resource_name + '/'


class NodeSetResourceTest(ResourceTestCase):
    '''Test NodeSet REST API operations.

    '''
    def setUp(self):
        super(NodeSetResourceTest, self).setUp()

        self.investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(study=self.study)

        # create a user
        self.username = self.password = 'test'
        self.user = User.objects.create_user(self.username, '', self.password)

        # using TestClient since TestAPIClient does not support SessionAuthentication yet
        self.client.login(username=self.username, password=self.password)
        #TODO: try to set X-CSRFToken header in self.api_client (get value from Client.cookies)

    def test_get_nodeset(self):
        '''Test retrieving an existing NodeSet.

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset = NodeSet.objects.create(name='nodeset1', study=self.study, assay=self.assay)
        nodeset.nodes.add(n1, n2)

        nodeset_uri = make_uri('nodeset', nodeset.uuid)
        response = self.client.get(nodeset_uri, {'format': 'json'})
        self.assertValidJSONResponse(response)
        self.assertKeys(self.deserialize(response),
                        ['name', 'summary', 'assay', 'study', 'uuid', 'nodes', 'resource_uri'])

    def test_get_nodeset_with_invalid_uuid(self):
        '''Test retrieving a NodeSet instance that doesn't exist.

        '''
        nodeset_uri = make_uri('nodeset', 'Invalid UUID')
        response = self.client.get(nodeset_uri, {'format': 'json'})
        self.assertHttpNotFound(response)

    def test_create_minimal_nodeset(self):
        '''Test adding a new NodeSet with required fields only

        '''
        post_data = simplejson.dumps({
            'name': 'nodeset1',
            'study': make_uri('study', self.study.uuid),
            'assay': make_uri('assay', self.assay.uuid),
            'nodes': []
        })
        self.assertEqual(NodeSet.objects.count(), 0)
        nodeset_uri = make_uri('nodeset')
        response = self.client.post(nodeset_uri, post_data, content_type='application/json')
        self.assertHttpCreated(response)
        self.assertEqual(NodeSet.objects.count(), 1)

    def test_create_full_nodeset(self):
        '''Test adding a new NodeSet with a list of Node instances and summary

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset_data = simplejson.dumps({
            'name': 'nodeset1',
            'summary': 'sample summary',
            'study': make_uri('study', self.study.uuid),
            'assay': make_uri('assay', self.assay.uuid),
            'nodes': [make_uri('node', n1.uuid),
                      make_uri('node', n2.uuid)],
        })
        self.assertEqual(NodeSet.objects.count(), 0)
        nodeset_uri = make_uri('nodeset')
        response = self.client.post(nodeset_uri, nodeset_data, content_type='application/json')
        self.assertHttpCreated(response)
        self.assertEqual(NodeSet.objects.count(), 1)

    def test_delete_nodeset(self):
        '''Test deleting NodeSets.

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset = NodeSet.objects.create(name='nodeset1', study=self.study, assay=self.assay)
        nodeset.nodes.add(n1, n2)
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset_uri = make_uri('nodeset', nodeset.uuid)
        response = self.client.delete(nodeset_uri)
        self.assertHttpAccepted(response)
        self.assertEqual(NodeSet.objects.count(), 0)
        # try deleting a NodeSet that doesn't exist
        response = self.client.delete(nodeset_uri)
        self.assertHttpNotFound(response)

    def test_update_nodeset(self):
        '''Test updating entire NodeSet with a new list of Nodes.

        '''
        nodeset = NodeSet.objects.create(name='nodeset1', study=self.study, assay=self.assay)
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset_data = simplejson.dumps({
            'name': 'nodeset1',
            'study': make_uri('study', self.study.uuid),
            'assay': make_uri('assay', self.assay.uuid),
            'nodes': [make_uri('node', n1.uuid),
                      make_uri('node', n2.uuid)],
        })
        self.assertEqual(NodeSet.objects.count(), 1)
        self.assertItemsEqual(NodeSet.objects.get(uuid=nodeset.uuid).nodes.all(), ())
        nodeset_uri = make_uri('nodeset', nodeset.uuid)
        response = self.client.put(nodeset_uri, nodeset_data, content_type='application/json')
        self.assertHttpAccepted(response)
        self.assertEqual(NodeSet.objects.count(), 1)
        self.assertItemsEqual(NodeSet.objects.get(uuid=nodeset.uuid).nodes.all(), (n1, n2))


class NodeSetResourceAuthenticationTest(ResourceTestCase):
    '''Test NodeSet REST API authentication.

    '''
    def setUp(self):
        super(NodeSetResourceAuthenticationTest, self).setUp()

        # create a user
        self.username = self.password = 'test'
        self.user = User.objects.create_user(self.username, '', self.password)

        self.investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        self.assay = data_set_manager.models.Assay.objects.create(study=self.study)

    def test_get_nodeset_unauthenticated(self):
        '''Test retrieving a NodeSet without logging in.

        '''
        nodeset = NodeSet.objects.create(name='nodeset1', study=self.study, assay=self.assay)
        nodeset_uri = make_uri('nodeset', nodeset.uuid)
        response = self.client.get(nodeset_uri, content_type='application/json')
        self.assertHttpUnauthorized(response)

    def test_post_nodeset_unauthenticated(self):
        '''Test creating a NodeSet without logging in.

        '''
        nodeset_uri = make_uri('nodeset')
        nodeset_data = simplejson.dumps({
            'name': 'nodeset1',
            'study': make_uri('study', self.study.uuid),
            'assay': make_uri('assay', self.assay.uuid),
            'nodes': []
        })
        response = self.client.post(nodeset_uri, nodeset_data, content_type='application/json')
        self.assertHttpUnauthorized(response)
        self.assertEqual(NodeSet.objects.count(), 0)
