import json
import logging
from urlparse import urlparse

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse
from django.http import (HttpResponse, HttpResponseBadRequest,
                         HttpResponseForbidden, HttpResponseNotAllowed,
                         HttpResponseServerError, JsonResponse)
from django.shortcuts import render_to_response
from django.template import RequestContext

from core.models import Analysis, Workflow, WorkflowEngine
from core.views import custom_error_page
from workflow_manager.tasks import get_workflows

from .models import AnalysisStatus
from .tasks import run_analysis
from .utils import create_analysis, validate_analysis_config

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
            'galaxyImport': status.galaxy_file_import_state()
        }
        logger.debug("Analysis status for '%s': %s",
                     analysis.name, json.dumps(ret_json))
        return JsonResponse(ret_json, content_type='application/javascript')
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

        return JsonResponse(workflows, content_type='application/javascript')
    return HttpResponse(status=400)


def get_workflow_data_input_map(request, workflow_uuid):
    """Function for AJAX returning WorkflowDataInputMap for a specified
    workflow_uuid
    """
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    if request.is_ajax():
        return JsonResponse(curr_workflow.data_inputs.all(),
                            content_type='application/javascript')
    else:
        return JsonResponse(curr_workflow.data_inputs.all())


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
