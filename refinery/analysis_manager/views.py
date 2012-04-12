# Create your views here.

from analysis_manager.models import AnalysisStatus
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseForbidden


def index(request):
    statuses = AnalysisStatus.objects.all()
    
    return render_to_response( 'analysis_manager/index.html', { 'statuses': statuses }, context_instance=RequestContext( request ) )
