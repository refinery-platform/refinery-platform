from __future__ import absolute_import
import logging


import py2neo
from django.core.mail import send_mail

import core
from urlparse import urlparse, urljoin

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.contrib.auth.models import User
from django.db import connection
from django.utils import timezone

from .search_indexes import DataSetIndex
from data_set_manager.search_indexes import NodeIndex


logger = logging.getLogger(__name__)


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
        logger.error("Could not update DataSetIndex:", e)


def add_data_set_to_neo4j(dataset_uuid, user_id):
    """Add a node in Neo4J for a dataset and give the owner read access.
    Note: Neo4J manages read access only.
    """

    logger.info(
        'Add dataset (uuid: %s) to Neo4J and give read access to user ' +
        '(id: %s)', dataset_uuid, user_id
    )

    graph = py2neo.Graph(urljoin(settings.NEO4J_BASE_URL, 'db/data'))

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
        logger.error("Could not delete from DataSetIndex:", e)


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
            'term': row[1],
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
        ontology.import_date = get_aware_local_time()
        ontology.owl2neo4j_version = owl2neo4j_version
        ontology.save()
        logger.info('Updated %s', ontology)


def delete_analysis_index(node_instance):
    """Remove a Analysis' related document from Solr's index.
    """
    try:
        NodeIndex().remove_object(node_instance, using='data_set_manager')
        logger.debug('Deleted Analysis\' NodeIndex with (uuid: %s)',
                     node_instance.uuid)
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not delete from NodeIndex:", e)


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


def get_full_url(relative_url):
    """ Creates a full url (including hostname) from a given relative url
    :param relative_url: Relative url to build a full url from
    :type  relative_url: String.
    :returns A fully constructed url from the Site model's domain, the Django
    setting: REFINERY_URL_SCHEME, and the passed in relative url or None if
    something breaks
    """

    # If url passed in is already a full url, simply return that
    if is_url(relative_url):
        return relative_url

    # Being defensive is good
    try:
        current_site = Site.objects.get_current()
    except Site.DoesNotExist:
        logger.error(
            "Cannot provide a full URL: no Sites configured or "
            "SITE_ID is not set correctly")
        return None

    try:
        url_scheme = settings.REFINERY_URL_SCHEME
    except AttributeError:
        logger.error(
            "Couldnt fetch the 'REFINERY_URL_SCHEME' Django setting. Is it "
            "set properly???")
        return None

    # Construct the url
    full_url = '{}://{}{}'.format(
        url_scheme, current_site.domain, relative_url
    )

    return full_url


def is_url(string):
    """Check if a given string is a URL"""
    return urlparse(string).scheme != ""


def get_aware_local_time():
    # Returns the local time, model field default helper
    return timezone.localtime(timezone.now())


def email_admin(subject, message):
        """
        Sends an email to the admin email configured in our Django Settings
        """
        send_mail(subject, message, settings.SERVER_EMAIL,
                  [settings.ADMINS[0][1]])
