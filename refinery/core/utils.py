from __future__ import absolute_import
import logging
import py2neo
from django.conf import settings

from .search_indexes import DataSetIndex


logger = logging.getLogger(__name__)


def update_data_set_index(data_set):
    logger.debug('Updated data set (uuid: %s) index', data_set.uuid)
    DataSetIndex().update_object(data_set, using='core')


def add_data_set_to_neo4j(data_set, owner):
    logger.debug(
        'Adding read access to data set (uuid: %s) in Neo4J', data_set.uuid
    )

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

    try:
        tx = graph.cypher.begin()

        # Add dataset and annotations to Neo4J
        statement = (
            "MATCH (ds:DataSet {uuid:{ds_uuid}})"
            "MERGE (u:User {id:{user_id}})"
            "MERGE (ds)<-[:`read_access`]-(u)"
        )

        for user in group.user_set.all():
            tx.append(
                statement,
                {
                    'ds_uuid': data_set.uuid,
                    'user_id': owner.id
                }
            )

        # Link owner with the added dataset
        statement = (
            "MATCH (ds:DataSet {uuid:{ds_uuid}})"
            "MERGE (u:User {id:{user_id}})"
            "MERGE (ds)<-[:`read_access`]-(u)"
        )

        tx.append(
            statement,
            {
                'ds_uuid': data_set.uuid,
                'user_id': owner.id
            }
        )

        tx.commit()
    except Exception, e:
        logger.error(
            'Failed to add read access to data set (uuid: %s) in Neo4J. '
            'Exception: %s', e
        )


def add_read_access_in_neo4j(data_set, group):
    logger.debug(
        'Adding read access to data set (uuid: %s) in Neo4J', data_set.uuid
    )

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

    statement = (
        "MATCH (ds:DataSet {uuid:{ds_uuid}})"
        "MERGE (u:User {id:{user_id}})"
        "MERGE (ds)<-[:`read_access`]-(u)"
    )

    try:
        tx = graph.cypher.begin()

        for user in group.user_set.all():
            tx.append(
                statement,
                {
                    'ds_uuid': data_set.uuid,
                    'user_id': user.id
                }
            )

        tx.commit()
    except Exception, e:
        logger.error(
            'Failed to add read access to data set (uuid: %s) in Neo4J. '
            'Exception: %s', e
        )


def remove_read_access_in_neo4j(data_set, group):
    logger.debug(
        'Removing read access from data set (uuid: %s) in Neo4J', data_set.uuid
    )

    graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

    statement = (
        "MATCH (ds:DataSet {uuid:{ds_uuid}}), (u:User {id:{user_id}})"
        "MATCH (ds)<-[r:`read_access`]-(u)"
        "DELETE r"
    )

    try:
        tx = graph.cypher.begin()

        for user in group.user_set.all():
            tx.append(
                statement,
                {
                    'ds_uuid': data_set.uuid,
                    'user_id': user.id
                }
            )

        tx.commit()
    except Exception, e:
        logger.error(
            'Failed to remove read access from data set (uuid: %s) in Neo4J. '
            'Exception: %s', e
        )


def delete_data_set_index(data_set):
    logger.debug('Deleted data set (uuid: %s) index', data_set.uuid)
    DataSetIndex().remove_object(data_set, using='core')


def delete_data_set_neo4j(data_set):
    logger.debug('Deleted data set (uuid: %s) in Neo4J', data_set.uuid)
    DataSetIndex().remove_object(data_set, using='core')
