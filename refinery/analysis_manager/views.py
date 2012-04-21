# Create your views here.

from analysis_manager.models import AnalysisStatus
from core.models import Analysis
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseForbidden
from django.utils import simplejson
#from django.core import serializers



def index(request):
    statuses = AnalysisStatus.objects.all()
    
    return render_to_response( 'analysis_manager/index.html', { 'statuses': statuses }, context_instance=RequestContext( request ) )

def analysis(request, uuid):
    print "called analysis_status"
    #import pdb; pdb.set_trace()
    
    analysis = Analysis.objects.get(uuid=uuid)
    statuses = AnalysisStatus.objects.get(analysis_uuid=uuid)
    
    if request.is_ajax():
        print "is ajax"
        #answers.values_list('id', flat=True)
        ret_json = {}
        ret_json['preprocessing'] = statuses.preprocessing_status()
        ret_json['execution'] = statuses.execution_status()
        ret_json['postprocessing'] = statuses.postprocessing_status()
        
        #json_serializer = serializers.get_serializer("json")()
        return HttpResponse(simplejson.dumps(ret_json), mimetype='application/javascript')

    else:
        return render_to_response( 'analysis_manager/analysis_status.html', { 'uuid':uuid, 'statuses': statuses }, context_instance=RequestContext( request ) )
