import logging
from django.http import (HttpResponseNotAllowed, Response)
from .utils import (search_solr, format_solr_response,
                    generate_solr_params_for_user)

logger = logging.getLogger(__name__)


def user_files(request):
    if request.method == 'GET':
        params = request.query_params

        solr_params = generate_solr_params_for_user(params, user=request.user)
        solr_response = search_solr(solr_params, 'data_set_manager')
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)
    else:
        return HttpResponseNotAllowed(['GET'])
