import logging
import requests

from guardian.shortcuts import get_objects_for_user
from django.http import (HttpResponseNotAllowed, JsonResponse)
from data_set_manager.models import (Study, Assay)

logger = logging.getLogger(__name__)


def user_files(request):
    if request.method == 'GET':
        data = []
        datasets = get_objects_for_user(request.user, "core.read_dataset")
        for dataset in datasets:
            version_details = dataset.get_version_details()
            study = Study.objects.get(
                investigation=version_details.investigation
            )
            assay = Assay.objects.get(
                study=study
            )
            response = requests.get(
                "http://192.168.50.50:8000/api/v2/assays/{}/files/".format(
                    assay.uuid
                )
            )
            data.append(response.content)
        return JsonResponse(data, safe=False)
    else:
        return HttpResponseNotAllowed(['GET'])
