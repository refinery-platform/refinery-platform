"""

These will pass when you run "manage.py test".

"""


from django.utils import unittest
import data_set_manager
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset


class NodeSetTest(unittest.TestCase):
    '''Test all NodeSet operations

    '''
    #TODO: adding None object, same object, incorrect type of object, empty list
    def setUp(self):
        investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=investigation)

    def test_create_empty_nodeset(self):
        '''Test adding a new NodeSet

        '''
        ns = create_nodeset(name='nodeset1')
        self.assertIsInstance(ns, NodeSet)
        #self.assertEqual(ns.nodes.all(), [])

    def test_create_nodeset_with_node_list(self):
        '''Test adding a new NodeSet with a list of Node instances

        '''
        n = data_set_manager.models.Node.objects.create(study=self.study)
        ns = create_nodeset(name='nodeset1', nodes=[n])
        self.assertIsInstance(ns, NodeSet)
        self.assertEqual(ns.nodes.all()[0], n)

    def test_get_nodeset_with_valid_uuid(self):
        ns = NodeSet.objects.create(name='nodeset1')
        self.assertEqual(get_nodeset(ns.uuid), ns)

    def test_delete_existing_nodeset(self):
        ns = NodeSet.objects.create(name='nodeset1')
        delete_nodeset(ns.uuid)
        self.assertRaises(NodeSet.DoesNotExist, NodeSet.objects.get, uuid=ns.uuid)
