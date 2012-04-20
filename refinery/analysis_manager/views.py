# Create your views here.

from analysis_manager.models import AnalysisStatus
from core.models import Analysis
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseForbidden


def index(request):
    statuses = AnalysisStatus.objects.all()
    
    return render_to_response( 'analysis_manager/index.html', { 'statuses': statuses }, context_instance=RequestContext( request ) )

def analysis(request, uuid):
    print "called analysis_status"
    #import pdb; pdb.set_trace()

    analysis = Analysis.objects.get(uuid=uuid)
    statuses = AnalysisStatus.objects.get(analysis_uuid=uuid)
    
    #eturn render_to_response('index.html', {'chan_prog_list': chan_prog_list})
    return render_to_response( 'analysis_manager/analysis_status.html', { 'uuid':uuid, 'statuses': statuses }, context_instance=RequestContext( request ) )
