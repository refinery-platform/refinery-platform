"""

These will pass when you run "manage.py test".

"""


from django.utils import unittest
import data_set_manager
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset,\
    update_nodeset


class NodeSetTest(unittest.TestCase):
    '''Test all NodeSet operations

    '''
    def setUp(self):
        self.investigation = data_set_manager.models.Investigation.objects.create()
        self.study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
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

    def test_update_nodeset_name(self):
        '''Test updating NodeSet name

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_name = 'new nodeset name'
        update_nodeset(uuid=ns.uuid, name=new_name)
        self.assertEqual(NodeSet.objects.get(uuid=ns.uuid).name, new_name)

    def test_update_nodeset_summary(self):
        '''Test updating NodeSet summary

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_summary = 'new nodeset summary'
        update_nodeset(uuid=ns.uuid, summary=new_summary)
        self.assertEqual(NodeSet.objects.get(uuid=ns.uuid).summary, new_summary)

    def test_update_nodeset_study(self):
        '''Test updating NodeSet study

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        update_nodeset(uuid=ns.uuid, study=new_study)
        self.assertEqual(NodeSet.objects.get(uuid=ns.uuid).study, new_study)

    def test_update_nodeset_assay(self):
        '''Test updating NodeSet assay

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_assay = data_set_manager.models.Assay.objects.create(study=self.study)
        update_nodeset(uuid=ns.uuid, assay=new_assay)
        self.assertEqual(NodeSet.objects.get(uuid=ns.uuid).assay, new_assay)

    def test_update_nodeset_nodes(self):
        '''Test updating NodeSet with a new list of Node instances

        '''
        ns = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        ns.nodes.add(n1, n2)
        n3 = data_set_manager.models.Node.objects.create(study=self.study)
        n4 = data_set_manager.models.Node.objects.create(study=self.study)
        new_nodes = [n3, n4]
        update_nodeset(uuid=ns.uuid, nodes=new_nodes)
        self.assertItemsEqual(ns.nodes.all(), new_nodes)

