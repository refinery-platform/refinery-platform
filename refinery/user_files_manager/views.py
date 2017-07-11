import csv
from json import dumps, loads
import logging

from django.conf import settings
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
    solr_response = _get_solr(request.GET, request.user.id)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="user-files.csv"'

    cols = settings.USER_FILES_COLUMNS.split(',')

    writer = csv.writer(response)
    writer.writerow(cols)

    docs = loads(solr_response)['response']['docs']
    for doc in docs:
        row = []
        for col in cols:
            row.append(doc.get(col + '_Characteristics_generic_s') or
                       doc.get(col + '_Factor_Value_generic_s') or '')
        writer.writerow(row)

    return response


class UserFiles(APIView):
    def get(self, request):
        solr_response = _get_solr(request.query_params, request.user.id)
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)


def _get_solr(params, user_id):
    solr_params = generate_solr_params_for_user(
        params,
        user_id=user_id)
    if solr_params is None:
        return dumps({
            'responseHeader': {},
            'response': {
                'docs': []
            }
        })

    return search_solr(solr_params, 'data_set_manager')
