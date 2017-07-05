import csv
import logging

from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext

from rest_framework.response import Response
from rest_framework.views import APIView

from data_set_manager.utils import (format_solr_response,
                                    generate_solr_params_for_user, search_solr)

logger = logging.getLogger(__name__)


def user_files(request):
    return render_to_response('core/user_files.html', {},
                              context_instance=RequestContext(request))


def user_files_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="user-files.csv"'

    writer = csv.writer(response)
    writer.writerow(['First row', 'Foo', 'Bar', 'Baz'])
    writer.writerow(['Second row', 'A', 'B', 'C', '"Testing"', "It's working"])

    return response


class UserFiles(APIView):
    def get(self, request):
        params = request.query_params

        solr_params = generate_solr_params_for_user(
                params,
                user_id=request.user.id
        )
        if solr_params is None:
            return Response({})
            # TODO: Make this look like an empty solr response

        solr_response = search_solr(solr_params, 'data_set_manager')
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)
