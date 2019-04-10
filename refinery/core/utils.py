from __future__ import absolute_import

import ast
from functools import wraps
import logging
import sys

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import connection
from django.http import Http404
from django.utils import timezone

import requests
from rest_framework.exceptions import APIException
from rest_framework.response import Response

import constants
# These imports go against our coding style guide, but are necessary for the
#  time being due to mutual import issues
import core
from core.search_indexes import DataSetIndex
import data_set_manager

logger = logging.getLogger(__name__)


def skip_if_test_run(func):
    """Decorator to be used on functions that don't necessarily need to
    be run during tests or CI i.e. Neo4J and Solr stuff tend to pollute
    log output
    """
    def func_wrapper(*args, **kwargs):
        if "test" in sys.argv:
                return
        else:
            return func(*args, **kwargs)
    return func_wrapper


@skip_if_test_run
def update_data_set_index(data_set):
    """Update a dataset's corresponding document in Solr.
    """

    logger.info('Updated data set (uuid: %s) index', data_set.uuid)
    try:
        DataSetIndex().update_object(data_set, using='core')
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not update DataSetIndex: %s", e)


@skip_if_test_run
def delete_data_set_index(data_set):
    """Remove a dataset's related document from Solr's index.
    """

    logger.debug('Deleted data set (uuid: %s) index', data_set.uuid)
    try:
        DataSetIndex().remove_object(data_set, using='core')
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not delete from DataSetIndex: %s", e)


def normalize_annotation_ont_ids(annotations):
    """Normalize ontology id across annotations. The background is that some
    annotations provide a URI, some a ontology id in form of IDSPACE:ID and
    some only provide the ID.
    """

    # Copy annotation list
    new_annotations = list(annotations)

    # Update new annotations in place
    for annotation in new_annotations:
        underscore_pos = annotation['value_accession'].rfind('_')
        if underscore_pos >= 0:
            annotation['value_accession'] = \
                annotation['value_accession'][(underscore_pos + 1):]

        hash_pos = annotation['value_accession'].rfind('#')
        if hash_pos >= 0:
            annotation['value_accession'] = \
                annotation['value_accession'][(hash_pos + 1):]

        if annotation['value_source'] == 'CL':
            annotation['value_accession'] = \
                annotation['value_accession'].zfill(7)

    return new_annotations


def normalize_annotation_uri(uri):
    """Normalize an ontology URI. Some ontologies defined
    ambiguous URIs which is...  Anyway, harmonizing them increases the mapping
    quality.
    """

    if (uri.startswith('http://purl.bioontology.org/ontology/NCBITAXON/')):
        return 'http://purl.obolibrary.org/obo/NCBITaxon_{}'.format(uri[47:])

    return uri


def normalize_annotation_uris(annotations):
    """Normalize multiple annotation ontology uris.
    """

    for annotation in annotations:
        annotation['value_accession'] = normalize_annotation_uri(
            annotation['value_accession']
        )

    return annotations


def get_data_set_annotations(dataset_uuid):
    """Extract ontology annotations from the database for all or a specific
    datasets.
    """

    cursor = connection.cursor()

    sql = """SELECT
        data_set.id AS data_set_id,
        data_set.uuid AS data_set_uuid,
        annotated_study.value_source,
        annotated_study.value_accession,
        COUNT(data_set.id) AS value_count
      FROM
        (
          SELECT
            core_dataset.uuid,
            core_dataset.id,
            investigation.investigation_id
          FROM
            core_dataset
            JOIN
            core_investigationlink AS investigation
            ON
            core_dataset.id = investigation.data_set_id
          {}
        ) AS data_set
        JOIN
        (
          SELECT
            study.investigation_id AS investigation_id,
            annotated_node.*
          FROM
            data_set_manager_study AS study
            JOIN
            (
              SELECT
                node.study_id,
                attr.value_source,
                attr.value_accession
              FROM
                data_set_manager_node AS node
                JOIN
                data_set_manager_attribute AS attr
                ON
                node.id = attr.node_id
              WHERE
                attr.value_source IS NOT NULL AND
                attr.value_source NOT LIKE '' AND (
                    attr.value_unit IS NULL OR
                    attr.value_unit = ''
                )

              UNION ALL

              SELECT
                study_id,
                measurement_source AS value_source,
                measurement_accession AS value_accession
              FROM
                data_set_manager_assay
              WHERE
                measurement_accession IS NOT NULL AND
                measurement_accession NOT LIKE ''

              UNION ALL

              SELECT
                study_id,
                technology_source AS value_source,
                technology_accession AS value_accession
              FROM
                data_set_manager_assay
              WHERE
                technology_accession IS NOT NULL AND
                technology_accession NOT LIKE ''

              UNION ALL

              SELECT
                study_id,
                type_source AS value_source,
                type_accession AS value_accession
              FROM
                data_set_manager_factor
              WHERE
                type_accession IS NOT NULL AND
                type_accession NOT LIKE ''
            ) AS annotated_node
            ON
            annotated_node.study_id = study.nodecollection_ptr_id
        ) AS annotated_study
        ON
        data_set.investigation_id = annotated_study.investigation_id
        GROUP BY
        data_set.id, data_set.uuid,
        annotated_study.value_source,
        annotated_study.value_accession
        """

    # Double string replacement, i.e. `sql` will be replace with a replacement
    # string for a data set id in case `data_set` has been passed. This is
    # needed as `cursor.execute()` only inserts escaped strings.
    ds = ''
    if dataset_uuid:
        ds = 'WHERE core_dataset.uuid = %s'

    sql = sql.format(ds)

    # According to the docs, `cursor.execute()` automatically escapes all
    # instances of `%s`.
    # https://docs.djangoproject.com/en/1.8/topics/db/sql/#connections-and-cursors
    if dataset_uuid:
        cursor.execute(sql, [dataset_uuid])
    else:
        cursor.execute(sql)

    desc = cursor.description

    return [
        dict(zip([col[0] for col in desc], row))
        for row in cursor.fetchall()
    ]


def get_data_sets_annotations(dataset_ids=[]):
    """Extract ontology annotations from the database for all or a specific
    datasets.
    """

    cursor = connection.cursor()

    sql = """SELECT
        data_set.id AS id,
        annotated_study.value_accession AS term_uri,
        COUNT(data_set.id) AS term_count
      FROM
        (
          SELECT
            core_dataset.uuid,
            core_dataset.id,
            investigation.investigation_id
          FROM
            core_dataset
            JOIN
            core_investigationlink AS investigation
            ON
            core_dataset.id = investigation.data_set_id
          {}
        ) AS data_set
        JOIN
        (
          SELECT
            study.investigation_id AS investigation_id,
            annotated_node.*
          FROM
            data_set_manager_study AS study
            JOIN
            (
              SELECT
                node.study_id,
                attr.value_accession
              FROM
                data_set_manager_node AS node
                JOIN
                data_set_manager_attribute AS attr
                ON
                node.id = attr.node_id
              WHERE
                attr.value_source IS NOT NULL AND
                attr.value_source NOT LIKE '' AND (
                    attr.value_unit IS NULL OR
                    attr.value_unit = ''
                )

              UNION ALL

              SELECT
                study_id,
                measurement_accession AS value_accession
              FROM
                data_set_manager_assay
              WHERE
                measurement_accession IS NOT NULL AND
                measurement_accession NOT LIKE ''

              UNION ALL

              SELECT
                study_id,
                technology_accession AS value_accession
              FROM
                data_set_manager_assay
              WHERE
                technology_accession IS NOT NULL AND
                technology_accession NOT LIKE ''
            ) AS annotated_node
            ON
            annotated_node.study_id = study.nodecollection_ptr_id
        ) AS annotated_study
        ON
        data_set.investigation_id = annotated_study.investigation_id
        GROUP BY data_set.id, annotated_study.value_accession
        """

    # Double string replacement, i.e. `sql` will be replace with a replacement
    # string for a data set id in case `data_set` has been passed. This is
    # needed as `cursor.execute()` only inserts escaped strings.
    ds = ''
    if len(dataset_ids):
        ds = (
            'WHERE core_dataset.id IN (' +
            ('%s, ' * len(dataset_ids))[:-2] +
            ')'
        )

    sql = sql.format(ds)

    # According to the docs, `cursor.execute()` automatically escapes all
    # instances of `%s`.
    # https://docs.djangoproject.com/en/1.8/topics/db/sql/#connections-and-cursors
    if len(dataset_ids):
        cursor.execute(sql, dataset_ids)
    else:
        cursor.execute(sql)

    response = {}

    for row in cursor.fetchall():
        if row[0] not in response:
            response[row[0]] = []

        response[row[0]].append({
            'term': normalize_annotation_uri(row[1]),
            'count': row[2]
        })

    return response


def get_all_data_sets_ids():
    return core.models.DataSet.objects.all().values('id')


@skip_if_test_run
def delete_analysis_index(node_instance):
    """Remove a Analysis' related document from Solr's index.
    """
    try:
        data_set_manager.search_indexes.NodeIndex().remove_object(
            node_instance, using='data_set_manager'
        )
        logger.debug('Deleted Analysis\' NodeIndex with (uuid: %s)',
                     node_instance.uuid)
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not delete from NodeIndex: %s", e)


def invalidate_cached_object(instance, is_test=False):
    """
        Removes cached objects for all users based on the class name of the
        instance passed.

        Ex: Given a DataSet instance, all possible cached objects holding
        DataSets will be deleted to represent the saving, updating,
        deletion, or perms change that was performed upon it.

        If the is_test flag is set, a new instance of a mockcache Client
        will be returned
    """
    if not is_test:
        try:
            cache.delete_many(['{}-{}'.format(user.id, instance.__class__.
                                              __name__)
                               for user in User.objects.all()])

        except Exception as e:
            logger.debug("Could not delete %s from cache" %
                         instance.__class__.__name__, e)
    else:
        from mockcache import Client
        mc = Client()
        return mc


def get_absolute_url(string):
    """Creates an absolute URL from a relative URL using the current Site
    domain and REFINERY_URL_SCHEME Django setting
    """
    if not string or is_absolute_url(string):
        return string

    try:
        current_site = Site.objects.get_current()
    except Site.DoesNotExist:
        logger.error("Can not construct a full URL: no Sites configured or "
                     "SITE_ID is invalid")
        return None

    return "{}://{}{}".format(
        settings.REFINERY_URL_SCHEME, current_site.domain, string
    )


def is_absolute_url(string):
    return string and '://' in string


def get_aware_local_time():
    # Returns the local time, model field default helper
    return timezone.localtime(timezone.now())


def email_admin(subject, message):
    """
    Sends an email to the admin email configured in our Django Settings
    """
    send_mail(subject, message, settings.SERVER_EMAIL,
              [settings.ADMINS[0][1]])


def filter_nodes_uuids_in_solr(assay_uuid, filter_out_uuids=[],
                               filter_attribute={}):
    """
    Helper method to create a current selection group which
    is default for all node_group list

    :param assay_uuid: unicode, string
    :param filter_out_uuids: array of unicode, string
    :param filter_attribute: object of attributes and their filtered fields
    :return: List of uuids
    """
    # Params required to filter solr_request to just get uuids for nodes
    params = {
        'attributes': 'uuid',
        'facets': 'uuid',
        'limit': constants.REFINERY_SOLR_DOC_LIMIT,
        'include_facet_count': 'false'
    }

    # Add attribute filters and facet params to generate solr_params
    if filter_attribute:
        params['filter_attribute'] = filter_attribute
        # unicode to object to grab keys
        if isinstance(filter_attribute, unicode):
            # handling unicode sent by swagger
            params['facets'] = ','.join(
                ast.literal_eval(filter_attribute).keys()
            )
        else:
            params['facets'] = ','.join(filter_attribute.keys())

    solr_params = data_set_manager.utils.generate_solr_params_for_assay(
        params, assay_uuid)
    # Only require solr filters if exception uuids are passed
    if filter_out_uuids:
        # node_arr = str(filter_out_uuids).split(',')
        str_nodes = (' OR ').join(filter_out_uuids)
        field_filter = "&fq=-uuid:({})".format(str_nodes)
        solr_params = ''.join([solr_params, field_filter])
    solr_response = data_set_manager.utils.search_solr(
        solr_params, 'data_set_manager')
    solr_reponse_json = data_set_manager.utils.format_solr_response(
        solr_response)
    uuid_list = []
    for node in solr_reponse_json.get('nodes'):
        uuid_list.append(node.get('uuid'))

    return uuid_list


def admin_ui_deletion(request, objects_to_delete, single_model=None):
    """
        Helper method to delete objects selected in the Django admin
        interface and display the proper message based on the status of
        their deletion
        :param objects_to_delete: iterable of Objects selected in admin UI,
        or a single object instance if `delete_model:admin_ui_deletion` is
        called with `single_model` having a truthy value
        :param request: the request Obj
        :param single_model: Set this to true when calling from a overridden
        `delete_model` method in the admin.py code
    """

    def create_delete_response_message(del_response):
        if del_response[0]:
            messages.success(request, del_response[1])
        else:
            messages.error(request, del_response[1])

    # If this method is triggered from an Admin UI 'delete_selected' call
    if not single_model:
        for instance in objects_to_delete.all():
            delete_response = instance.delete()
            create_delete_response_message(delete_response)

    # If this method is triggered from an Admin UI 'delete_model' call
    else:
        delete_response = objects_to_delete.delete()

        if not delete_response[0]:
            # Fix for multiple messages displaying
            messages.set_level(request, messages.ERROR)
            create_delete_response_message(delete_response)


def move_obj_to_front(obj_arr, match_key, match_value):
    """
        Helper method move the first obj matching to the front of the arr
        based on key and value
        :param objects_to_delete: iterable of Objects selected in admin UI,
        or a single object instance if `delete_model:admin_ui_deletion` is
        called with `single_model` having a truthy value
        :param obj_arr: An array of objects
        :param match_key: Key to match
        :param match_value: Value to match
    """
    modified_obj_arr = obj_arr
    for obj in obj_arr:
        if obj.get(match_key) == match_value:
            curr_index = obj_arr.index(obj)
            modified_obj_arr.insert(0, modified_obj_arr.pop(curr_index))
            break

    return modified_obj_arr


def api_error_response(error_message, http_status_code):
    """Return a standardized error for Django Rest Framework API calls"""
    return Response({'Error': error_message}, status=http_status_code)


def get_non_manager_groups_for_user(user):
    """
    :param user: model instance
    :return: array of (non-manager) ExtendedGroup objects
    """
    return user.groups.exclude(name__contains='Managers')


# False, accept_global_perms will be ignored, which means that only object
# permissions will be checked.
def accept_global_perms(resource_type):
    if resource_type == 'dataset':
        return False
    return True


def verify_recaptcha(view_function):
    @wraps(view_function)
    def _wrapped_view(request, *args, **kwargs):
        request.recaptcha_is_valid = False
        if request.method == 'POST':
            recaptcha_response = request.POST.get('g-recaptcha-response')
            data = {
                'secret': settings.REFINERY_GOOGLE_RECAPTCHA_SECRET_KEY,
                'response': recaptcha_response
            }
            result = requests.post(
                'https://www.google.com/recaptcha/api/siteverify', data=data
            ).json()
            if result['success']:
                request.recaptcha_is_valid = True
        return view_function(request, *args, **kwargs)
    return _wrapped_view


def get_data_set_for_view_set(uuid):
    try:
        return core.models.DataSet.objects.get(uuid=uuid)
    except core.models.DataSet.DoesNotExist as e:
        logger.error(e)
        raise Http404
    except core.models.DataSet.MultipleObjectsReturned as e:
        logger.error(e)
        raise APIException("Multiple dataSets returned for this request.")


def get_group_for_view_set(uuid):
    try:
        return core.models.ExtendedGroup.objects.get(uuid=uuid)
    except core.models.ExtendedGroup.DoesNotExist as e:
        logger.error(e)
        raise Http404
    except core.models.ExtendedGroup.MultipleObjectsReturned as e:
        logger.error(e)
        raise APIException("Multiple groups returned for this request.")
