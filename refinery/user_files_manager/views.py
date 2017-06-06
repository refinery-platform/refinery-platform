import logging

from rest_framework.views import APIView
from rest_framework.response import Response

from data_set_manager.utils import (search_solr, format_solr_response,
                                    generate_solr_params_for_user)


logger = logging.getLogger(__name__)


class UserFiles(APIView):
    def get(self, request):
        params = request.query_params

        solr_params = generate_solr_params_for_user(params, user=request.user)
        solr_response = search_solr(solr_params, 'data_set_manager')
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)
