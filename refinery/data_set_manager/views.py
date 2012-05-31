'''
Created on May 11, 2012

@author: nils
'''

from data_set_manager.utils import *
from django.http import HttpResponse
from django.utils import simplejson


def index(request):
    return HttpResponse( simplejson.dumps( get_nodes(study_id=8, assay_id=6), indent=2 ), mimetype='application/json' )

