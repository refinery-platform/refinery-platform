# Create your views here.

from analysis_manager.models import AnalysisStatus
from core.models import Analysis, Workflow, WorkflowEngine, WorkflowDataInputMap
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseForbidden, Http404, HttpResponseRedirect
from django.utils import simplejson
from django.core import serializers
from workflow_manager.tasks import get_workflow_inputs, get_workflows
import copy
from django.contrib.auth.models import User, Group
from core.models import Project, DataSet
from datetime import datetime
from analysis_manager.tasks import run_analysis
from django.core.urlresolvers import reverse


def index(request):
    statuses = AnalysisStatus.objects.all()
    
    return render_to_response( 'analysis_manager/index.html', { 'statuses': statuses }, context_instance=RequestContext( request ) )

def analysis(request, uuid):
    print "called analysis_status"
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
        return render_to_response( 'analysis_manager/analysis_status.html', { 'uuid':uuid, 'statuses': statuses }, context_instance=RequestContext( request ) )

def analysis_run(request):
    print "analysis_manager.analysis_run called";
    
    print simplejson.dumps(request.POST, indent=4);

    # gets workflow_uuid
    workflow_uuid = request.POST.getlist('workflow_choice')[0]
    
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
    users = User.objects.all()
    projects = Project.objects.all()
    data_sets = DataSet.objects.all()
    
    # gets user from url request
    #cur_user = request.user
    #cur_user.get_profile().catch_all_project
    #project = 
    #project = Project(name="Test Project: " + str( datetime.now() )) 
    #project.save()
    
    data_set = DataSet(name="Project: " + str( datetime.now() )) 
    data_set.save()
    
    ######### ANALYSIS MODEL ########
    # How to create a simple analysis object
    temp_name = "Unnamed " + str( datetime.now())
    summary_name = "None provided."
    
    #analysis = Analysis( summary=summary_name, name=temp_name, project=request.user.get_profile().catch_all_project, data_set=data_set, workflow=curr_workflow )
    analysis = Analysis( summary=summary_name, name=temp_name, project=request.user.get_profile().catch_all_project, data_set=data_set, workflow=curr_workflow, time_start=datetime.now() )
    analysis.save()   
    #setting the owner
    analysis.set_owner(request.user)
    
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
    
    return HttpResponseRedirect(reverse('analysis_manager.views.analysis', args=(analysis.uuid,)))
  

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