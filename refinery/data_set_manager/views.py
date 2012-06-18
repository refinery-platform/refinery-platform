'''
Created on May 11, 2012

@author: nils
'''

from data_set_manager.utils import *
from django.http import HttpResponse
from django.utils import simplejson


def index(request):
    return HttpResponse( simplejson.dumps( get_nodes(study_id=2, assay_id=3), indent=2 ), mimetype='application/json' )

