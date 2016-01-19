from __future__ import absolute_import
import logging
import py2neo
import core
import datetime
import urlparse
import requests
import json
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth.models import User
from django.db import connection
from django.utils.http import urlquote

from .search_indexes import DataSetIndex
from data_set_manager.search_indexes import NodeIndex
from data_set_manager.models import AttributeOrder
from core.serializers import AttributeOrderSerializer


logger = logging.getLogger(__name__)


def update_data_set_index(data_set):
    """Update a dataset's corresponding document in Solr.
    """

    logger.info('Updated data set (uuid: %s) index', data_set.uuid)
    DataSetIndex().update_object(data_set, using='core')


def add_data_set_to_neo4j(dataset_uuid, user_id):
    """Add a node in Neo4J for a dataset and give the owner read access.
    Note: Neo4J manages read access only.
    """

    logger.info(
        'Add dataset (uuid: %s) to Neo4J and give read access to user ' +
        '(id: %s)', dataset_uuid, user_id
    )

    graph = py2neo.Graph(urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data'))

    # Get annotations of the data_set
    annotations = get_data_set_annotations(dataset_uuid)
    annotations = normalize_annotation_ont_ids(annotations)

    try:
        tx = graph.cypher.begin()

        # Add dataset and annotations to Neo4J
        counter = 1

        statement_name = (
            "MATCH (term:Class {name:{ont_id}}) "
            "MERGE (ds:DataSet {uuid:{ds_uuid}}) "
            "MERGE ds-[:`annotated_with`]->term"
        )

        statement_uri = (
            "MATCH (term:Class {uri:{uri}}) "
            "MERGE (ds:DataSet {uuid:{ds_uuid}}) "
            "MERGE ds-[:`annotated_with`]->term"
        )

        for annotation in annotations:
            if 'value_uri' in annotation:
                tx.append(
                    statement_uri,
                    {
                        'uri': annotation['value_uri'],
                        'ds_uuid': annotation['data_set_uuid']
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
                        'ds_uuid': annotation['data_set_uuid']
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
                'ds_uuid': dataset_uuid,
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
            '(uuid: %s) to Neo4J. Exception: %s', dataset_uuid, user_id, e
        )


def add_read_access_in_neo4j(dataset_uuids, user_ids):
    """Give one or more user read access to one or more datasets.
    """

    logger.info(
        'Adding read access for users (%s) to data sets (%s) in Neo4J',
        user_ids, dataset_uuids
    )

    graph = py2neo.Graph(urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data'))

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
            'Failed to add read access for users (%s) to data sets '
            '(uuids: %s) to Neo4J. Exception: %s', user_ids, dataset_uuids, e
        )


def remove_read_access_in_neo4j(dataset_uuids, user_ids):
    """Remove read access for one or multiple users to one or more datasets.
    """

    logger.debug(
        'Removing read access from users (%s) to data set (uuid: %s) in Neo4J',
        user_ids, dataset_uuids
    )

    graph = py2neo.Graph(urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data'))

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


def delete_data_set_index(data_set):
    """Remove a dataset's related document from Solr's index.
    """

    logger.debug('Deleted data set (uuid: %s) index', data_set.uuid)
    DataSetIndex().remove_object(data_set, using='core')


def delete_data_set_neo4j(dataset_uuid):
    """Remove a dataset's related node in Neo4J.
    """

    logger.debug('Deleted data set (uuid: %s) in Neo4J', dataset_uuid)

    graph = py2neo.Graph(urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data'))

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


def delete_ontology_from_neo4j(acronym):
    """Remove ontology and all class nodes that belong exclusively to an
    ontology.

    Class nodes associated to multiple ontology will not be deleted.
    """

    logger.debug('Deleting ontology (acronym: %s) from Neo4J', acronym)

    graph = py2neo.Graph(urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data'))

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

    new_annotations = []
    for annotation in annotations:
        underscore_pos = annotation['value_accession'].rfind('_')
        if underscore_pos >= 0:
            annotation['value_accession'] = \
                annotation['value_accession'][(underscore_pos + 1):]
            new_annotations.append(annotation)
            continue

        hash_pos = annotation['value_accession'].rfind('#')
        if hash_pos >= 0:
            annotation['value_accession'] = \
                annotation['value_accession'][(hash_pos + 1):]
            new_annotations.append(annotation)
            continue

        if annotation['value_source'] == 'CL':
            annotation['value_accession'] = \
                annotation['value_accession'].zfill(7)
            continue
    return new_annotations


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
                attr.value_source NOT LIKE ''

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
                attr.value_source NOT LIKE ''

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
            'term': row[1],
            'count': row[2]
        })

    return response


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
        ontology.import_date = datetime.datetime.now()
        ontology.owl2neo4j_version = owl2neo4j_version
        ontology.save()
        logger.info('Updated %s', ontology)


def delete_analysis_index(node_instance):
    """Remove a Analysis' related document from Solr's index.
    """
    NodeIndex().remove_object(node_instance, using='data_set_manager')
    logger.debug('Deleted Analysis\' NodeIndex with (uuid: %s)',
                 node_instance.uuid)


def invalidate_cached_object(instance):
    try:
        cache.delete_many(['{}-{}'.format(user.id, instance.__class__.__name__)
                           for user in User.objects.all()])

    except Exception as e:
        logger.debug("Could not delete %s from cache" %
                     instance.__class__.__name__, e)


def parse_facet_fields(query):
    """Returns a list of facet fields."""
    query_json = json.loads(query)
    docs_list = query_json['response']['docs']
    facet_list = docs_list[0].keys()
    filtered_facet_list = filter_facet_fields(facet_list)

    return filtered_facet_list


def filter_facet_fields(facet_list):
    """Returns a filtered facet field list."""
    hidden_fields = ["uuid", "id", "django_id", "file_uuid", "study_uuid",
                     "assay_uuid", "type", "is_annotation", "species",
                     "genome_build", "name", "django_ct"]
    filtered_facet_list = []

    for field in facet_list:
        if field not in hidden_fields:
            filtered_facet_list.append(field)

    return filtered_facet_list


def generate_facet_fields_query(facet_fields):
    """Return facet_field query (str).
        Solr requirs facet fields to be separated"""
    query = ""
    for field in facet_fields:
        query = ''.join([query, '&facet.field=', field])

    return query


def get_facet_fields_query(params):
    """Returns a facet_field_query by making a solr request and parsing fields
    params"""
    temp_params = urlquote(params, safe='=& ')
    full_response = search_solr(temp_params, 'data_set_manager')
    facet_field = parse_facet_fields(full_response)
    facet_field_query = generate_facet_fields_query(facet_field)
    return facet_field_query


def generate_solr_params(params, assay_uuid):
    """Creates the encoded solr params requiring only an assay or study uuid.
    Keyword Argument
        params -- python dict or QueryDict
    Params/Solr Params
        is_annotation - metadata
        facet_sort - ordering of the facet field constraints, (count or index)
        facet_count/facet - enables facet counts in query response, true/false
        start - paginate, offset response
        limit/row - maximum number of documents
        study_uuid/assay_uuid - unique ids
        field_limit - set of fields to return
        facet_field - specify a field which should be treated as a facet
        facet_pivot - list of fields to pivot
        sort - Ordering include field name, whitespace, & asc or desc.
        fq - filter query
     """

    file_types = 'fq=type:("Raw Data File" OR ' \
                 '"Derived Data File" OR ' \
                 '"Array Data File" OR ' \
                 '"Derived Array Data File" OR ' \
                 '"Array Data Matrix File" OR' \
                 '"Derived Array Data Matrix File")'

    is_annotation = params.get('is_annotation', default='false')
    facet_sort = params.get('facet.sort', default='count')
    facet_count = params.get('facet.count', default='true')
    start = params.get('start', default='0')
    row = params.get('limit', default='20')
    field_limit = params.get('field.limit', default=None)
    facet_field = params.get('facet.field', default=None)
    facet_pivot = params.get('facet.pivot', default=None)
    sort = params.get('sort', default=None)

    fixed_solr_params = \
        '&'.join([file_types,
                  'fq=is_annotation:%s' % is_annotation,
                  'start=%s' % start,
                  'rows=%s' % row,
                  'q=django_ct:data_set_manager.node&wt=json',
                  'facet=%s' % facet_count,
                  'facet.limit=-1',
                  'facet.sort= %s' % facet_sort])

    solr_params = ''.join(['fq=assay_uuid:', assay_uuid])

    if facet_field is not None:
        split_facet_fields = generate_facet_fields_query(
                facet_field.split(','))
        solr_params = ''.join([solr_params, split_facet_fields])
    else:
        attributes_str = AttributeOrder.objects.filter(assay__uuid=assay_uuid)
        attributes = AttributeOrderSerializer(attributes_str, many=True)
        filtered_attributes = parse_attributes(attributes.data)
        # url_params = '&'.join([solr_params, fixed_solr_params])
        # facet_field_query = get_facet_fields_query(url_params)
        solr_params = ''.join([solr_params, filtered_attributes])

    if field_limit is not None:
        solr_params = ''.join([solr_params, '&fl=', field_limit])

    if facet_pivot is not None:
        solr_params = ''.join([solr_params, '&facet.pivot=', facet_pivot])

    if sort is not None:
        solr_params = ''.join([solr_params, '&sort=', sort])

    url = '&'.join([solr_params, fixed_solr_params])
    encoded_solr_params = urlquote(url, safe='=& ')

    return encoded_solr_params


def parse_attributes(attributes):
    query = ""
    for field in attributes:
        is_facet = field.get("is_facet")
        if is_facet:
            query = ''.join([query, '&facet.field=', field.get("solr_field")])

    return query


def search_solr(encoded_params, core):
    """Returns solr full_response content by making a solr request
    Keyword Argument:
        encoded_params -  Expect the params to be url-ready (using urlquote)
        core - Specify which node
    """
    url_portion = '/'.join([core, "select"])
    url = urlparse.urljoin(settings.REFINERY_SOLR_BASE_URL, url_portion)
    full_response = requests.get(url, params=encoded_params)
    response = full_response.content

    return response
