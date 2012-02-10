# Create your views here.
from isa_tab.models import Investigation
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.core.urlresolvers import reverse
from isa_tab.tasks import call_download
import simplejson
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger


def index(request):
    investigation_list = Investigation.objects.all()
    paginator = Paginator(investigation_list, 5) # Show 5 investigations per page

    page = request.GET.get('page', 1)
    try:
        investigations = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        investigations = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        investigations = paginator.page(paginator.num_pages)
    return render_to_response('isa_tab/index.html', 
                              {'investigations': investigations})

def detail(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    return render_to_response('isa_tab/detail.html', {'investigation_list': i},
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