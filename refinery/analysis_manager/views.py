# Create your views here.

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import run_analysis
from core.models import Analysis, Workflow, WorkflowEngine, WorkflowDataInputMap, \
    Project, DataSet, InvestigationLink
from data_set_manager.models import Study
from datetime import datetime
from django.contrib.auth.models import User, Group
from django.core import serializers
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseForbidden, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.utils import simplejson
from workflow_manager.tasks import get_workflow_inputs, get_workflows
import copy
import logging
from core.views import get_solr_results


logger = logging.getLogger(__name__)


def index(request):
    statuses = AnalysisStatus.objects.all()
    
    return render_to_response( 'analysis_manager/index.html', { 'statuses': statuses }, context_instance=RequestContext( request ) )

def analysis_status(request, uuid):
    logger.debug( "analysis_manager.views.analysis_status called")
    
    #import pdb; pdb.set_trace()
    
    analysis = Analysis.objects.get(uuid=uuid)
    statuses = AnalysisStatus.objects.get(analysis=analysis)
    
    if request.is_ajax():
        ret_json = {}
        ret_json['preprocessing'] = statuses.preprocessing_status()
        ret_json['execution'] = statuses.execution_status()
        ret_json['postprocessing'] = statuses.postprocessing_status()
        ret_json['cleanup'] = statuses.cleanup_status()
        
        return HttpResponse(simplejson.dumps(ret_json), mimetype='application/javascript')

    else:
        return render_to_response( 'analysis_manager/analysis_status.html', { 'uuid':uuid, 'statuses': statuses, 'analysis': analysis }, context_instance=RequestContext( request ) )

def analysis_run(request):
    logger.debug( "analysis_manager.views.analysis_run called")
    logger.debug( simplejson.dumps(request.POST, indent=4) )
    
    # gets workflow_uuid
    workflow_uuid = request.POST.getlist('workflow_choice')[0]
    
    # get study uuid
    study_uuid = request.POST.getlist('study_uuid')[0]
    
    
    # list of selected assays
    selected_uuids = {};
    
    # finds all selected assays (assay_uuid, and associated workflow input type for selected samples) 
    for i, val in request.POST.iteritems():
        if (val and val != ""):
            if (i.startswith('assay_')):
                temp_uuid = i.replace('assay_', '')
                selected_uuids[temp_uuid] = val
                
    #### DEBUG CODE ####
    # Turn input from POST into ingestable data/exp format 
    # retrieving workflow based on input workflow_uuid
    annot_inputs = get_workflow_inputs(workflow_uuid)
    len_inputs = len(set(annot_inputs))
    
    #print "annot_inputs"
    #print annot_inputs
    print "selected_uuids"
    print selected_uuids
    
    #------------ CONFIGURE INPUT FILES -------------------------- #   
    ret_list = [];
    ret_item = copy.deepcopy(annot_inputs)
    pair_count = 0
    pair = 1
    tcount = 0
    
    #for sd in selected_data:
    while len(selected_uuids) != 0:
        tcount += 1
        if tcount > 5000:
            break
        
        for k, v in ret_item.iteritems():
            for index, sd in selected_uuids.items():
                
                # dealing w/ cases where their are more than input for a galaxy workflow
                if len_inputs > 1:   
                    if k == sd and ret_item[k] is None:       
                        ret_item[k] = {}
                        ret_item[k]["assay_uuid"] = index
                        ret_item[k]["pair_id"] = pair
                        pair_count += 1
                        del selected_uuids[index]
                        
                    if pair_count == 2:
                        ret_list.append(ret_item)
                        ret_item = copy.deepcopy(annot_inputs)
                        pair_count = 0
                        pair += 1
                        
                # deals w/ the case where there is a single input for a galaxy workflow
                elif len_inputs == 1:
                    ret_item = copy.deepcopy(annot_inputs)
                    ret_item[k] = {};
                    ret_item[k]["assay_uuid"] = index
                    ret_item[k]["pair_id"] = pair
                    ret_list.append(ret_item)
                    del selected_uuids[index]
                    pair += 1;
    
    
    # retrieving workflow based on input workflow_uuid
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    
    ### ----------------------------------------------------------------#
    ### REFINERY MODEL UPDATES ###
    
    # TODO: catch if study or data set don't exist
    study = Study.objects.get( uuid=study_uuid );
    data_set = InvestigationLink.objects.filter( investigation__uuid=study.investigation.uuid ).order_by( "version" ).reverse()[0].data_set;
    
    logger.info( "Associating analysis with data set %s (%s)" % ( data_set, data_set.uuid ) )
    
    ######### ANALYSIS MODEL ########
    # How to create a simple analysis object
    temp_name = curr_workflow.name + " " + str( datetime.now() )
    summary_name = "None provided."
    
    analysis = Analysis( summary=summary_name, name=temp_name, project=request.user.get_profile().catch_all_project, data_set=data_set, workflow=curr_workflow, time_start=datetime.now() )
    analysis.save()   

    #setting the owner
    analysis.set_owner(request.user)
    
    # gets galaxy internal id for specified workflow
    workflow_galaxy_id = curr_workflow.internal_id
    
    # getting distinct workflow inputs
    workflow_data_inputs = curr_workflow.data_inputs.all()
    
    logger.debug("ret_list")
    logger.debug(simplejson.dumps(ret_list, indent=4))
    
    ######### ANALYSIS MODEL 
    # Updating Refinery Models for updated workflow input (galaxy worfkflow input id & assay_uuid 
    count = 0;
    for samp in ret_list:
        count += 1
        for k,v in samp.items():
            temp_input = WorkflowDataInputMap( workflow_data_input_name=k, data_uuid=samp[k]["assay_uuid"], pair_id=count)
            
            temp_input.save() 
            analysis.workflow_data_input_maps.add( temp_input ) 
            analysis.save() 
    
    # keeping new reference to analysis_status
    #analysis_status = AnalysisStatus.objects.create(analysis_uuid=analysis.uuid)
    analysis_status = AnalysisStatus.objects.create(analysis=analysis)
    analysis_status.save()
    
    # call function via analysis_manager
    run_analysis.delay(analysis, 5.0)
    
    return HttpResponseRedirect(reverse('analysis_manager.views.analysis_status', args=(analysis.uuid,)))

def repository_run(request):
    logger.debug( "analysis_manager.views.repository_run called")
        
    if request.method == 'POST':
        #logger.debug( simplejson.dumps(request.POST, indent=4) )  
        
        # attributes associated with node selection from interface
        if node_selection_blacklist_mode == 'true':
            node_selection_blacklist_mode = True
        else:
            node_selection_blacklist_mode = False
        node_selection = request.POST.getlist('node_selection[]')
        
        # solr results
        solr_query = request.POST["query"]
        solr_uuids = get_solr_results(solr_query, only_uuids=True, selected_mode=node_selection_blacklist_mode, selected_nodes=node_selection)
        
        # gets workflow_uuid
        workflow_uuid = request.POST['workflow_choice']
    
        # get study uuid
        study_uuid = request.POST['study_uuid']
    
        # retrieving workflow based on input workflow_uuid
        curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
        
        # TODO: catch if study or data set don't exist
        study = Study.objects.get( uuid=study_uuid );
        data_set = InvestigationLink.objects.filter( investigation__uuid=study.investigation.uuid ).order_by( "version" ).reverse()[0].data_set;
        
        logger.info( "Associating analysis with data set %s (%s)" % ( data_set, data_set.uuid ) )
        
        ######### ANALYSIS MODEL ########
        # How to create a simple analysis object
        temp_name = curr_workflow.name + " " + datetime.now().strftime("%Y-%m-%d @ %H:%M:%S")
        summary_name = "None provided."
        
        analysis = Analysis( summary=summary_name, name=temp_name, project=request.user.get_profile().catch_all_project, data_set=data_set, workflow=curr_workflow, time_start=datetime.now() )
        analysis.save()   
    
        #setting the owner
        analysis.set_owner(request.user)
        
        # gets galaxy internal id for specified workflow
        workflow_galaxy_id = curr_workflow.internal_id
        
        # getting distinct workflow inputs
        workflow_data_inputs = curr_workflow.data_inputs.all()[0]
        
        # NEED TO GET LIST OF FILE_UUIDS from solr query 
        count = 0;
        for file_uuid in solr_uuids:
            count += 1
            temp_input = WorkflowDataInputMap( workflow_data_input_name=workflow_data_inputs.name, data_uuid=file_uuid, pair_id=count)   
            temp_input.save() 
            analysis.workflow_data_input_maps.add( temp_input ) 
            analysis.save() 
        
        # keeping new reference to analysis_status
        analysis_status = AnalysisStatus.objects.create(analysis=analysis)
        analysis_status.save()
        
        # call function via analysis_manager
        run_analysis.delay(analysis, 5.0)
        
        #import pdb; pdb.set_trace()
        logger.debug(request.build_absolute_uri(reverse('analysis_manager.views.analysis_status', args=(analysis.uuid,)) ))
        
        ret_url = request.build_absolute_uri(reverse('analysis_manager.views.analysis_status', args=(analysis.uuid,)) )
        return HttpResponse(simplejson.dumps(ret_url), mimetype='application/json')


def update_workflows(request):
    """ 
    ajax function for updating available workflows from galaxy 
    """
    print "analysis_manager.views.update_workflows"
    
    if request.is_ajax():
        #print "is ajax"
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
    
"""
Function for AJAX returning WorkflowDataInputMap for a specified workflow_uuid
"""
def getWorkflowDataInputMap(request, workflow_uuid):
    #print "analysis_manager.views.getWorkflowDataInputMap called";
        
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    data = serializers.serialize('json',curr_workflow.data_inputs.all())
    
    if request.is_ajax():
        return HttpResponse(data, mimetype='application/javascript')
    else:
        return HttpResponse(data,mimetype='application/json')