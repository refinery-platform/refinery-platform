'''
Created on May 11, 2012

@author: nils
'''

from data_set_manager.utils import *
from django.http import HttpResponse
from django.utils import simplejson


def index(request):
    return HttpResponse( simplejson.dumps( get_nodes(study_id=2, assay_id=2), indent=2 ), mimetype='application/json' )

def nodes(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_matrix(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )

def node_attributes(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_attributes( study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )

def node_types(request, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_types( study_uuid=study_uuid, assay_uuid=assay_uuid ), indent=2 ), mimetype='application/json' )

def node_types_files(request, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_types( study_uuid=study_uuid, assay_uuid=assay_uuid, files_only=True, filter_set=Node.FILES ), indent=2 ), mimetype='application/json' )

def node_annotate(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )
    #return HttpResponse( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), mimetype='application/json' )
