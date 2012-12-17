"""

These will pass when you run "manage.py test".

"""


from django.utils import unittest
import data_set_manager
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset


class NodeSetTest(unittest.TestCase):
    '''Test all NodeSet operations

    '''
    #TODO: adding None object, same object, incorrect type of object
    def setUp(self):
        investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=investigation)
        self.assay = data_set_manager.models.Assay.objects.create(study=self.study)
        self.name = 'nodeset1'

    def test_create_minimal_nodeset(self):
        '''Test adding a new NodeSet with required fields only

        '''
        ns = create_nodeset(name=self.name, study=self.study, assay=self.assay)
        self.assertIsInstance(ns, NodeSet)
        self.assertItemsEqual(ns.nodes.all(), [])
        self.assertEqual(ns.name, self.name)

    def test_create_full_nodeset(self):
        '''Test adding a new NodeSet with a list of Node instances and summary

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        summary = 'sample summary'
        ns = create_nodeset(name=self.name, summary=summary, nodes=[n1, n2], study=self.study, assay=self.assay)
        self.assertIsInstance(ns, NodeSet)
        self.assertItemsEqual(ns.nodes.all(), [n1, n2])
        self.assertEqual(ns.name, self.name)
        self.assertEqual(ns.summary, summary)

    def test_create_nodeset_with_empty_node_list(self):
        '''Test adding a new NodeSet with an empty list of Node instances

        '''
        ns = create_nodeset(name=self.name, nodes=[], study=self.study, assay=self.assay)
        self.assertIsInstance(ns, NodeSet)
        self.assertItemsEqual(ns.nodes.all(), [])
        self.assertEqual(ns.name, self.name)

    def test_get_nodeset_with_valid_uuid(self):
        '''Test retrieving an existing NodeSet instance

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        self.assertEqual(get_nodeset(ns.uuid), ns)

    def test_get_nodeset_with_invalid_uuid(self):
        '''Test retrieving a NodeSet instance that doesn't exist

        '''
        self.assertRaises(NodeSet.DoesNotExist, get_nodeset, uuid='Invalid UUID')

    def test_delete_nodeset_with_valid_uuid(self):
        '''Test deleting an existing NodeSet instance

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        delete_nodeset(ns.uuid)
        self.assertRaises(NodeSet.DoesNotExist, NodeSet.objects.get, uuid=ns.uuid)

    def test_delete_nodeset_with_invalid_uuid(self):
        '''Test deleting a NodeSet instance that doesn't exist

        '''
        self.assertRaises(NodeSet.DoesNotExist, delete_nodeset, uuid='Invalid UUID')
