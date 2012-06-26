'''
Created on May 29, 2012

@author: nils
'''
from data_set_manager.models import Node, Attribute
from django.utils.datetime_safe import datetime
from django.db.models import Q
    

def uniquify(seq):
    set = {}
    map(set.__setitem__, seq, [])
    return set.keys()    
                
                

# for an assay declaration (= assay file in a study)
# this method is based on the assumption that all paths through the experiment graph follow the same sequence of node types
def get_node_attributes(study_uuid, assay_uuid, node=None, node_type=None):
    '''
    node_type indicates the node type for which the available attributes should be determined. node_type should be in
    Node.ASSAYS | Node.FILES | Node.SOURCE | Node.SAMPLE | Node.EXTRACT | Node.LABELED_EXTRACT
    
    If node is not None, node_type will be ignored and the method will return the attributes for this node (and its node type).  
    '''
    
    
    if node is None:
        try:
            if assay_uuid is None:
                node = Node.objects.filter( Q( study__uuid=study_uuid, assay__uuid__isnull=True ), type=node_type)[0]
            else:                
                node = Node.objects.filter( Q( study__uuid=study_uuid, assay__uuid__isnull=True ) | Q( study__uuid=study_uuid, assay__uuid=assay_uuid ), type=node_type)[0]            
        except:
            return None
    
    # assumption: we now have a node
    return _get_node_attributes_recursion( node )
    
    
def _get_node_attributes_recursion( node ):
    attributes = []
    
    for attribute in node.attribute_set.all():
        attributes.append( { "type": attribute.type, "subtype": attribute.subtype } )
    
    try:
        parent = node.parents.all()[0]
        attributes.extend( _get_node_attributes_recursion( parent ) )
    except:
        pass
    
    return attributes
    
    
# for an assay declaration (= assay file in a study)
# this method is based on the assumption that all paths through the experiment graph follow the same sequence of node types
def get_node_types(study_uuid, assay_uuid=None, files_only=False, filter_set=None):
    '''
    filter_set is a set of node types, e.g. [ "Sample Name", "Source Name" ]. Sets defined in Node (e.g. Node.ASSAYS, Node.FILES) can 
    be applied. The method will only return node types included in filter_set unless filter_set is "None".
    
    The order of the returned list is the order of the node types in the experiment graph.
    '''
    try:
        # 1. find a node without children
        nodes = Node.objects.filter( study__uuid=study_uuid, assay__uuid=assay_uuid )
        
        for n in nodes:
            if n.children_set.count() == 0:
                node = n
                break                 
        
        # 2. recursively follow until reaching a source node
        sequence = _get_node_types_recursion(node)
        sequence.reverse()
        if filter_set is None:  
            return sequence
        else:
            return [ item for item in sequence if item in filter_set ]
    except:
        return None


def _get_node_types_recursion( node ):
    sequence = [ node.type ]
    
    # 1. get the first child (the assumption is that all node type sequences are the same)
    try:
        parent = node.parents.all()[0]
        sequence.extend( _get_node_types_recursion( parent ) )
    except:
        pass
    
    return sequence


def _get_parent_attributes(result,node):
    attributes = []
    
    if len( result[node]["parents"] ) == 0:
        return result[node]["attributes"]
    
    for parent in result[node]["parents"]:
        attributes.extend( _get_parent_attributes( result, parent ) ) 
    
    attributes.extend( result[node]["attributes"] )
    return attributes


def _get_assay_name(result,node):
    if result[node]["type"] in Node.ASSAYS:
        return result[node]["name"]
    
    for parent in result[node]["parents"]:
        return _get_assay_name( result, parent ) 
    
    return None


def _retrieve_nodes( node_type, study_uuid, assay_uuid=None, ontology_attribute_fields=False ):
            
    #print( "Node Type Sequence: " + " -> ".join( get_node_types(study_id, assay_id) ) )
    #print( "File Type Sequence: " + " -> ".join( get_node_types( study_id, assay_id, filter_set=Node.FILES) ) )
    #print( "Assay Type Sequence: " + " -> ".join( get_node_types(study_id, assay_id, filter_set=Node.ASSAYS) ) )

    #attr = get_node_attributes(study_id=study_id, assay_id=assay_id, node_type=Node.RAW_DATA_FILE )
    #print( "Attributes:\n" + "\n".join( [ str( item["id"] ) + " -- " + str( item["node_type"] ) + " -- " + item["type"] + " (" + item["subtype"] + ")" if item["subtype"] is not None else item["type"] for item in attr ] ) )

    node_fields = [ "id", "uuid", "file", "type", "name", "parents", "attribute" ]
    
    # query nodes (both from assay and from study only)
    if assay_uuid is None:
        node_list = Node.objects.filter( Q( study__uuid=study_uuid, assay__uuid__isnull=True ) ).prefetch_related( "attribute_set" ).order_by( "id" ).values( *node_fields )
    else:
        node_list = Node.objects.filter( Q( study__uuid=study_uuid, assay__uuid__isnull=True ) | Q( study__uuid=study_uuid, assay__uuid=assay_uuid ) ).prefetch_related( "attribute_set" ).order_by( "id" ).values( *node_fields )
        
            
    if ontology_attribute_fields:
        attribute_fields = Attribute.ALL_FIELDS
    else:
        attribute_fields = Attribute.NON_ONTOLOGY_FIELDS
         
    attribute_list = Attribute.objects.filter().order_by( "id" ).values_list( *attribute_fields )

    attributes = {}
    current_id = None
    current_node = None
    nodes = {}
    
    
    for attribute in attribute_list:
        attributes[attribute[0]] = attribute
        
        
    for node in node_list:
        if current_id is None or current_id != node["id"]:
            
            # save current node
            if current_node is not None:
                current_node["parents"] = uniquify( current_node["parents"] )                
                nodes[current_id] = current_node
            
            # new node, start merging
            current_id = node["id"]
            current_node = { "id": node["id"], "uuid": node["uuid"], "attributes": [], "parents": [], "name": node["name"], "type": node["type"], "file": node["file"] }
            
        if node["parents"] is not None:
            current_node["parents"].append( node["parents"] )    

        if node["attribute"] is not None:
            try:
                current_node["attributes"].append( attributes[node["attribute"]] )
            except:
                pass

    # save last node
    if current_node is not None:
        current_node["parents"] = uniquify( current_node["parents"] )                
        nodes[current_id] = current_node
    
    return nodes


def get_nodes( node_type, study_uuid, assay_uuid=None, ontology_attribute_fields=False ):
    
    nodes = _retrieve_nodes( node_type, study_uuid, assay_uuid, ontology_attribute_fields )
                    
    results = {}
    
    attribute_count = 0
    
    for key in nodes:
        #if nodes[key]["type"] == Node.ARRAY_DATA_FILE or nodes[key]["type"] == Node.SOURCE or nodes[key]["type"] == Node.SAMPLE:
        if nodes[key]["type"] == node_type:
            results[nodes[key]["uuid"]] = nodes[key].copy()
            results[nodes[key]["uuid"]]["attributes"] = _get_parent_attributes( nodes, key )
            attribute_count += len(results[nodes[key]["uuid"]]["attributes"])

    print( "Nodes: " + str( len(results) ) + "   attributes: " + str( attribute_count ) )
    
    return results


def get_matrix( node_type, study_uuid, assay_uuid=None, ontology_attribute_fields=False ):
    
    nodes = _retrieve_nodes( node_type, study_uuid, assay_uuid, ontology_attribute_fields )
                    
    results = {}
    results["meta"] = {}
    results["data"] = {}
    
    results["meta"]["study"] = study_uuid;
    results["meta"]["assay"] = assay_uuid;
    results["meta"]["attributes"] = None;
    results["meta"]["type"] = node_type;
    
    attribute_count = 0
    
    for key in nodes:
        if nodes[key]["type"] == node_type:
            
            # copy a subset of the node model attributes
            results["data"][nodes[key]["uuid"]] = { k: nodes[key].copy()[k] for k in ( "name", "file" ) }

            # get the name of the nearest assay node predecessor
            results["data"][nodes[key]["uuid"]]["assay"] = _get_assay_name( nodes, key )

            
            # initialize attribute list
            results["data"][nodes[key]["uuid"]]["attributes"] = []            

            # save attributes (attribute[1], etc. are based on Attribute.ALL_FIELDS 
            for attribute in _get_parent_attributes( nodes, key ):
                results["data"][nodes[key]["uuid"]]["attributes"].append( attribute[3] )
                if attribute[4] is not None:
                    results["data"][nodes[key]["uuid"]]["attributes"][-1] += " " + attribute[4]
                    
            # store attribute labels in meta section (only for the first node -> for all further nodes the assumption is that they have the same attribute list)
            if results["meta"]["attributes"] is None:
                results["meta"]["attributes"] = []
                for attribute in _get_parent_attributes( nodes, key ):
                    results["meta"]["attributes"].append( { "type": attribute[1], "subtype": attribute[2] } )                                
            
            attribute_count += len(results["data"][nodes[key]["uuid"]]["attributes"])

    #print( "Nodes: " + str( len(results["data"]) ) + "   attributes: " + str( attribute_count ) )
    
    return results
