# Create your views here.

import copy
from datetime import datetime
import logging
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, \
    HttpResponseServerError, HttpResponseBadRequest, HttpResponseNotAllowed
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils import simplejson
from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import run_analysis
from core.models import Analysis, Workflow, WorkflowEngine, \
    WorkflowDataInputMap, InvestigationLink, NodeSet, NodeRelationship, NodePair
from data_set_manager.models import Study, Assay, Node
from workflow_manager.tasks import get_workflow_inputs, get_workflows
from core.views import get_solr_results


logger = logging.getLogger(__name__)


def index(request):
    statuses = AnalysisStatus.objects.all()    
    return render_to_response('analysis_manager/index.html',
                              {'statuses': statuses },
                              context_instance=RequestContext(request))


def analysis_status(request, uuid):
    logger.debug("analysis_manager.views.analysis_status called")
    #TODO: handle MultipleObjectsReturned exception
    try:
        analysis = Analysis.objects.get(uuid=uuid)
    except Analysis.DoesNotExist:
        analysis = None
        logger.error(
            "Analysis with UUID '{}' does not exist".format(uuid))
    #TODO: handle MultipleObjectsReturned exception
    try:
        statuses = AnalysisStatus.objects.get(analysis=analysis)
    except AnalysisStatus.DoesNotExist:
        statuses = None
        logger.error(
            "AnalysisStatus object does not exist for Analysis '{}'".format(
                analysis.name))

    if request.is_ajax():
        ret_json = {}
        if statuses:
            ret_json['preprocessing'] = statuses.preprocessing_status()
            ret_json['execution'] = statuses.execution_status()
            ret_json['postprocessing'] = statuses.postprocessing_status()
            ret_json['cleanup'] = statuses.cleanup_status()
            ret_json['overall'] = analysis.status
        return HttpResponse(simplejson.dumps(ret_json),
                            mimetype='application/javascript')
    else:
        return render_to_response(
            'analysis_manager/analysis_status.html',
            {'uuid':uuid, 'statuses': statuses, 'analysis': analysis},
            context_instance=RequestContext(request))


@login_required
def analysis_cancel(request):
    '''Send request to cancel a running workflow
    Returns HTTP status codes 200, 400, 403, 405, 500 or 503

    '''
    if request.method == 'POST':
        try:
            uuid = request.POST['uuid']
        except KeyError:
            return HttpResponseBadRequest()  # 400
        error_msg = "Cancellation failed for analysis '{}'".format(uuid)
        try:
            analysis = Analysis.objects.get(uuid=uuid)
        except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
            logger.error(error_msg + ": " + str(exc))
            return HttpResponseServerError()  # 500
        try:
            analysis.cancel()
        except RuntimeError as exc:
            logger.error(error_msg)
            return HttpResponse(status=503)  # service unavailable
        else:
            logger.info("Analysis '{}' was cancelled".format(uuid))
            return HttpResponse()  # 200
    else:
        return HttpResponseNotAllowed(['POST'])  # 405


def analysis_run(request):
    logger.debug( "analysis_manager.views.analysis_run called")
    logger.debug( simplejson.dumps(request.POST, indent=4) )
    
    # gets workflow_uuid
    workflow_uuid = request.POST.getlist('workflow_choice')[0]
    
    # get study uuid
    study_uuid = request.POST.getlist('study_uuid')[0]
    
    # list of selected assays
    selected_uuids = {};
    
    # finds all selected assays
    # (node_uuid, and associated workflow input type for selected samples) 
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
                        ret_item[k]["node_uuid"] = index
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
                    ret_item[k]["node_uuid"] = index
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
    # Updating Refinery Models for updated workflow input (galaxy worfkflow input id & node_uuid 
    count = 0;
    for samp in ret_list:
        count += 1
        for k,v in samp.items():
            temp_input = WorkflowDataInputMap( workflow_data_input_name=k, data_uuid=samp[k]["node_uuid"], pair_id=count)
            
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
        print( simplejson.dumps(request.POST, indent=4) )  
    
        # attributes associated with node selection from interface
        node_selection_blacklist_mode = request.POST['node_selection_blacklist_mode']
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
    
    
def run_nodeset(request):
    """ 
    ajax function for running an analysis w/ a single input with a given nodeset
    """
    logger.debug( "analysis_manager.views.run_nodeset called" )
    logger.debug( simplejson.dumps(request.POST, indent=4) )
    
    if request.is_ajax():
        #print "is ajax"
        
        # gets workflow_uuid
        workflow_uuid = request.POST.getlist('workflow_id')[0]
        
        # get study uuid
        study_uuid = request.POST.getlist('study_uuid')[0]
        
        node_set_uuid = request.POST.getlist('node_set_uuid')[0]
        node_set_field = request.POST.getlist('node_set_field')[0]
        
        curr_node_set = NodeSet.objects.get(uuid=node_set_uuid)
        curr_node_dict = curr_node_set.solr_query_components
        curr_node_dict = simplejson.loads(curr_node_dict)
        
        # solr results
        solr_uuids = get_solr_results(curr_node_set.solr_query, only_uuids=True, selected_mode=curr_node_dict['documentSelectionBlacklistMode'], selected_nodes=curr_node_dict['documentSelection'])
        
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

    
def run_noderelationship(request):
    """ 
    ajax function for running an analysis w/ multiple inputs with a given noderelationship
    """
    logger.debug("analysis_manager.views run_noderelationship called")
    logger.debug( simplejson.dumps(request.POST, indent=4) )
    
    if request.is_ajax():
        # Input list for running analysis
        ret_list = []
        
        # gets workflow_uuid
        workflow_uuid = request.POST.getlist('workflow_id')[0]
        
        # get study uuid
        study_uuid = request.POST.getlist('study_uuid')[0]
        
        # retrieving workflow based on input workflow_uuid
        curr_workflow = Workflow.objects.get(uuid=workflow_uuid)
        
        # TODO: catch if study or data set don't exist
        study = Study.objects.get( uuid=study_uuid );
        data_set = InvestigationLink.objects.filter( investigation__uuid=study.investigation.uuid ).order_by( "version" ).reverse()[0].data_set;
        
        # Get node relationship model
        node_relationship_uuid = request.POST.getlist('node_relationship_uuid')[0]
        curr_relationship = NodeRelationship.objects.get(uuid=node_relationship_uuid)
        
        # Iterating over node pairs
        input_keys = [] 
        base_input = {}
        # defining inputs used for analysis
        for workflow_inputs in curr_workflow.input_relationships.all():
            base_input[workflow_inputs.set1] = {}
            base_input[workflow_inputs.set2] = {}
            input_keys.append(workflow_inputs.set1)
            input_keys.append(workflow_inputs.set2)
        
        # creating instance of instance of input data pairing for analysis i.e. [{u'exp_file': {'node_uuid': u'3d061699-6bc8-11e2-9b55-406c8f1d5108', 'pair_id': 1}, u'input_file': {'node_uuid': u'3d180d11-6bc8-11e2-9bc7-406c8f1d5108', 'pair_id': 1}}]
        count = 1
        for curr_pair in curr_relationship.node_pairs.all():
            temp_pair = copy.deepcopy(base_input)
            print "curr_pair"
            print temp_pair
            print curr_pair
            #temp_pair = {}
            if curr_pair.node2:
                #print curr_pair.node2.uuid
                temp_pair[input_keys[0]]['node_uuid'] = curr_pair.node1.uuid
                temp_pair[input_keys[0]]['pair_id'] = count
                temp_pair[input_keys[1]]['node_uuid'] = curr_pair.node2.uuid
                temp_pair[input_keys[1]]['pair_id'] = count
                ret_list.append(temp_pair)
                print temp_pair
                count += 1
        
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
        # Updating Refinery Models for updated workflow input (galaxy worfkflow input id & node_uuid 
        count = 0
        for samp in ret_list:
            count += 1
            for k,v in samp.items():
                temp_input = WorkflowDataInputMap( workflow_data_input_name=k, data_uuid=samp[k]["node_uuid"], pair_id=count)
                
                temp_input.save() 
                analysis.workflow_data_input_maps.add( temp_input ) 
                analysis.save() 
        
        # keeping new reference to analysis_status
        analysis_status = AnalysisStatus.objects.create(analysis=analysis)
        analysis_status.save()
        
        # call function via analysis_manager
        run_analysis.delay(analysis, 5.0)
        
        logger.debug(request.build_absolute_uri(reverse('analysis_manager.views.analysis_status', args=(analysis.uuid,)) ))
        
        ret_url = request.build_absolute_uri(reverse('analysis_manager.views.analysis_status', args=(analysis.uuid,)) )
        return HttpResponse(simplejson.dumps(ret_url), mimetype='application/json')


def create_noderelationship(request):
    """ 
    ajax function for creating noderelationships based on multiple node sets
    """
    
    logger.debug("analysis_manager.views create_noderelationship called")
    logger.debug( simplejson.dumps(request.POST, indent=4) )
    
    if request.is_ajax():
        #print "is ajax"
        
        nr_name = request.POST.getlist('name')[0]
        nr_description = request.POST.getlist('description')[0]
        
        # getting nodeset uuids
        node_set_uuid1 = request.POST.getlist('node_set_uuid1')[0]
        node_set_uuid2 = request.POST.getlist('node_set_uuid2')[0]
        
        # getting instances of current nodeset
        curr_node_set1 = NodeSet.objects.get(uuid=node_set_uuid1)
        curr_node_set2 = NodeSet.objects.get(uuid=node_set_uuid2)
        
        # fields to match on
        diff_fields = request.POST.getlist('fields[]')
        if len(diff_fields) < 1:
            logger.error('create_noderelationship: failed b/c no field selected for defining Node Relationships')
        
        # get study uuid
        assay_uuid = request.POST.getlist('assay_uuid')[0]
        study_uuid = request.POST.getlist('study_uuid')[0]
        study = Study.objects.get( uuid=study_uuid );
        
        # TODO: catch if study or data set don't exist
        study = Study.objects.get( uuid=study_uuid );
        assay = Assay.objects.get( uuid=assay_uuid );
        
        # Need to deal w/ limits on current solr queries
        # solr results
        #print "curr_node_set1.solr_query_components"
        curr_node_dict1 = curr_node_set1.solr_query_components
        curr_node_dict1 = simplejson.loads(curr_node_dict1)
        
        curr_node_dict2 = curr_node_set2.solr_query_components
        curr_node_dict2 = simplejson.loads(curr_node_dict2)
        
        # getting list of node uuids based on input solr query 
        node_set_solr1 = get_solr_results(curr_node_set1.solr_query, selected_mode=curr_node_dict1['documentSelectionBlacklistMode'], selected_nodes=curr_node_dict1['documentSelection'])
        node_set_solr2 = get_solr_results(curr_node_set2.solr_query, selected_mode=curr_node_dict2['documentSelectionBlacklistMode'], selected_nodes=curr_node_dict2['documentSelection'])
       
        # all fields from the first solr query 
        all_fields = node_set_solr1['responseHeader']['params']['fl']
        
        # actual documents retreived from solr response
        node_set_results1 = node_set_solr1['response']['docs']
        node_set_results2 = node_set_solr2['response']['docs']
        
        # match between 2 nodesets for a given column
        nodes_set_match, match_info = match_nodesets(node_set_results1, node_set_results2, diff_fields, all_fields)
                
        print "MAKING RELATIONSHIPS NOW"
        print simplejson.dumps(nodes_set_match, indent=4);
        print nodes_set_match
        
        # TODO: need to include names, descriptions, summary
        if (nr_name.strip() == ''):
            nr_name = curr_node_set1.name + " - " + curr_node_set2.name + " " + str( datetime.now() )
        if (nr_description.strip() == ''):
            nr_description = curr_node_set1.name + " - " + curr_node_set2.name + " " + str( datetime.now() )
        
        new_relationship = NodeRelationship(node_set_1=curr_node_set1, node_set_2=curr_node_set2, study=study, assay=assay, name=nr_name, summary=nr_description)
        new_relationship.save()
        
        for i in range(len(nodes_set_match)):
            #print "### i =" + str(i)
            node1 = Node.objects.get(uuid=nodes_set_match[i]['uuid_1'])
            node2 = Node.objects.get(uuid=nodes_set_match[i]['uuid_2'])
            new_pair = NodePair(node1=node1, node2=node2, group=i+1)
            new_pair.save()
            new_relationship.node_pairs.add(new_pair)
             
        #print "node_set_solr1"
        #print simplejson.dumps(node_set_solr1, indent=4)
        #print "node_set_solr2"
        #print simplejson.dumps(node_set_solr2, indent=4)
        return HttpResponse(simplejson.dumps(match_info, indent=4), mimetype='application/json')


"""
A dictionary difference calculator
Originally posted as:
http://stackoverflow.com/questions/1165352/fast-comparison-between-two-python-dictionary/1165552#1165552
"""

class DictDiffer(object):
    """
    Calculate the difference between two dictionaries as:
    (1) items added
    (2) items removed
    (3) keys same in both but changed values
    (4) keys same in both and unchanged values
    """
    def __init__(self, current_dict, past_dict):
        self.current_dict, self.past_dict = current_dict, past_dict
        self.current_keys, self.past_keys = [set(d.keys()) for d in (current_dict, past_dict)]
        self.intersect = self.current_keys.intersection(self.past_keys)
    
    def added(self):
        return self.current_keys - self.intersect
    
    def removed(self):
        return self.past_keys - self.intersect
    
    def changed(self):
        return set(o for o in self.intersect
                   if self.past_dict[o] != self.current_dict[o])
    
    def unchanged(self):
        return set(o for o in self.intersect
                   if self.past_dict[o] == self.current_dict[o])
        
        
def match_nodesets(ns1, ns2, diff_f, all_f, rel_type=None ):
    '''
    Helper function for matching 2 nodesets solr results
    '''    
    logger.debug("analysis_manager.views match_nodesets called")
    
    num_fields = len(all_f)
    ret_info = {};
    ret_info['total'] = str(len(ns1) + len(ns2))
    ret_info['node1_count'] = str(len(ns1))
    ret_info['node2_count'] = str(len(ns2))
    
    
    best_list = []
    template = {'uuid_1':'', 'uuid_2':'', 'frac':0.0, 'same':0, 'diff':0, 'tot':0, 'sel_tot':0, 'sel':0, 'sel_frac':0.0}
    i = 0 
    for node1 in ns1:
        best_node = template.copy()
        #best_node['uuid_1'] = node1['uuid']
        
        j = 0
        for node2 in ns2:
            
            if node1['uuid'] != node2['uuid']:
                #tdd = DictDiffer(node1, node2)
                temp_node = template.copy()
                temp_node['uuid_1'] = node1['uuid']
                temp_node['uuid_2'] = node2['uuid']
                
                # counts differences for list of fields
                for df in diff_f:
                    # if the given column matches between Nodesets
                    if node1[df] == node2[df]:
                        best_node = temp_node
                        #best_node['uuid_2']  = node2['uuid']
        
                """
                #df_tot = len(diff_f)
                #df_count = 0

                temp_node['same'] = len(tdd.unchanged())
                temp_node['diff'] = len(tdd.changed())
                temp_node['tot'] = len(tdd.current_keys)
                temp_node['frac'] = float(temp_node['same'])/float(temp_node['tot'])
                
                #shared_item = set(node1.items()) & set(node2.items())
                #diff_item = set(node1.items()) ^ set(node2.items())
                
                    if node1[df] != node2[df]:
                        df_count += 1
                
                temp_node['sel'] = df_count
                temp_node['sel_tot'] = df_tot
                temp_node['sel_frac'] = float(df_count) / float(df_tot)
                
                if (best_node['sel_frac'] <= temp_node['sel_frac']):
                    if (best_node['frac'] <= temp_node['frac']):
                        best_node = temp_node 
                       
                       #print "i: " + str(i) + " j: "+ str(j);
                       #print "temp_node"
                       #print simplejson.dumps(temp_node, indent=4)
                       #print "best_node"
                       #print simplejson.dumps(best_node, indent=4)
                """
            j+=1
            
        best_list.append(best_node)    
        i+=1

    # matches
    ret_info['matches'] = str(len(best_list))
    
    #for field in all_f:        
    #    print "*********** best_list"
    
    #print simplejson.dumps(best_list, indent=4)
    
    return best_list, ret_info
    
    