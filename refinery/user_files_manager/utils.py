from django.contrib.auth.models import User

from guardian.shortcuts import get_objects_for_user

from core.utils import accept_global_perms
from data_set_manager.models import Assay, Study
from data_set_manager.utils import generate_solr_params


def generate_solr_params_for_user(params, user_id):
    """Creates the encoded solr params limiting results to one user.
    Keyword Argument
        params -- python dict or QueryDict
    Params/Solr Params
        is_annotation - metadata
        facet_count/facet - enables facet counts in query response, true/false
        offset - paginate, offset response
        limit/row - maximum number of documents
        field_limit - set of fields to return
        facet_field - specify a field which should be treated as a facet
        facet_filter - adds params to facet fields&fqs for filtering on fields
        facet_pivot - list of fields to pivot
        sort - Ordering include field name, whitespace, & asc or desc.
        fq - filter query
     """

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        user = User.get_anonymous()

    # will update to allow users to view read_meta datasets then we can
    # update to use get_resources_for_user method in core/utils
    datasets = get_objects_for_user(user,
                                    'core.read_dataset',
                                    accept_global_perms=accept_global_perms(
                                        'dataset'
                                    ))

    assay_uuids = []
    for dataset in datasets:
        investigation_link = dataset.get_latest_investigation_link()
        if investigation_link is None:
            continue
            # It's not an error not to have data,
            # but there's nothing more to do here.
        investigation = investigation_link.investigation

        study_ids = Study.objects.filter(
            investigation=investigation
        ).values_list('id', flat=True)

        assay_uuids += Assay.objects.filter(
            study_id__in=study_ids
        ).values_list('uuid', flat=True)

    return generate_solr_params(params,
                                assay_uuids=assay_uuids,
                                facets_from_config=True)
