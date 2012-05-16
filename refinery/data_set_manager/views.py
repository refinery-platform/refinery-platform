'''
Created on May 11, 2012

@author: nils
'''
from data_set_manager.models import Node, Attribute
from django.db import connection
from django.http import HttpResponse
from django.utils import simplejson
from django.utils.datetime_safe import datetime

# Create your views here.

def get_parent_attributes( result, node ):
    attributes = []
    
    if len( result[node]["parents"] ) == 0:
        return result[node]["attributes"]
    
    for parent in result[node]["parents"]:
        attributes.extend( get_parent_attributes( result, parent ) ) 
    
    attributes.extend( result[node]["attributes"] )
    return attributes
    
    

def uniquify( seq ):
    set = {}
    map(set.__setitem__, seq, [])
    return set.keys()    
                
                

# for an assay declaration (= assay file in a study)
# this method is based on the assumption that all paths through the experiment graph follow the same sequence of node types
def get_node_attributes( node=None, node_type=None ):
    '''
    node_type indicates the node type for which the available attributes should be determined. node_type should be in
    Node.ASSAYS | Node.FILES | Node.SOURCE | Node.SAMPLE | Node.EXTRACT | Node.LABELED_EXTRACT
    
    If node is not None node_type will be ignored and the method will return the attributes for this node (and its node type).  
    '''
    if node is None:
        try:
            node = Node.objects.filter( type=node_type )[0]
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
def get_node_types( filter_set=None ):
    '''
    filter_set is a set of node types, e.g. [ "Sample Name", "Source Name" ]. Sets defined in Node (e.g. Node.ASSAYS, Node.FILES) can 
    be applied. The method will only return node types included in filter_set unless filter_set is "None".
    
    The order of the returned list is the order of the node types in the experiment graph.
    '''
    try:
        # 1. pick a source node
        node = Node.objects.filter( type=Node.SOURCE )[0]    
        
        # 2. recursively follow until reaching a leaf
        sequence = _get_node_types_recursion(node)
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
        child = node.children.all()[0]
        sequence.extend( _get_node_types_recursion( child ) )
    except:
        pass
    
    return sequence


def index(request):
    
    print( "Node Type Sequence: " + " -> ".join( get_node_types() ) )
    file_types = get_node_types(filter_set=Node.FILES)
    print( "File Type Sequence: " + " -> ".join( get_node_types(filter_set=Node.FILES) ) )
    print( "Assay Type Sequence: " + " -> ".join( get_node_types(filter_set=Node.ASSAYS) ) )

    attributes = get_node_attributes( node_type=Node.SOURCE )
    print( "Attributes: " + ", ".join( [ item["type"] + " (" + item["subtype"] + ")" if item["subtype"] is not None else item["type"] for item in attributes ] ) )
        

    start = datetime.now()
    
    short_node_fields = [ "id", "uuid", "type", "name", "parents", "attribute" ]
    
    full_attribute_fields = ["id", "type", "subtype", "value", "value_unit", "value_accession", "value_source", "node"] 
    short_attribute_fields = ["id", "type", "subtype", "value", "value_unit"] 

    
    node_list = Node.objects.prefetch_related( "attribute_set" ).order_by( "id" ).values( *short_node_fields )
    #attribute_list = Attribute.objects.all().order_by( "id" ).values( "id", "type", "subtype", "value" )
    attribute_list = Attribute.objects.filter().order_by( "id" ).values_list( *short_attribute_fields )

    attributes = {}
    current_id = None
    current_node = None
    nodes = {}
    
    for attribute in attribute_list:
        attributes[attribute[0]] = attribute
        
    #inter = datetime.now()
    #print( "Intermediate: " +  str( inter - start ) )

        
    for node in node_list:
        if current_id is None or current_id != node["id"]:
            
            # save current node
            if current_node is not None:
                current_node["parents"] = uniquify( current_node["parents"] )
                nodes[current_id] = current_node
            
            # new node, start merging
            current_id = node["id"]
            current_node = { "id": node["id"], "uuid": node["uuid"], "attributes": [], "parents": [], "name": node["name"], "type": node["type"] }
            
        if node["parents"] is not None:
            current_node["parents"].append( node["parents"] )    

        if node["attribute"] is not None:
            try:
                current_node["attributes"].append( attributes[node["attribute"]] )
            except:
                pass

                
    results = {}
    
    attribute_count = 0
    
    for key in nodes:
        #if nodes[key]["type"] == Node.ARRAY_DATA_FILE or nodes[key]["type"] == Node.SOURCE or nodes[key]["type"] == Node.SAMPLE:
        if nodes[key]["type"] in Node.ASSAYS:
            results[nodes[key]["uuid"]] = nodes[key].copy()
            results[nodes[key]["uuid"]]["attributes"] = get_parent_attributes( nodes, key )
            #file_annotation[nodes[key]["uuid"]] = get_parent_attributes( nodes, key )
            attribute_count += len(results[nodes[key]["uuid"]]["attributes"])

    print( "Nodes: " + str( len(results) ) + "   attributes: " + str( attribute_count ) )
    

    end = datetime.now()
    print( "Total: " +  str( end - start ) )
    

    #return HttpResponse( "<html><body>" + simplejson.dumps( file_annotation ) + "</body></html>" )   
    return HttpResponse( simplejson.dumps( results, indent=4 ), mimetype='application/json' )   
