"""

These will pass when you run "manage.py test".

"""


from django.contrib.auth.models import User
from django.utils import unittest, simplejson
from tastypie.test import ResourceTestCase
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset,\
    update_nodeset
import data_set_manager


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

        # create a user
        self.username = self.password = 'test'
        self.user = User.objects.create_user(self.username, '', self.password)

        # using TestClient since TestAPIClient does not support SessionAuthentication yet
        self.client.login(username=self.username, password=self.password)
        #TODO: try to set X-CSRFToken header in self.api_client (get value from Client.cookies)

    def test_get_nodeset(self):
        '''Test retrieving an existing NodeSet.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay,
                                         solr_query=simplejson.dumps(self.query))

        nodeset_uri = make_uri('nodeset', nodeset.uuid)
        response = self.client.get(nodeset_uri, {'format': 'json'})
        self.assertValidJSONResponse(response)
        keys = ['name', 'summary', 'assay', 'study', 'uuid', 'is_implicit',
                'node_count', 'solr_query', 'resource_uri']
        self.assertKeys(self.deserialize(response), keys)

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
        })
        self.assertEqual(NodeSet.objects.count(), 0)
        nodeset_uri = make_uri('nodeset')
        response = self.client.post(nodeset_uri, post_data, content_type='application/json')
        self.assertHttpCreated(response)
        self.assertEqual(NodeSet.objects.count(), 1)

    def test_create_full_nodeset(self):
        '''Test adding a new NodeSet with a list of Node instances and summary

        '''
        nodeset_data = simplejson.dumps({
            'name': 'nodeset1',
            'summary': 'sample summary',
            'study': make_uri('study', self.study.uuid),
            'assay': make_uri('assay', self.assay.uuid),
            'solr_query': self.query,
        })
        self.assertEqual(NodeSet.objects.count(), 0)
        nodeset_uri = make_uri('nodeset')
        response = self.client.post(nodeset_uri, nodeset_data, content_type='application/json')
        self.assertHttpCreated(response)
        self.assertEqual(NodeSet.objects.count(), 1)

    def test_update_nodeset(self):
        '''Test updating a NodeSet with new data.

        '''
        nodeset = NodeSet.objects.create(name='nodeset', study=self.study, assay=self.assay)
        new_nodeset_data = simplejson.dumps({
            'name': 'nodeset2',
            'study': make_uri('study', self.study.uuid),
            'assay': make_uri('assay', self.assay.uuid),
        })
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset_uri = make_uri('nodeset', nodeset.uuid)
        response = self.client.put(nodeset_uri, new_nodeset_data, content_type='application/json')
        self.assertHttpAccepted(response)
        self.assertEqual(NodeSet.objects.count(), 1)
        nodeset = NodeSet.objects.get(uuid=nodeset.uuid)
        self.assertEqual(nodeset.name, 'nodeset2')


#TODO: test authentication when it's enabled
