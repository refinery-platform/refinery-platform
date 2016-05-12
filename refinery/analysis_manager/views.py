import copy
import json
import logging
from urlparse import urlparse

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.urlresolvers import reverse
from django.http import (
    HttpResponse, HttpResponseServerError,
    HttpResponseBadRequest, HttpResponseNotAllowed, HttpResponseForbidden
)
from django.shortcuts import render_to_response
from django.template import RequestContext

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import run_analysis
from core.models import (
    Analysis, Workflow, WorkflowEngine, WorkflowDataInputMap,
    InvestigationLink, NodeSet, NodeRelationship, NodePair
)
from core.views import get_solr_results, custom_error_page
from core.utils import get_aware_local_time
from data_set_manager.models import Study, Assay, Node
from workflow_manager.tasks import get_workflows


logger = logging.getLogger(__name__)


def index(request):
    statuses = AnalysisStatus.objects.all()
    return render_to_response('analysis_manager/index.html',
                              {'statuses': statuses},
                              context_instance=RequestContext(request))


def analysis_status(request, uuid):
    """Returns analysis status in HTML or JSON formats (for AJAX requests)"""
    # TODO: handle MultipleObjectsReturned exception
    try:
        analysis = Analysis.objects.get(uuid=uuid)
    except Analysis.DoesNotExist:
        logger.error("Analysis with UUID '{}' does not exist".format(uuid))
        return HttpResponse(custom_error_page(request, '404.html', {}),
                            status='404')

    # TODO: handle MultipleObjectsReturned exception
    try:
        status = AnalysisStatus.objects.get(analysis=analysis)
    except AnalysisStatus.DoesNotExist:
        logger.error("AnalysisStatus object does not exist for Analysis '{}'"
                     .format(analysis.name))
        return HttpResponse(custom_error_page(request, '500.html', {}),
                            status='500')

    # add analysis status message if request came from this view
    referer_path = urlparse(request.META.get('HTTP_REFERER', '')).path
    if referer_path == request.path:
        # clear messages to avoid message duplication
        storage = messages.get_messages(request)
        storage.used = True
        # add analysis status message
        if analysis.get_status() == Analysis.FAILURE_STATUS:
            msg = "Analysis '{}' failed. No results were added to your data " \
                  "set.".format(analysis.name)
            messages.error(request, msg)
        elif analysis.get_status() == Analysis.SUCCESS_STATUS:
            msg = "Analysis '{}' finished successfully. View the results in " \
                  "the file browser.".format(analysis.name)
            messages.success(request, msg)

    if request.is_ajax():
        ret_json = {
            'refineryImport': status.refinery_import_state(),
            'galaxyImport': status.galaxy_import_state(),
            'galaxyAnalysis': status.galaxy_analysis_state(),
            'galaxyExport': status.galaxy_export_state(),
            'overall': analysis.get_status(),
        }
        logger.debug("Analysis status for '%s': %s",
                     analysis.name, json.dumps(ret_json, indent=4))
        return HttpResponse(json.dumps(ret_json, indent=4),
                            mimetype='application/javascript')
    else:
        return render_to_response(
            'analysis_manager/analysis_status.html',
            {'uuid': uuid, 'status': status, 'analysis': analysis},
            context_instance=RequestContext(request))


@login_required
def analysis_cancel(request):
    """Send request to cancel a running workflow
    Returns HTTP status codes 200, 400, 403, 405, 500 or 503
    """
    # $http Angular service returns json format
    dict = json.loads(request.body)
    if request.method == 'POST':
        try:
            uuid = dict['uuid']
        except KeyError:
            return HttpResponseBadRequest()  # 400
        error_msg = "Cancellation failed for analysis '{}'".format(uuid)
        try:
            analysis = Analysis.objects.get(uuid=uuid)
        except (Analysis.DoesNotExist,
                Analysis.MultipleObjectsReturned) as exc:
            logger.error(error_msg + ": " + str(exc))
            return HttpResponseServerError()  # 500
        # check if the user has permission to cancel this analysis
        if (request.user == analysis.get_owner() or
            request.user == analysis.workflow.workflow_engine.get_owner() or
                request.user.is_superuser):
            try:
                analysis.cancel()
            except RuntimeError as exc:
                logger.error(error_msg)
                return HttpResponse(status=503)  # service unavailable
            else:
                logger.info("Analysis '{}' was cancelled".format(uuid))
                return HttpResponse()  # 200
        else:
            return HttpResponseForbidden()  # 403
    else:
        return HttpResponseNotAllowed(['POST'])  # 405


def update_workflows(request):
    """ajax function for updating available workflows from galaxy"""
    logger.debug("analysis_manager.views.update_workflows")
    if request.is_ajax():
        workflow_engines = WorkflowEngine.objects.all()
        workflows = 0
        for engine in workflow_engines:
            # function for updating workflows from galaxy instance
            get_workflows(engine)
            new_workflow_count = engine.workflow_set.all().count()
            logger.debug("Engine: %s - %s workflows after",
                         engine.name, str(new_workflow_count))
            workflows += new_workflow_count
        # getting updated available workflows
        workflows = Workflow.objects.all()
        json_serializer = serializers.get_serializer("json")()
        return HttpResponse(
            json_serializer.serialize(workflows, ensure_ascii=False),
            mimetype='application/javascript')
    else:
        return HttpResponse(status=400)


def getWorkflowDataInputMap(request, workflow_uuid):
    """Function for AJAX returning WorkflowDataInputMap for a specified
    workflow_uuid
    """
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    data = serializers.serialize('json', curr_workflow.data_inputs.all())
    if request.is_ajax():
        return HttpResponse(data, mimetype='application/javascript')
    else:
        return HttpResponse(data, mimetype='application/json')


def run(request):
    """Run analysis, return URL of the analysis status page
    Needs re-factoring
    """
    logger.debug("Received request to start analysis")
    if not request.is_ajax():
        return HttpResponseBadRequest()  # 400
    allowed_methods = ['POST']
    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)  # 405

    analysis_config = json.loads(request.body)
    try:
        workflow_uuid = analysis_config['workflowUuid']
        study_uuid = analysis_config['studyUuid']
        node_set_uuid = analysis_config['nodeSetUuid']
        node_relationship_uuid = analysis_config['nodeRelationshipUuid']
        custom_name = analysis_config['name']
    except KeyError:
        return HttpResponseBadRequest()  # 400
    # must provide workflow and study UUIDs,
    # and either node set UUID or node relationship UUID
    if not (workflow_uuid and study_uuid and
            (node_set_uuid or node_relationship_uuid)):
        return HttpResponseBadRequest()  # 400

    # single-input workflow
    if node_set_uuid:
        # TODO: handle DoesNotExist exception
        curr_node_set = NodeSet.objects.get(uuid=node_set_uuid)
        curr_node_dict = curr_node_set.solr_query_components
        curr_node_dict = json.loads(curr_node_dict)
        # solr results
        solr_uuids = get_solr_results(
            curr_node_set.solr_query,
            only_uuids=True,
            selected_mode=curr_node_dict['documentSelectionBlacklistMode'],
            selected_nodes=curr_node_dict['documentSelection']
        )
        # retrieving workflow based on input workflow_uuid
        # TODO: handle DoesNotExist exception
        curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]

        # TODO: catch if study or data set don't exist
        study = Study.objects.get(uuid=study_uuid)
        data_set = InvestigationLink.objects.filter(
            investigation__uuid=study.investigation.uuid).order_by(
                "version").reverse()[0].data_set

        logger.info("Associating analysis with data set %s (%s)",
                    data_set, data_set.uuid)

        # ANALYSIS MODEL
        # How to create a simple analysis object
        if not custom_name:
            temp_name = curr_workflow.name + " " + get_aware_local_time()\
                .strftime("%Y-%m-%d @ %H:%M:%S")
        else:
            temp_name = custom_name

        summary_name = "None provided."
        analysis = Analysis(
            summary=summary_name,
            name=temp_name,
            project=request.user.get_profile().catch_all_project,
            data_set=data_set,
            workflow=curr_workflow,
            time_start=get_aware_local_time()
        )
        analysis.save()
        analysis.set_owner(request.user)

        # getting distinct workflow inputs
        workflow_data_inputs = curr_workflow.data_inputs.all()[0]

        # NEED TO GET LIST OF FILE_UUIDS from solr query
        count = 0
        for file_uuid in solr_uuids:
            count += 1
            temp_input = WorkflowDataInputMap(
                workflow_data_input_name=workflow_data_inputs.name,
                data_uuid=file_uuid,
                pair_id=count
            )
            temp_input.save()
            analysis.workflow_data_input_maps.add(temp_input)
            analysis.save()

    # dual-input workflow
    if node_relationship_uuid:
        # Input list for running analysis
        ret_list = []
        # retrieving workflow based on input workflow_uuid
        curr_workflow = Workflow.objects.get(uuid=workflow_uuid)

        # TODO: catch if study or data set don't exist
        study = Study.objects.get(uuid=study_uuid)
        data_set = InvestigationLink.objects.filter(
            investigation__uuid=study.investigation.uuid).order_by(
                "version").reverse()[0].data_set

        # Get node relationship model
        curr_relationship = NodeRelationship.objects.get(
            uuid=node_relationship_uuid)
        # Iterating over node pairs
        input_keys = []
        base_input = {}
        # defining inputs used for analysis
        for workflow_inputs in curr_workflow.input_relationships.all():
            base_input[workflow_inputs.set1] = {}
            base_input[workflow_inputs.set2] = {}
            input_keys.append(workflow_inputs.set1)
            input_keys.append(workflow_inputs.set2)

        # creating instance of instance of input data pairing for analysis,
        # i.e. [{u'exp_file':
        # {'node_uuid': u'3d061699-6bc8-11e2-9b55-406c8f1d5108', 'pair_id': 1},
        # u'input_file':
        # {'node_uuid': u'3d180d11-6bc8-11e2-9bc7-406c8f1d5108', 'pair_id': 1}}
        # ]
        count = 1
        for curr_pair in curr_relationship.node_pairs.all():
            temp_pair = copy.deepcopy(base_input)
            print "curr_pair"
            print temp_pair
            print curr_pair
            if curr_pair.node2:
                temp_pair[input_keys[0]]['node_uuid'] = curr_pair.node1.uuid
                temp_pair[input_keys[0]]['pair_id'] = count
                temp_pair[input_keys[1]]['node_uuid'] = curr_pair.node2.uuid
                temp_pair[input_keys[1]]['pair_id'] = count
                ret_list.append(temp_pair)
                print temp_pair
                count += 1

        logger.info("Associating analysis with data set %s (%s)",
                    data_set, data_set.uuid)

        # ANALYSIS MODEL
        # How to create a simple analysis object
        if not custom_name:
            temp_name = curr_workflow.name + " " + get_aware_local_time()\
                .strftime("%Y-%m-%d @ %H:%M:%S")
        else:
            temp_name = custom_name

        summary_name = "None provided."

        analysis = Analysis(
            summary=summary_name,
            name=temp_name,
            project=request.user.get_profile().catch_all_project,
            data_set=data_set,
            workflow=curr_workflow,
            time_start=get_aware_local_time()
        )
        analysis.save()
        analysis.set_owner(request.user)

        # getting distinct workflow inputs
        workflow_data_inputs = curr_workflow.data_inputs.all()

        logger.debug("ret_list")
        logger.debug(json.dumps(ret_list, indent=4))

        # ANALYSIS MODEL
        # Updating Refinery Models for updated workflow input
        # (galaxy worfkflow input id & node_uuid)
        count = 0
        for samp in ret_list:
            count += 1
            for k, v in samp.items():
                temp_input = WorkflowDataInputMap(
                    workflow_data_input_name=k,
                    data_uuid=samp[k]["node_uuid"],
                    pair_id=count)
                temp_input.save()
                analysis.workflow_data_input_maps.add(temp_input)
                analysis.save()

    # keeping new reference to analysis_status
    analysis_status = AnalysisStatus.objects.create(analysis=analysis)
    analysis_status.save()

    # call function via analysis_manager
    run_analysis.delay(analysis.uuid)

    return HttpResponse(reverse('analysis-status', args=(analysis.uuid,)))


def create_noderelationship(request):
    """ajax function for creating noderelationships based on multiple node sets
    """
    logger.debug("analysis_manager.views create_noderelationship called")
    logger.debug(json.dumps(request.POST, indent=4))
    if request.is_ajax():
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
            logger.error('create_noderelationship: failed b/c no field '
                         'selected for defining Node Relationships')
        # get study uuid
        assay_uuid = request.POST.getlist('assay_uuid')[0]
        study_uuid = request.POST.getlist('study_uuid')[0]
        study = Study.objects.get(uuid=study_uuid)
        # TODO: catch if study or data set don't exist
        study = Study.objects.get(uuid=study_uuid)
        assay = Assay.objects.get(uuid=assay_uuid)
        # Need to deal w/ limits on current solr queries
        # solr results
        curr_node_dict1 = curr_node_set1.solr_query_components
        curr_node_dict1 = json.loads(curr_node_dict1)
        curr_node_dict2 = curr_node_set2.solr_query_components
        curr_node_dict2 = json.loads(curr_node_dict2)
        # getting list of node uuids based on input solr query
        node_set_solr1 = get_solr_results(
            curr_node_set1.solr_query,
            selected_mode=curr_node_dict1['documentSelectionBlacklistMode'],
            selected_nodes=curr_node_dict1['documentSelection']
        )
        node_set_solr2 = get_solr_results(
            curr_node_set2.solr_query,
            selected_mode=curr_node_dict2['documentSelectionBlacklistMode'],
            selected_nodes=curr_node_dict2['documentSelection']
        )
        # all fields from the first solr query
        all_fields = node_set_solr1['responseHeader']['params']['fl']
        # actual documents retreived from solr response
        node_set_results1 = node_set_solr1['response']['docs']
        node_set_results2 = node_set_solr2['response']['docs']
        # match between 2 nodesets for a given column
        nodes_set_match, match_info = match_nodesets(
            node_set_results1, node_set_results2, diff_fields, all_fields)

        logger.debug("MAKING RELATIONSHIPS NOW")
        logger.debug(json.dumps(nodes_set_match, indent=4))
        logger.debug(nodes_set_match)
        # TODO: need to include names, descriptions, summary
        if nr_name.strip() == '':
            nr_name = "{} - {} {}".format(
                curr_node_set1.name, curr_node_set2.name, str(
                    get_aware_local_time())
            )
        if nr_description.strip() == '':
            nr_description = "{} - {} {}".format(
                curr_node_set1.name, curr_node_set2.name, str(
                    get_aware_local_time())
            )
        new_relationship = NodeRelationship(node_set_1=curr_node_set1,
                                            node_set_2=curr_node_set2,
                                            study=study,
                                            assay=assay,
                                            name=nr_name,
                                            summary=nr_description)
        new_relationship.save()

        for i in range(len(nodes_set_match)):
            node1 = Node.objects.get(uuid=nodes_set_match[i]['uuid_1'])
            node2 = Node.objects.get(uuid=nodes_set_match[i]['uuid_2'])
            new_pair = NodePair(node1=node1, node2=node2, group=i+1)
            new_pair.save()
            new_relationship.node_pairs.add(new_pair)

        return HttpResponse(json.dumps(match_info, indent=4),
                            mimetype='application/json')


class DictDiffer(object):
    """A dictionary difference calculator
    Originally posted as: http://stackoverflow.com/a/1165552
    Calculate the difference between two dictionaries as:
    (1) items added
    (2) items removed
    (3) keys same in both but changed values
    (4) keys same in both and unchanged values
    """
    def __init__(self, current_dict, past_dict):
        self.current_dict, self.past_dict = current_dict, past_dict
        self.current_keys, self.past_keys = [
            set(d.keys()) for d in (current_dict, past_dict)
            ]
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


def match_nodesets(ns1, ns2, diff_f, all_f, rel_type=None):
    """Helper function for matching 2 nodesets solr results"""
    logger.debug("analysis_manager.views match_nodesets called")
    ret_info = {}
    ret_info['total'] = str(len(ns1) + len(ns2))
    ret_info['node1_count'] = str(len(ns1))
    ret_info['node2_count'] = str(len(ns2))

    best_list = []
    template = {'uuid_1': '', 'uuid_2': '', 'frac': 0.0, 'same': 0, 'diff': 0,
                'tot': 0, 'sel_tot': 0, 'sel': 0, 'sel_frac': 0.0}
    i = 0
    for node1 in ns1:
        best_node = template.copy()
        j = 0
        for node2 in ns2:
            if node1['uuid'] != node2['uuid']:
                temp_node = template.copy()
                temp_node['uuid_1'] = node1['uuid']
                temp_node['uuid_2'] = node2['uuid']
                # counts differences for list of fields
                for df in diff_f:
                    # if the given column matches between Nodesets
                    if node1[df] == node2[df]:
                        best_node = temp_node
            j += 1
        best_list.append(best_node)
        i += 1
    # matches
    ret_info['matches'] = str(len(best_list))
    return best_list, ret_info
