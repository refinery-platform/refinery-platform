import logging
# import requests

# from guardian.shortcuts import get_objects_for_user
from django.http import (HttpResponseNotAllowed, Response)
# from data_set_manager.models import (Study, Assay)
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

        # data = []
        # datasets = get_objects_for_user(request.user, "core.read_dataset")
        # for dataset in datasets:
        #     version_details = dataset.get_version_details()
        #     study = Study.objects.get(
        #         investigation=version_details.investigation
        #     )
        #     assay = Assay.objects.get(
        #         study=study
        #     )
        #     response = requests.get(
        #         "http://192.168.50.50:8000/api/v2/assays/{}/files/".format(
        #             assay.uuid
        #         )
        #     )
        #     data.append(response.content)
        # return JsonResponse(data, safe=False)
    else:
        return HttpResponseNotAllowed(['GET'])
