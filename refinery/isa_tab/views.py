# Create your views here.
from isa_tab.models import Investigation
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.core.urlresolvers import reverse
from isa_tab.tasks import call_download
import simplejson


def index(request):
    investigation_list = Investigation.objects.all()
    return render_to_response('isa_tab/index.html', 
                              {'investigation_list': investigation_list})

def detail(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    return render_to_response('isa_tab/detail.html', {'investigation': i},
                              context_instance=RequestContext(request))
    
def results(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    return render_to_response('isa_tab/results.html', {'investigation': i})


def download(request, accession):
    raw_choice = "off"
    processed_choice = "off"
    
    try:
        raw_choice = request.POST['raw']
    except KeyError:
        pass
    
    try:
        processed_choice = request.POST['processed']
    except KeyError:
        pass
    
    file_types_to_download = 0
    if(raw_choice == 'on'):
        file_types_to_download = 1
    if(processed_choice == 'on'):
        if(file_types_to_download): #both types being downloaded
            file_types_to_download = 2
    
    call_download.delay(accession, file_types_to_download)
    return HttpResponseRedirect(reverse('isa_tab.views.results', args=(accession,)))