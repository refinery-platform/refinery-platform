"""

These will pass when you run "manage.py test".

"""


from django.utils import unittest
import data_set_manager
from core.models import NodeSet, create_nodeset, get_nodeset, delete_nodeset,\
    update_nodeset, get_nodesets


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
        nodeset = create_nodeset(name=self.name, study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertItemsEqual(nodeset.nodes.all(), [])
        self.assertEqual(nodeset.name, self.name)

    def test_create_full_nodeset(self):
        '''Test adding a new NodeSet with a list of Node instances and summary

        '''
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        summary = 'sample summary'
        nodeset = create_nodeset(name=self.name, summary=summary, nodes=[n1, n2], study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertItemsEqual(nodeset.nodes.all(), [n1, n2])
        self.assertEqual(nodeset.name, self.name)
        self.assertEqual(nodeset.summary, summary)

    def test_create_nodeset_with_empty_node_list(self):
        '''Test adding a new NodeSet with an empty list of Node instances

        '''
        nodeset = create_nodeset(name=self.name, nodes=[], study=self.study, assay=self.assay)
        self.assertIsInstance(nodeset, NodeSet)
        self.assertItemsEqual(nodeset.nodes.all(), [])
        self.assertEqual(nodeset.name, self.name)

    def test_get_nodeset_with_valid_uuid(self):
        '''Test retrieving an existing NodeSet instance

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        self.assertEqual(get_nodeset(nodeset.uuid), nodeset)

    def test_get_nodeset_with_invalid_uuid(self):
        '''Test retrieving a NodeSet instance that doesn't exist

        '''
        self.assertRaises(NodeSet.DoesNotExist, get_nodeset, uuid='Invalid UUID')

    def test_delete_nodeset_with_valid_uuid(self):
        '''Test deleting an existing NodeSet instance

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        delete_nodeset(nodeset.uuid)
        self.assertRaises(NodeSet.DoesNotExist, NodeSet.objects.get, uuid=nodeset.uuid)

    def test_delete_nodeset_with_invalid_uuid(self):
        '''Test deleting a NodeSet instance that doesn't exist

        '''
        self.assertIsNone(delete_nodeset(uuid='Invalid UUID'))

    def test_update_nodeset_name(self):
        '''Test updating NodeSet name

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_name = 'new nodeset name'
        update_nodeset(uuid=nodeset.uuid, name=new_name)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).name, new_name)

    def test_update_nodeset_summary(self):
        '''Test updating NodeSet summary

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_summary = 'new nodeset summary'
        update_nodeset(uuid=nodeset.uuid, summary=new_summary)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).summary, new_summary)

    def test_update_nodeset_study(self):
        '''Test updating NodeSet study

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_study = data_set_manager.models.Study.objects.create(investigation=self.investigation)
        update_nodeset(uuid=nodeset.uuid, study=new_study)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).study, new_study)

    def test_update_nodeset_assay(self):
        '''Test updating NodeSet assay

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        new_assay = data_set_manager.models.Assay.objects.create(study=self.study)
        update_nodeset(uuid=nodeset.uuid, assay=new_assay)
        self.assertEqual(NodeSet.objects.get(uuid=nodeset.uuid).assay, new_assay)

    def test_update_nodeset_nodes(self):
        '''Test updating NodeSet with a new list of Node instances

        '''
        nodeset = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset.nodes.add(n1, n2)
        n3 = data_set_manager.models.Node.objects.create(study=self.study)
        n4 = data_set_manager.models.Node.objects.create(study=self.study)
        new_nodes = [n3, n4]
        update_nodeset(uuid=nodeset.uuid, nodes=new_nodes)
        self.assertItemsEqual(nodeset.nodes.all(), new_nodes)

    def test_get_nodesets_with_valid_node_uuid(self):
        '''Test retrieving NodeSets for a given valid Node UUID.

        '''
        nodeset1 = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        n1 = data_set_manager.models.Node.objects.create(study=self.study)
        n2 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset1.nodes.add(n1, n2)
        nodeset2 = NodeSet.objects.create(name=self.name, study=self.study, assay=self.assay)
        n3 = data_set_manager.models.Node.objects.create(study=self.study)
        nodeset2.nodes.add(n2, n3)
        n4 = data_set_manager.models.Node.objects.create(study=self.study)
        self.assertItemsEqual(get_nodesets(n1.uuid), [nodeset1])
        self.assertItemsEqual(get_nodesets(n2.uuid), [nodeset1, nodeset2])
        self.assertItemsEqual(get_nodesets(n4.uuid), [])

    def test_get_nodesets_with_invalid_node_uuid(self):
        '''Test retrieving NodeSets using an invalid Node UUID.

        '''
        self.assertRaises(data_set_manager.models.Node.DoesNotExist, get_nodesets, uuid='Invalid UUID')

