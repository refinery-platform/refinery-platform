# Create your views here.
from refinery_repository.models import Investigation
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.core.urlresolvers import reverse
from refinery_repository.tasks import call_download, download_ftp_file
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.conf import settings
from celery.task.control import revoke
from celery import states
from celery.result import AsyncResult
import simplejson, re

def dictfetchall(cursor):
    "Returns all rows from a cursor as a dict"
    desc = cursor.description
    return [
        dict(zip([col[0] for col in desc], row))
        for row in cursor.fetchall()
    ]

def get_available_files(request):
    """
    Returns all available files to use in workflows
    """
    from django.db import connection
    
    cursor = connection.cursor()
    cursor.execute(""" SELECT a.investigation_id, a.assay_name, o.species, ca.chip_antibody, ab.antibody, t.tissue, g.genotype, r.raw_data_file FROM
(SELECT id, sample_name, assay_name, investigation_id, study_id from refinery_repository_assay) a
LEFT OUTER JOIN
(SELECT value as species, type_id, study_id from refinery_repository_characteristic where type_id = 'ORGANISM') o
ON (a.study_id = o.study_id)
LEFT OUTER JOIN 
(SELECT assay_id, raw_data_file, data_transformation_name from refinery_repository_assay_raw_data a JOIN refinery_repository_rawdata b ON a.rawdata_id = b.id) r ON a.id = r.assay_id
LEFT OUTER JOIN
(SELECT value as chip_antibody, type_id, assay_id from refinery_repository_factorvalue where type_id = 'CHIP_ANTIBODY') ca ON a.id = ca.assay_id
LEFT OUTER JOIN
(SELECT value as antibody, type_id, assay_id from refinery_repository_factorvalue where type_id = 'ANTIBODY') as ab ON a.id = ab.assay_id
LEFT OUTER JOIN
(SELECT value as tissue, type_id, assay_id from refinery_repository_factorvalue where type_id = 'TISSUE') as t ON a.id = t.assay_id
LEFT OUTER JOIN
(SELECT value as genotype, type_id, assay_id from refinery_repository_factorvalue where type_id = 'GENOTYPE') as g ON a.id = g.assay_id""")
    results = cursor.fetchall() 
    #results = dictfetchall(cursor)
    
    #print ("results")
    #print results
    #print len(results)
    paginator = Paginator(results, 10) # Show 5 investigations per page

    page = request.GET.get('page', 1)
    try:
        sample_pages = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        sample_pages = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        sample_pages = paginator.page(paginator.num_pages)
        
    #return render_to_response('refinery_repository/index.html', {'investigations': investigations})
    return render_to_response('refinery_repository/samples.html', {'results': sample_pages}, context_instance=RequestContext(request)) 


def detail(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    return render_to_response('refinery_repository/detail.html', {'investigation': i},
                              context_instance=RequestContext(request))
    
def cancelled(request):
    task_ids = request.session['refinery_repository_task_ids']
    for id in task_ids:
        revoke(id, terminate=True)
    return render_to_response('refinery_repository/cancelled.html',
                              context_instance=RequestContext(request))
    
def results(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    """Returns task status and result in JSON format."""
    task_ids = request.session['refinery_repository_task_ids']
    
    task_progress = list()
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
            task_progress.append(result.result)
    
    return render_to_response('refinery_repository/results.html', 
                              {
                                'investigation': i, 
                                'task_progress': task_progress
                                },
                              context_instance=RequestContext(request))


def download(request, accession):
    task_ids = list()
    for i in request.POST:
        if re.search('\.zip$', i):
            async_results = call_download(i)
            for ar in async_results:
                task_ids.append(ar.task_id)
        elif re.search('\.gz$', i):
            async_result = download_ftp_file.delay(i, settings.DOWNLOAD_BASE_DIR, accession)
            task_ids.append(async_result.task_id)
    request.session['refinery_repository_task_ids'] = task_ids
    return HttpResponseRedirect(reverse('refinery_repository.views.results', args=(accession,)))


""" Richard's views """
def get_available_files(request):
    """
    Returns all available files to use in workflows
    """
    from django.db import connection
    
    cursor = connection.cursor()
    
    cursor.execute(""" SELECT distinct a.investigation_id, a.assay_name, o.species, d.description, ca.chip_antibody, ab.antibody, t.tissue, g.genotype, r.file, r.raw_data_file FROM
(SELECT id, sample_name, assay_name, investigation_id, study_id from refinery_repository_assay) a
LEFT OUTER JOIN
(SELECT value as species, study_id from refinery_repository_studybracketedfield where sub_type_id ='ORGANISM') o
ON (a.study_id = o.study_id)
LEFT OUTER JOIN
(SELECT value as description, study_id from refinery_repository_studybracketedfield where sub_type_id = 'SAMPLE_DESCRIPTION') d
ON (a.study_id = d.study_id)
LEFT OUTER JOIN 
(SELECT assay_id, raw_data_file, data_transformation_name as file from refinery_repository_assay_raw_data a JOIN refinery_repository_rawdata b ON a.rawdata_id = b.id) r ON a.id = r.assay_id
LEFT OUTER JOIN
(SELECT value as chip_antibody, assay_id from refinery_repository_assaybracketedfield where sub_type_id = 'CHIP_ANTIBODY') ca ON a.id = ca.assay_id
LEFT OUTER JOIN
(SELECT value as antibody, assay_id from refinery_repository_assaybracketedfield where sub_type_id = 'ANTIBODY') as ab ON a.id = ab.assay_id
LEFT OUTER JOIN
(SELECT value as tissue, assay_id from refinery_repository_assaybracketedfield where sub_type_id = 'TISSUE') as t ON a.id = t.assay_id
LEFT OUTER JOIN
(SELECT value as genotype, assay_id from refinery_repository_assaybracketedfield where sub_type_id = 'GENOTYPE') as g ON a.id = g.assay_id order by a.investigation_id""")


    
    #import pdb; pdb.set_trace()
    
    #field_names = getColumnNamesDict(cursor)
    field_order = getColumnNames(cursor)
    #results = cursor.fetchall() 
    results = dictfetchall(cursor)
    
    #print "results"
    #print results
    #print "field_names"
    #print field_names;
    print "field_order"
    print field_order

    paginator = Paginator(results, 25) # Show 5 investigations per page

    page = request.GET.get('page', 1)
    try:
        sample_pages = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        sample_pages = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        sample_pages = paginator.page(paginator.num_pages)
        
    #return render_to_response('refinery_repository/index.html', {'investigations': investigations})
    #return render_to_response('refinery_repository/samples.html', {'fields':field_names, 'order':field_order, 'results': sample_pages}, context_instance=RequestContext(request)) 
    return render_to_response('refinery_repository/samples.html', {'order':field_order, 'results': sample_pages}, context_instance=RequestContext(request)) 

def results_selected(request):
    """Returns task status and result in JSON format."""
    task_ids = request.session['refinery_repository_task_ids']
    
    print "task_ids"
    print task_ids;
    
    task_progress = list()
    for task_id in task_ids:
        result = AsyncResult(task_id)
        state, retval = result.state, result.result
        response_data = dict(id=task_id, status=state, result=retval)
        #if state in states.EXCEPTION_STATES:
        #    traceback = result.traceback
        #    response_data.update({"result": safe_repr(retval),
        #                      "exc": get_full_cls_name(retval.__class__),
        #                      "traceback": traceback})
                              
        #task_progress.append(result.state)
        dictionary = dict()
        if(result.state == "PROGRESS"):    
            dictionary = result.result
        
        dictionary['task_id'] = task_id
        dictionary['state'] = state
        task_progress.append(dictionary)
        print "results"
        print result    
        print "dict"
        print dictionary
        
        
    if (request.is_ajax()):
        print "RETURNING AJAX"
        return HttpResponse(simplejson.dumps({'task_progress': task_progress},
            ensure_ascii=False), mimetype='application/javascript')
    else:
        print "NOT AJAX"
        #return render_to_response('refinery_repository/results_download.html', 
        return render_to_response('refinery_repository/results.html', 
                              {
                                'task_progress': task_progress
                                }, context_instance=RequestContext(request))

""" 
Function for dealing w/ selected samples to download and input into workflow
"""

def download_selected_samples(request):
    task_ids = list()
    
    #values = request.POST.getlist(u'selected_sample')
    #print values;
    print request.POST;
    
    for i in request.POST:
        print i;
        
        if re.search('\.zip$', i):
            async_results = call_download(i)
            for ar in async_results:
                task_ids.append(ar.task_id)
        elif re.search('\.gz$', i):
            accession, new_i = i.split(',');
            print new_i
            print accession
            async_result = download_ftp_file.delay(new_i, settings.DOWNLOAD_BASE_DIR, accession)
            task_ids.append(async_result.task_id)
            
            #id = download_ftp_file.delay(new_i, settings.DOWNLOAD_BASE_DIR, accession)
            #task_ids.append(id)
    print "task_ids";
    print task_ids;
    request.session['refinery_repository_task_ids'] = task_ids
    return HttpResponseRedirect(reverse('refinery_repository.views.results_selected', args=()))
    #return HttpResponseRedirect(reverse('refinery_repository.views.results', args=(accession,)))

    
"""
Helper function for returning rawsql as a dictionary object
"""
def dictfetchall(cursor):
    "Returns all rows from a cursor as a dict"
    desc = cursor.description
    return [
        dict(zip([col[0] for col in desc], row))
        for row in cursor.fetchall()
    ]

"""
Returns column names for a given raw sql call
"""
def getColumnNamesDict(cursor):
    field_names = {}
    count = 0
    for fn in cursor.description:
        #field_names.append(fn[0]);
        field_names[fn[0]] = count 
        count += 1
    return field_names

def getColumnNames(cursor):
    field_names = [];
    for fn in cursor.description:
        field_names.append(fn[0]);
    return field_names
