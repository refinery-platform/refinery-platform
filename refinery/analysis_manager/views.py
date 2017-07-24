import json
import logging
from urlparse import urlparse

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.urlresolvers import reverse
from django.http import (HttpResponse, HttpResponseBadRequest,
                         HttpResponseForbidden, HttpResponseNotAllowed,
                         HttpResponseServerError)
from django.shortcuts import render_to_response
from django.template import RequestContext

from core.models import (Analysis, NodePair, NodeRelationship, NodeSet,
                         Workflow, WorkflowEngine)
from core.utils import get_aware_local_time
from core.views import custom_error_page
from data_set_manager.models import Assay, Node, Study
from tool_manager.models import Tool
from workflow_manager.tasks import get_workflows

from .models import AnalysisStatus
from .tasks import run_analysis
from .utils import (create_analysis, get_solr_results, match_nodesets,
                    validate_analysis_config)

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
        logger.error("Analysis with UUID '%s' does not exist", uuid)
        return HttpResponse(custom_error_page(request, '404.html', {}),
                            status='404')

    # TODO: handle MultipleObjectsReturned exception
    try:
        status = AnalysisStatus.objects.get(analysis=analysis)
    except AnalysisStatus.DoesNotExist:
        logger.error("AnalysisStatus object does not exist for Analysis '%s'",
                     analysis.name)
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
            'galaxyAnalysis': status.galaxy_analysis_state(),
            'galaxyExport': status.galaxy_export_state(),
            'overall': analysis.get_status(),
        }
        try:
            Tool.objects.get(analysis=analysis)
        except (Tool.DoesNotExist, Tool.MultipleObjectsReturned) as e:
            logger.debug(
                "Could not fetch Tool with analysis: %s %s",
                analysis,
                e
            )
            ret_json['galaxyImport'] = status.galaxy_file_import_state()
        else:
            ret_json['galaxyImport'] = (
                status.tool_based_galaxy_file_import_state()
            )

        logger.debug("Analysis status for '%s': %s",
                     analysis.name, json.dumps(ret_json))
        return HttpResponse(json.dumps(ret_json, indent=4),
                            content_type='application/javascript')
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
    if request.method == 'POST':
        try:
            uuid = json.loads(request.body)['uuid']
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
                logger.info("Analysis '%s' was cancelled", uuid)
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
            content_type='application/javascript')
    else:
        return HttpResponse(status=400)


def get_workflow_data_input_map(request, workflow_uuid):
    """Function for AJAX returning WorkflowDataInputMap for a specified
    workflow_uuid
    """
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    data = serializers.serialize('json', curr_workflow.data_inputs.all())
    if request.is_ajax():
        return HttpResponse(data, content_type='application/javascript')
    else:
        return HttpResponse(data, content_type='application/json')


def run(request):
    """Run analysis, return URL of the analysis status page
    Needs re-factoring
    """
    allowed_methods = ['POST']
    logger.debug("Received request to start analysis")

    if not request.is_ajax():
        return HttpResponseBadRequest("Not an XMLHttpRequest")

    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)

    analysis_config = json.loads(request.body)
    analysis_config["user_id"] = request.user.id

    try:
        validate_analysis_config(analysis_config)
    except RuntimeError as e:
        return HttpResponseBadRequest(e)
    else:
        try:
            analysis = create_analysis(analysis_config)
        except RuntimeError as e:
            return HttpResponseBadRequest(e)

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
                            content_type='application/json')
