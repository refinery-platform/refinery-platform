import logging

from data_set_manager.utils import (format_solr_response,
                                    generate_solr_params_for_user, search_solr)

from django.shortcuts import render_to_response
from django.template import RequestContext

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (Assay, Study)


logger = logging.getLogger(__name__)


def user_files(request):
    return render_to_response('core/user_files.html', {},
                              context_instance=RequestContext(request))


class UserFiles(APIView):
    def get(self, request):
        params = request.query_params

        try:
            solr_params = generate_solr_params_for_user(
                params,
                user_uuid=request.user.uuid)
        except (Assay.DoesNotExist, Study.DoesNotExist):
            return Response({})
            # TODO: Make this look like an empty solr response

        solr_response = search_solr(solr_params, 'data_set_manager')
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)
