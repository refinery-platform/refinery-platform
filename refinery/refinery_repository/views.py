# Create your views here.
from refinery_repository.models import Investigation
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.core.urlresolvers import reverse
from refinery_repository.tasks import call_download, download_ftp_file
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
import simplejson, re
from django.conf import settings

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
    task_progress = request.session['refinery_repository_task_ids']
    #task_ids_str = ids.get()
    #task_progress = eval(ids)
    """task_progress = list()
    for task_id in task_ids:
        result = AsyncResult(task_id)
        state, retval = result.state, result.result
        response_data = dict(id=task_id, status=state, result=retval)
        if state in states.EXCEPTION_STATES:
            traceback = result.traceback
            response_data.update({"result": safe_repr(retval),
                              "exc": get_full_cls_name(retval.__class__),
                              "traceback": traceback})
                              
        task_progress.append(result.state)
        if(result.state == "PROGRESS"):
            task_progress.append(result.result)"""
    
    return render_to_response('refinery_repository/results.html', 
                              {
                                'investigation': i, 
                                'task_progress': task_progress
                                })


def download(request, accession):
    task_ids = list()
    for i in request.POST:
        if re.search('^ftp', i):
            id = download_ftp_file.delay(i, settings.DOWNLOAD_BASE_DIR, accession)
            task_ids.append(id)
    request.session['refinery_repository_task_ids'] = task_ids
    return HttpResponseRedirect(reverse('refinery_repository.views.results', args=(accession,)))