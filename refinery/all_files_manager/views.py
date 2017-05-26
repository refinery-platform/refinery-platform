import logging

from django.core import serializers
from django.http import (HttpResponse, HttpResponseNotAllowed)

logger = logging.getLogger(__name__)


def all_files(request):
    if request.method == 'GET':
        data = serializers.serialize('json', {})
        return HttpResponse(data, content_type='application/json')
    else:
        return HttpResponseNotAllowed(['GET'])
