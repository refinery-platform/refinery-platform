import logging
from django.http import HttpResponseNotAllowed
from rest_framework.response import Response
from data_set_manager.utils import (
    search_solr, format_solr_response,
    generate_solr_params_for_user)
from rest_framework.decorators import api_view

logger = logging.getLogger(__name__)


@api_view()
def user_files(request):
    if request.method == 'GET':
        params = request.GET

        solr_params = generate_solr_params_for_user(params, user=request.user)
        solr_response = search_solr(solr_params, 'data_set_manager')
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)
    else:
        return HttpResponseNotAllowed(['GET'])
