from __future__ import absolute_import
import logging
import py2neo
from django.conf import settings
from django.db import connection

from .search_indexes import DataSetIndex


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

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

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
            if ('value_uri' in annotation):
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
            if (counter % 50 == 0):
                tx.process()

            # Increase counter
            counter = counter + 1

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
    except Exception, e:
        logger.error(
            'Failed to add read access to data set (uuid: %s) in Neo4J. '
            'Exception: %s', e
        )


def add_read_access_in_neo4j(dataset_uuids, user_ids):
    """Give one or more user read access to one or more datasets.
    """

    logger.info(
        'Adding read access for users (%s) to data sets (%s) in Neo4J',
        user_ids, dataset_uuids
    )

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

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
    except Exception, e:
        logger.error(
            'Failed to add read access to data set (uuid: %s) in Neo4J. '
            'Exception: %s', e
        )


def remove_read_access_in_neo4j(dataset_uuids, user_ids):
    """Remove read access for one or multiple users to one or more datasets.
    """

    logger.debug(
        'Removing read access from users (%s) to data set (uuid: %s) in Neo4J',
        user_ids, dataset_uuids
    )

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

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
    except Exception, e:
        logger.error(
            'Failed to remove read access from dataset (uuid: %s) in Neo4J. '
            'Exception: %s', e
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

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

    statement = (
        "MATCH (ds:DataSet {uuid:{dataset_uuid}}) "
        "OPTIONAL MATCH (ds)-[r]-() "
        "DELETE n, r"
    )

    try:
        tx = graph.cypher.begin()

        tx.append(
            statement,
            {
                'dataset_uuid': dataset_uuid
            }
        )

        tx.commit()
    except Exception, e:
        logger.error(
            'Failed to remove dataset (uuid: %s) in Neo4J. '
            'Exception: %s', dataset_uuid, e
        )


def normalize_annotation_ont_ids(annotations):
    """Normalize ontology id across annotations. The background is that some
    annotations provide a URI, some a ontology id in form of IDSPACE:ID and
    some only provide the ID.
    """

    new_annotations = []
    for annotation in annotations:
        underscore_pos = annotation['value_accession'].rfind('_')
        if (underscore_pos >= 0):
            annotation['value_accession'] = \
                annotation['value_accession'][(underscore_pos + 1):]
            new_annotations.append(annotation)
            continue

        hash_pos = annotation['value_accession'].rfind('#')
        if (hash_pos >= 0):
            annotation['value_accession'] = \
                annotation['value_accession'][(hash_pos + 1):]
            new_annotations.append(annotation)
            continue

        if (annotation['value_source'] == 'CL'):
            annotation['value_accession'] = \
                annotation['value_accession'].zfill(7)
            continue
    return new_annotations


def get_data_set_annotations(dataset_uuid):
    """Extract ontology annotaions from the database for all or a specific
    datasets.
    """

    cursor = connection.cursor()

    sql = """SELECT
        data_set.uuid AS data_set_uuid,
        data_set.id AS data_set_id,
        annotated_study.investigation_id,
        annotated_study.study_id,
        annotated_study.assay_id,
        annotated_study.id AS node_id,
        annotated_study.file_uuid,
        annotated_study.type,
        annotated_study.subtype,
        annotated_study.value,
        annotated_study.value_source,
        annotated_study.value_accession
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
                node.id,
                node.study_id,
                node.type,
                node.file_uuid,
                node.assay_id,
                attr.subtype,
                attr.value,
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
            ) AS annotated_node
            ON
            annotated_node.study_id = study.nodecollection_ptr_id
        ) AS annotated_study
        ON
        data_set.investigation_id = annotated_study.investigation_id
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
