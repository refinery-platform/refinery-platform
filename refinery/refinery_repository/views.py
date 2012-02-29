# Create your views here.
from refinery_repository.models import Investigation
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.core.urlresolvers import reverse
from refinery_repository.tasks import call_download
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
import simplejson

from celery import states
#from celery.registry import tasks
from celery.result import AsyncResult


"""
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
    return render_to_response('refinery_repository/index.html', 
                              {'investigations': investigations})
"""    


def detail(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    return render_to_response('refinery_repository/detail.html', {'investigation': i},
                              context_instance=RequestContext(request))
    
def results(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    """Returns task status and result in JSON format."""
    ids = request.session['refinery_repository_task_ids']
    task_ids_str = ids.get()
    task_ids = eval(task_ids_str)
    task_progress = list()
    for task_id in task_ids:
        result = AsyncResult(task_id)
        """state, retval = result.state, result.result
        response_data = dict(id=task_id, status=state, result=retval)
        if state in states.EXCEPTION_STATES:
            traceback = result.traceback
            response_data.update({"result": safe_repr(retval),
                              "exc": get_full_cls_name(retval.__class__),
                              "traceback": traceback})"""
                              
        task_progress.append(result.state)
        if(result.state == "PROGRESS"):
            task_progress.append(result.result)
    
    return render_to_response('refinery_repository/results.html', 
                              {
                                'investigation': i, 
                                'task_progress': task_progress
                                })


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
    
    task_ids = call_download.delay(accession, file_types_to_download)
    request.session['refinery_repository_task_ids'] = task_ids
    return HttpResponseRedirect(reverse('refinery_repository.views.results', args=(accession,)))