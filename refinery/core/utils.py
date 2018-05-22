from __future__ import absolute_import

import ast
import logging
import sys
from urlparse import urljoin

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import connection
from django.utils import timezone

from celery.task import task
from guardian.shortcuts import get_objects_for_user
from guardian.utils import get_anonymous_user
import py2neo
import requests
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
def add_data_set_to_neo4j(dataset, user_id):
    """Add a node in Neo4J for a dataset and give the owner read access.
    Note: Neo4J manages read access only.
    """

    logger.info(
        'Add dataset (uuid: %s) to Neo4J and give read access to user ' +
        '(id: %s)', dataset.uuid, user_id
    )

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    # Get annotations of the data_set
    annotations = get_data_set_annotations(dataset.uuid)
    annotations = normalize_annotation_ont_ids(annotations)

    try:
        tx = graph.cypher.begin()

        # Add dataset and annotations to Neo4J
        counter = 1

        statement_name = (
            "MATCH (term:Class {name:{ont_id}}) "
            "MERGE (ds:DataSet {id:{ds_id},uuid:{ds_uuid}}) "
            "MERGE ds-[:`annotated_with`]->term"
        )

        statement_uri = (
            "MATCH (term:Class {uri:{uri}}) "
            "MERGE (ds:DataSet {id:{ds_id},uuid:{ds_uuid}}) "
            "MERGE ds-[:`annotated_with`]->term"
        )

        for annotation in annotations:
            if 'value_uri' in annotation:
                tx.append(
                    statement_uri,
                    {
                        'uri': annotation['value_uri'],
                        'ds_id': dataset.id,
                        'ds_uuid': dataset.uuid
                    }
                )
            else:
                tx.append(
                    statement_name,
                    {
                        'ont_id': (
                            annotation['value_source'] +
                            ':' +
                            annotation['value_accession']
                        ),
                        'ds_id': dataset.id,
                        'ds_uuid': dataset.uuid
                    }
                )

            # Send batches of 50 Cypher queries to Neo4J
            if counter % 50 == 0:
                tx.process()

            # Increase counter
            counter += 1

        # Link owner with the added dataset
        statement = (
            "MATCH (ds:DataSet {uuid:{ds_uuid}}) "
            "MERGE (u:User {id:{user_id}}) "
            "MERGE (ds)<-[:`read_access`]-(u)"
        )

        tx.append(
            statement,
            {
                'ds_uuid': dataset.uuid,
                'user_id': user_id
            }
        )

        tx.commit()
    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to add read access to data set (uuid: %s) for user '
            '(uuid: %s) to Neo4J. Exception: %s', dataset.uuid, user_id, e
        )


@skip_if_test_run
def add_read_access_in_neo4j(dataset_uuids, user_ids):
    """Give one or more user read access to one or more datasets.
    """

    logger.info(
        'Adding read access for users (%s) to data sets (%s) in Neo4J',
        user_ids, dataset_uuids
    )

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    statement = (
        "MATCH (ds:DataSet {uuid:{dataset_uuid}}) "
        "MERGE (u:User {id:{user_id}}) "
        "MERGE (ds)<-[:`read_access`]-(u)"
    )

    try:
        tx = graph.cypher.begin()

        for dataset_uuid in dataset_uuids:
            for user_id in user_ids:
                tx.append(
                    statement,
                    {
                        'dataset_uuid': dataset_uuid,
                        'user_id': user_id,

                    }
                )

        tx.commit()
    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to add read access for users (%s) to data sets '
            '(uuids: %s) to Neo4J. Exception: %s', user_ids, dataset_uuids, e
        )


@skip_if_test_run
def async_update_annotation_sets_neo4j(username=''):
    """
    Trigger async update of annotation sets in Neo4J
    AnnotationSets link Ontology classes from accessible DataSets with users
    """
    _update_annotation_sets_neo4j.delay(username)


@skip_if_test_run
def sync_update_annotation_sets_neo4j(username=''):
    """
    Trigger async update of annotation sets in Neo4J
    AnnotationSets link Ontology classes from accessible DataSets with users
    """
    _update_annotation_sets_neo4j(username)


@task()
def _update_annotation_sets_neo4j(username):
    logger.info(
        'Updating annotation sets for "%s" (If username is empty, updates for '
        'all users) in Neo4J.',
        username
    )

    try:
        requests.post(
            urljoin(
                urljoin(
                    settings.NEO4J_BASE_URL,
                    'ontology/unmanaged/annotations/'
                ), username
            )
        )

    except Exception as e:
        logger.error(
            'Neo4J couldn\'t prepare annotation sets. Error %s', e
        )


@skip_if_test_run
def add_or_update_user_to_neo4j(user_id, username):
    """
    Add or update a user in Neo4J
    """

    logger.info(
        'Adding user (%s) with username (%s) in Neo4J',
        user_id, username
    )

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    statement = (
        "MERGE (u:User {id:{id}}) "
        "SET u.name = {name}"
    )

    try:
        graph.cypher.execute(
            statement,
            {
                'id': user_id,
                'name': username

            }
        )

    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to add user (%s) Exception: %s', user_id, e
        )


@skip_if_test_run
def delete_user_in_neo4j(user_id, user_name):
    """
    Delete a user and its annotation set in Neo4J
    """

    logger.info('Delete user (ID: %s Name: %s) in Neo4J', user_id, user_name)

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    # Remove the user and all its relationships
    statement = (
        'MATCH (u:User {id:{id}}) OPTIONAL MATCH (u)-[r]-() DELETE u, r'
    )

    try:
        graph.cypher.execute(statement, {'id': user_id})

    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to delete user (%s). Exception: %s', user_id, e
        )

    # Remove the user's annotation set
    statement = (
        'MATCH (n:AnnotationSets{user}) REMOVE n:AnnotationSets{user}'
        .format(user=user_name.capitalize())
    )

    try:
        graph.cypher.execute(statement)

    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to delete the user\'s (%s) annotation set. Exception: %s',
            user_id, e
        )


@skip_if_test_run
def remove_read_access_in_neo4j(dataset_uuids, user_ids):
    """Remove read access for one or multiple users to one or more datasets.
    """

    logger.debug(
        'Removing read access from users (%s) to data set (uuid: %s) in Neo4J',
        user_ids, dataset_uuids
    )

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    statement = (
        "MATCH (ds:DataSet {uuid:{dataset_uuid}}), (u:User {id:{user_id}}) "
        "MATCH (ds)<-[r:`read_access`]-(u) "
        "DELETE r"
    )

    try:
        tx = graph.cypher.begin()

        for dataset_uuid in dataset_uuids:
            for user_id in user_ids:
                tx.append(
                    statement,
                    {
                        'dataset_uuid': dataset_uuid,
                        'user_id': user_id
                    }
                )

        tx.commit()
    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to remove read access from users (%s) for datasets '
            '(uuids: %s) from Neo4J. Exception: %s', user_ids, dataset_uuids, e
        )


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


@skip_if_test_run
def delete_data_set_neo4j(dataset_uuid):
    """Remove a dataset's related node in Neo4J.
    """

    logger.debug('Deleted data set (uuid: %s) in Neo4J', dataset_uuid)

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    statement = (
        "MATCH (ds:DataSet {uuid:{dataset_uuid}}) "
        "OPTIONAL MATCH (ds)-[r]-() "
        "DELETE ds, r"
    )

    try:
        graph.cypher.execute(
            statement,
            parameters={
                'dataset_uuid': dataset_uuid
            }
        )
    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to remove dataset (uuid: %s) from Neo4J. '
            'Exception: %s', dataset_uuid, e
        )


@skip_if_test_run
def delete_ontology_from_neo4j(acronym):
    """Remove ontology and all class nodes that belong exclusively to an
    ontology.

    Class nodes associated to multiple ontology will not be deleted.
    """

    logger.debug('Deleting ontology (acronym: %s) from Neo4J', acronym)

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    # Only matches class nodes that exclusively belong to an ontology.
    # Note: Using an ordinary string replacement in addition to a parameterized
    # query is due to the inability of Neo4J to parameterize label...
    # http://stackoverflow.com/a/24274528/981933
    # Note 2: The reason for using the oldschool, e.g. `%`, way of composing
    # the string is due to the fact that `format()` conflicts with the
    # parameterized Cypher query.
    statement_nodes = (
        "MATCH (c:Class:%s) "
        "WHERE ALL (l IN labels(c) WHERE l='Class' OR l={acronym})"
        "OPTIONAL MATCH (c)-[r]-() "
        "DELETE c, r"
    ) % acronym

    statement_ontology = "MATCH (o:Ontology {acronym:{acronym}}) DELETE o"

    try:
        graph.cypher.execute(
            statement_nodes,
            parameters={
                'acronym': acronym
            }
        )
        graph.cypher.execute(
            statement_ontology,
            parameters={
                'acronym': acronym
            }
        )
    except Exception as e:
        """ Cypher queries are expected to fail and raise an exception when
        Neo4J is not running or when transactional queries are not available
        (e.g. Travis CI doesn't support transactional queries yet)
        """
        logger.error(
            'Failed to remove ontology (acronym: %s) from Neo4J. '
            'Exception: %s', acronym, e
        )


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


def create_update_ontology(name, acronym, uri, version, owl2neo4j_version):
    """Creates or updates an ontology entry after importing.
    """

    ontology = core.models.Ontology.objects.filter(acronym=acronym)

    if not ontology:
        ontology = core.models.Ontology.objects.create(
            acronym=acronym,
            name=name,
            uri=uri,
            version=version,
            owl2neo4j_version=owl2neo4j_version
        )
        logger.info('Created %s', ontology)
    else:
        ontology = ontology[0]
        ontology.name = name
        ontology.uri = uri
        ontology.version = version
        ontology.import_date = timezone.now()
        ontology.owl2neo4j_version = owl2neo4j_version
        ontology.save()
        logger.info('Updated %s', ontology)


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


def get_resources_for_user(user, resource_type):
    return get_objects_for_user(
        user if user.is_authenticated()
        else get_anonymous_user(),
        which_default_read_perm(resource_type),
        accept_global_perms=accept_global_perms(resource_type)
    )


def which_default_read_perm(resource_type):
    if resource_type == 'dataset':
        return 'core.read_meta_dataset'
    return 'core.read_%s' % resource_type


# False, accept_global_perms will be ignored, which means that only object
# permissions will be checked.
def accept_global_perms(resource_type):
    if resource_type == 'dataset':
        return False
    return True
