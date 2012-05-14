'''
Created on May 11, 2012

@author: nils
'''
from data_set_manager.models import Node, Attribute
from django.http import HttpResponse
from django.utils import simplejson
from django.utils.datetime_safe import datetime
from sets import Set

# Create your views here.

def get_parent_attributes( result, node ):
    attributes = []
    
    if len( result[node]["parents"] ) == 0:
        return result[node]["attributes"]
    
    for parent in result[node]["parents"]:
        attributes.extend( get_parent_attributes( result, parent ) ) 
    
    return attributes
    
    

def uniquify( seq ):
    set = {}
    map(set.__setitem__, seq, [])
    return set.keys()    


def sqlindex(request):
        
    start = datetime.now()
    
    node_list = Node.objects.prefetch_related( "attribute_set" ).order_by( "id" ).values( "id", "type", "name", "parents", "attribute" )
    attribute_list = Attribute.objects.all().order_by( "id" ).values( "id", "type", "subtype", "value" )

    attributes = {}
    current_id = None
    current_node = None
    nodes = {}
    
    for attribute in attribute_list:
        attributes[attribute["id"]] = attribute
        
    for node in node_list:
        
        if current_id is None or current_id != node["id"]:
            
            # save current node
            if current_node is not None:
                current_node["parents"] = uniquify( current_node["parents"] )
                #current_node["attributes"] = uniquify( current_node["attributes"] )
                nodes[current_id] = current_node
            
            # new node, start merging
            current_id = node["id"]
            current_node = { "id": node["id"], "attributes": [], "parents": [], "name": node["name"], "type": node["type"] }
            
        if node["parents"] is not None:
            current_node["parents"].append( node["parents"] )    
    
        if node["attribute"] is not None:
            current_node["attributes"].append( attributes[node["attribute"]] )
                
    inter = datetime.now()
    print( "Intermediate: " +  str( inter - start ) )

    file_annotation = {}
    
    for key in nodes:
        if nodes[key]["type"] == Node.RAW_DATA_FILE: # Node.ARRAY_DATA_FILE:
            file_annotation[nodes[key]["name"]] = get_parent_attributes( nodes, key )
                            
    end = datetime.now()
    print( "Total: " +  str( end - start ) )
    

    #return HttpResponse( "<html><body>" + simplejson.dumps( file_annotation, sort_keys=False, indent=4 ) + "</body></html>" )   
    return HttpResponse( simplejson.dumps( file_annotation, sort_keys=False, indent=4 ), mimetype='application/json' )   



def index(request):
        
    start = datetime.now()
    
    node_list = Node.objects.prefetch_related( "attribute_set" ).order_by( "id" ).values( "id", "type", "name", "parents", "attribute" )
    attribute_list = Attribute.objects.all().order_by( "id" ).values( "id", "type", "subtype", "value" )

    attributes = {}
    current_id = None
    current_node = None
    nodes = {}
    
    for attribute in attribute_list:
        attributes[attribute["id"]] = attribute
        
    for node in node_list:
        
        if current_id is None or current_id != node["id"]:
            
            # save current node
            if current_node is not None:
                current_node["parents"] = uniquify( current_node["parents"] )
                #current_node["attributes"] = uniquify( current_node["attributes"] )
                nodes[current_id] = current_node
            
            # new node, start merging
            current_id = node["id"]
            current_node = { "id": node["id"], "attributes": [], "parents": [], "name": node["name"], "type": node["type"] }
            
        if node["parents"] is not None:
            current_node["parents"].append( node["parents"] )    
    
        if node["attribute"] is not None:
            if attributes[node["attribute"]] is not None:
                current_node["attributes"].append( attributes[node["attribute"]] )
                
    inter = datetime.now()
    print( "Intermediate: " +  str( inter - start ) )

    file_annotation = {}
    
    for key in nodes:
        if nodes[key]["type"] == Node.RAW_DATA_FILE: # Node.ARRAY_DATA_FILE:
            file_annotation[nodes[key]["name"]] = get_parent_attributes( nodes, key )
                            
    end = datetime.now()
    print( "Total: " +  str( end - start ) )
    

    #return HttpResponse( "<html><body>" + simplejson.dumps( file_annotation, sort_keys=False, indent=4 ) + "</body></html>" )   
    return HttpResponse( simplejson.dumps( file_annotation, sort_keys=False, indent=4 ), mimetype='application/json' )   
