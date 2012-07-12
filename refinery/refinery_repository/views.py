import copy
import simplejson
import re
from datetime import datetime
from django import forms
from django.db import connection
from django.conf import settings
from django.core import serializers
from django.http import Http404, HttpResponseRedirect, HttpResponse
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.urlresolvers import reverse
from celery import states
from celery.result import AsyncResult
from celery.utils import get_full_cls_name
from celery.task.control import revoke
from celery.utils.encoding import safe_repr
from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import run_analysis
from core.models import *
from refinery_repository.tasks import call_download, download_ftp_file, process_isa_tab
from workflow_manager.tasks import get_workflow_inputs, get_workflows
from data_set_manager.models import Node

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


# TODO: check perms
def investigations( request ):
    investigations = Investigation.objects.all()

    return render_to_response( "refinery_repository/investigations.html", 
                              {
                                "investigations": investigations
                              },
                              context_instance=RequestContext( request ) )
    
# TODO: check perms    
def investigation( request, query ):

    investigation = None
    
    try:
        investigation = Investigation.objects.get( investigation_uuid=query )
    except:
        raise Http404

    return render_to_response( "refinery_repository/investigation.html", 
                              {
                                "investigation": investigation
                              },
                              context_instance=RequestContext( request ) )    

     
""" Richard's views """
def get_available_files(request):
    """
    Returns all available files to use in workflows
    """
    cursor = connection.cursor()
    
    cursor.execute(""" SELECT distinct a.uuid, a.id as assay_id, a.investigation_id, a.assay_name, o.species, d.description, ca.chip_antibody, ab.antibody, t.tissue, g.genotype, r.file, r.raw_data_file FROM
(SELECT distinct on (assay_name) id, assay_uuid as uuid, sample_name, assay_name, investigation_id, study_id from refinery_repository_assay) a
LEFT OUTER JOIN
(SELECT value as species, study_id from refinery_repository_studybracketedfield where sub_type ='ORGANISM') o
ON (a.study_id = o.study_id)
LEFT OUTER JOIN
(SELECT value as description, study_id from refinery_repository_studybracketedfield where sub_type = 'SAMPLE_DESCRIPTION') d
ON (a.study_id = d.study_id)
LEFT OUTER JOIN 
(SELECT assay_id, raw_data_file, file_name as file from refinery_repository_assay_raw_data a JOIN refinery_repository_rawdata b ON a.rawdata_id = b.id) r ON a.id = r.assay_id
LEFT OUTER JOIN
(SELECT value as chip_antibody, assay_id from refinery_repository_assaybracketedfield where sub_type = 'CHIP_ANTIBODY') ca ON a.id = ca.assay_id
LEFT OUTER JOIN
(SELECT value as antibody, assay_id from refinery_repository_assaybracketedfield where sub_type = 'ANTIBODY') as ab ON a.id = ab.assay_id
LEFT OUTER JOIN
(SELECT value as tissue, assay_id from refinery_repository_assaybracketedfield where sub_type = 'TISSUE') as t ON a.id = t.assay_id
LEFT OUTER JOIN
(SELECT value as genotype, assay_id from refinery_repository_assaybracketedfield where sub_type = 'GENOTYPE') as g ON a.id = g.assay_id order by a.investigation_id, a.assay_name""")

    #import pdb; pdb.set_trace()
    
    #field_names = getColumnNamesDict(cursor)
    field_order = getColumnNames(cursor)
    #results = cursor.fetchall() 
    results = dictfetchall(cursor)
    
    #print "field_order"
    #print field_order
    workflows = Workflow.objects.all();

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
        
    #return render_to_response('refinery_repository/samples.html', {'fields':field_names, 'order':field_order, 'results': sample_pages}, context_instance=RequestContext(request)) 
    return render_to_response('refinery_repository/samples.html', {'workflows': workflows, 'order':field_order, 'results': sample_pages}, context_instance=RequestContext(request)) 

def get_available_files2(request):
    """
    Returns all available files to use in workflows
    """
    print "refinery_repository.get_available_files2"
    
    cursor = connection.cursor()
    
    cursor.execute("""
    SELECT distinct a.id as assay_id, a.investigation_id, a.assay_name, o.species, d.description, ca.chip_antibody, ab.antibody, t.tissue, g.genotype, r.file, r.raw_data_file, r.rawdata_uuid  as uuid FROM
(SELECT distinct on (assay_name) id, assay_uuid as uuid, sample_name, assay_name, investigation_id, study_id from refinery_repository_assay) a
LEFT OUTER JOIN
(SELECT value as species, study_id from refinery_repository_studybracketedfield where sub_type ='ORGANISM') o
ON (a.study_id = o.study_id)
LEFT OUTER JOIN
(SELECT value as description, study_id from refinery_repository_studybracketedfield where sub_type = 'SAMPLE_DESCRIPTION') d
ON (a.study_id = d.study_id)
LEFT OUTER JOIN 
(SELECT assay_id, raw_data_file, file_name as file, rawdata_uuid from refinery_repository_assay_raw_data a JOIN refinery_repository_rawdata b ON a.rawdata_id = b.id) r ON a.id = r.assay_id
LEFT OUTER JOIN
(SELECT value as chip_antibody, assay_id from refinery_repository_assaybracketedfield where sub_type = 'CHIP_ANTIBODY') ca ON a.id = ca.assay_id
LEFT OUTER JOIN
(SELECT value as antibody, assay_id from refinery_repository_assaybracketedfield where sub_type = 'ANTIBODY') as ab ON a.id = ab.assay_id
LEFT OUTER JOIN
(SELECT value as tissue, assay_id from refinery_repository_assaybracketedfield where sub_type = 'TISSUE') as t ON a.id = t.assay_id
LEFT OUTER JOIN
(SELECT value as genotype, assay_id from refinery_repository_assaybracketedfield where sub_type = 'GENOTYPE') as g ON a.id = g.assay_id order by a.investigation_id, a.assay_name""")

    #field_names = getColumnNamesDict(cursor)
    field_order = getColumnNames(cursor)
    #results = cursor.fetchall() 
    results = dictfetchall(cursor)
    
    # getting available workflows
    workflows = Workflow.objects.all();

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
        
    return render_to_response('refinery_repository/analysis_samples.html', {'workflows':workflows, 'order':field_order, 'results': sample_pages}, context_instance=RequestContext(request)) 

def get_investigation_files(request, investigation_uuid):
    ''' Display all data files that belong to an investigation '''

    print "refinery_repository.get_available_files2"
    
    workflows = Workflow.objects.all()

    results = Node.objects.filter(type=Node.RAW_DATA_FILE,
                                  assay__study__investigation__uuid=investigation_uuid)
    field_order = ['Name']

    paginator = Paginator(results, 25) # show 25 samples per page

    page = request.GET.get('page', 1)
    try:
        sample_pages = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        sample_pages = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        sample_pages = paginator.page(paginator.num_pages)

    return render_to_response('refinery_repository/investigation_samples.html',
                              {'workflows': workflows, 'order': field_order, 'results': sample_pages},
                              context_instance=RequestContext(request))

def update_workflows(request):
    """ 
    ajax function for updating available workflows from galaxy 
    """
    print "refinery_repository.update_workflows"
    
    if request.is_ajax():
        print "is ajax"
        workflow_engines = WorkflowEngine.objects.all()
        workflows = 0
        
        for engine in workflow_engines:
            # function for updating workflows from galaxy instance
            get_workflows( engine );
            new_workflow_count = engine.workflow_set.all().count()
            print "Engine: " + engine.name + " - " + str( ( new_workflow_count ) ) + ' workflows after.'
            workflows += new_workflow_count
        
        # getting updated available workflows
        workflows = Workflow.objects.all()    
        json_serializer = serializers.get_serializer("json")()
        return HttpResponse(json_serializer.serialize(workflows, ensure_ascii=False), mimetype='application/javascript')
    else:
        return HttpResponse(status=400)

def analysis_run(request):
    print "refinery_repository.analysis_run called";
    
    #print request.POST

    # gets workflow_uuid
    workflow_uuid = request.POST.getlist('workflow_choice')[0]
    
    # list of selected assays
    selected_uuids = {};
    selected_fileurls = {};    
    
    # finds all selected assays (assay_uuid, and associated workflow input type for selected samples) 
    for i, val in request.POST.iteritems():
        if (val and val != ""):
            if (i.startswith('assay_')):
                temp_uuid = i.lstrip('assay_')
                selected_uuids[temp_uuid] = val
                #selected_data.append({"assay_uuid":i.lstrip('assay_'), 'workflow_input_type':val})
            elif (i.startswith('fileurl_')):
                temp_uuid = i.lstrip('fileurl_')
                
                #if str(temp_uuid) in selected_uuids:
                #    print "FOUFOUFODNDs"
                selected_fileurls[temp_uuid] = val
                #else:
                #    print "not found"
    
    #### DEBUG CODE ####
    # Turn input from POST into ingestable data/exp format 
    # retrieving workflow based on input workflow_uuid
    annot_inputs = get_workflow_inputs(workflow_uuid)
    len_inputs = len(set(annot_inputs))
    
    #print "annot_inputs"
    #print annot_inputs
    #print "len_inputs"
    #print len_inputs
    #print "selected_uuids"
    #print selected_uuids
    #print "selected_fileurls"
    #print selected_fileurls
    
    
    #------------ CONFIGURE INPUT FILES -------------------------- #   
    ret_list = [];
    ret_item = copy.deepcopy(annot_inputs)
    pair_count = 0
    pair = 1;
    tcount = 0
    #for sd in selected_data:
    while len(selected_uuids) != 0:
        tcount += 1
        if tcount > 5000:
            break
        
        for k, v in ret_item.iteritems():
            #for index, sd in enumerate(selected_data):
            for index, sd in selected_uuids.items():
                # dealing w/ cases where their are more than input for a galaxy workflow
                if len_inputs > 1:
                    if k == sd and ret_item[k] is None:
                        ret_item[k] = {};
                        ret_item[k]["assay_uuid"] = index
                        ret_item[k]["pair_id"] = pair
                        ret_item[k]["fileurl"] = selected_fileurls[index]
                        pair_count += 1
                        #selected_uuids.remove(sd)
                        del selected_uuids[index]
                    if pair_count == 2:
                        ret_list.append(ret_item)
                        ret_item = copy.deepcopy(annot_inputs)
                        pair_count = 0
                        pair += 1
                # deals w/ the case where there is a single input for a galaxy workflow
                elif len_inputs == 1:            
                    ret_item[k] = {};
                    ret_item[k]["assay_uuid"] = index
                    ret_item[k]["pair_id"] = pair
                    ret_item[k]["fileurl"] = selected_fileurls[index]
                    ret_list.append(ret_item)
                    #selected_uuids.remove(sd)
                    del selected_uuids[index]
                    pair += 1;
    
    
    # retrieving workflow based on input workflow_uuid
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    
    ### ----------------------------------------------------------------#
    ### REFINERY MODEL UPDATES ###
    users = User.objects.all()
    projects = Project.objects.all()
    data_sets = DataSet.objects.all()
    
    # gets user from url request
    #cur_user = request.user
    #cur_user.get_profile().catch_all_project
    #project = 
    #project = Project(name="Test Project: " + str( datetime.now() )) 
    #project.save()
    
    data_set = DataSet(name="Test Project: " + str( datetime.now() )) 
    data_set.save()
    
    
    
    ######### ANALYSIS MODEL ########
    # How to create a simple analysis object
    temp_name = "Adhoc test analysis: " + str( datetime.now())
    summary_name = "Test Summary"
    analysis = Analysis( summary=summary_name, name=temp_name, project=request.user.get_profile().catch_all_project, data_set=data_set, workflow=curr_workflow )
    analysis.save()   
    
    # gets galaxy internal id for specified workflow
    workflow_galaxy_id = curr_workflow.internal_id
    
    # getting distinct workflow inputs
    workflow_data_inputs = curr_workflow.data_inputs.all()
    
    ######### ANALYSIS MODEL 
    # Updating Refinery Models for updated workflow input (galaxy worfkflow input id & assay_uuid 
    count = 0;
    for samp in ret_list:
        count += 1
        for k,v in samp.items():
            temp_input =  WorkflowDataInputMap( workflow_data_input_name=k, data_uuid=samp[k]["assay_uuid"], pair_id=count, fileurl=samp[k]["fileurl"])
            temp_input.save() 
            analysis.workflow_data_input_maps.add( temp_input ) 
            analysis.save() 
    
    # keeping new reference to analysis_status
    #analysis_status = AnalysisStatus.objects.create(analysis_uuid=analysis.uuid)
    analysis_status = AnalysisStatus.objects.create(analysis=analysis)
    analysis_status.save()
    
    # call function via analysis_manager
    run_analysis.delay(analysis, 5.0)
    
    return HttpResponseRedirect(reverse('analysis_manager.views.analysis', args=(analysis.uuid,)))
            
    
def results_selected(request):
    """Returns task status and result in JSON format."""
    print "refinery_repository.results_selected called";
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
        
    if (request.is_ajax()):
        print "RETURNING AJAX"
        print task_progress;
        return HttpResponse(simplejson.dumps( task_progress, ensure_ascii=False), mimetype='application/javascript')
    
    else:
        print "NOT AJAX"
        return render_to_response('refinery_repository/results_download.html', { 'task_progress': task_progress }, context_instance=RequestContext(request))

""" 
Function for dealing w/ selected samples to download and input into workflow
"""

def download_selected_samples(request):
    print "refinery_repository.download_selected_samples called";
    print request.POST;
    
    task_ids = list()
    
    values = request.POST.getlist('csrfmiddlewaretoken')
    print "values"
    print values;
    print len(values)
    
    #for i in request.POST:
    for i, val in request.POST.iteritems():
        print "i"
        print i
        print val
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
Function for AJAX returning WorkflowDataInputMap for a specified workflow_uuid
"""
def getWorkflowDataInputMap(request, workflow_uuid):
    print "refinery_repository.getWorkflowDataInputMap called";
        
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    data = serializers.serialize('json',curr_workflow.data_inputs.all())
    
    if request.is_ajax():
        return HttpResponse(data, mimetype='application/javascript')
    else:
        return HttpResponse(data,mimetype='application/json')

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
