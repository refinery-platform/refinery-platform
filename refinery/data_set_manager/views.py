'''
Created on May 11, 2012

@author: nils
'''

from data_set_manager.utils import *
from django.http import HttpResponse
from django.utils import simplejson
from haystack.query import SearchQuerySet

def index(request):
    return HttpResponse( simplejson.dumps( get_nodes(study_id=2, assay_id=2), indent=2 ), mimetype='application/json' )

def nodes(request, type, study_uuid, assay_uuid=None ):
    start = datetime.now()
    matrix = get_matrix(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type )
    end = datetime.now()
    print( "Time to retrieve node matrix: " + str(end - start))
    return HttpResponse( simplejson.dumps( matrix, indent=2 ), mimetype='application/json' )

def node_attributes(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_attributes( study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )

def node_types(request, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_types( study_uuid=study_uuid, assay_uuid=assay_uuid ), indent=2 ), mimetype='application/json' )

def node_types_files(request, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_types( study_uuid=study_uuid, assay_uuid=assay_uuid, files_only=True, filter_set=Node.FILES ), indent=2 ), mimetype='application/json' )

def node_annotate(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )
    #return HttpResponse( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), mimetype='application/json' )

# ajax function for returning typeahead queries
def search_typeahead(request):
    
    if (request.is_ajax()):
        #print "RETURNING AJAX"
        
        search_value = request.POST.getlist('search')
        
        results = SearchQuerySet().autocomplete(content_auto=search_value[0])
        #results = SearchQuerySet().auto_query(search_value[0])
        
        ret_list = []
        for res in results:
            ret_list.append(res.name)
        return HttpResponse( simplejson.dumps( ret_list, indent=2 ), mimetype='application/json' )
    
    #else:
        #print "NOT AJAX"
        #return HttpResponse("not ajax")
    