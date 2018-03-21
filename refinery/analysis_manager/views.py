import json
import logging

from django.contrib.auth.decorators import login_required
from django.http import (
    HttpResponse, HttpResponseBadRequest, HttpResponseForbidden,
    HttpResponseNotAllowed, HttpResponseServerError, JsonResponse
)

from guardian.shortcuts import get_perms

from core.models import Analysis, ExtendedGroup

from .models import AnalysisStatus

logger = logging.getLogger(__name__)


def analysis_status(request, uuid):
    """Returns analysis status"""
    if request.method == 'GET':
        try:
            analysis = Analysis.objects.get(uuid=uuid)
        except (Analysis.DoesNotExist,
                Analysis.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpResponseBadRequest(e)

        public_group = ExtendedGroup.objects.public_group()
        if request.user.has_perm('core.read_meta_dataset', analysis.data_set)\
                or 'read_meta_dataset' in get_perms(public_group,
                                                    analysis.data_set):
            try:
                status = AnalysisStatus.objects.get(analysis=analysis)
            except (AnalysisStatus.DoesNotExist,
                    AnalysisStatus.MultipleObjectsReturned) as e:
                logger.error(e)
                return HttpResponseBadRequest(e)

            ret_json = {
                'refineryImport': status.refinery_import_state(),
                'galaxyAnalysis': status.galaxy_analysis_state(),
                'galaxyExport': status.galaxy_export_state(),
                'overall': analysis.get_status(),
                'galaxyImport': status.galaxy_file_import_state()
            }
            logger.debug("Analysis status for '%s': %s",
                         analysis.name, json.dumps(ret_json))
            return JsonResponse(ret_json)

        return HttpResponseForbidden("User is not authorized to access {}"
                                     .format(analysis))
    return HttpResponseNotAllowed(['GET'])


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
