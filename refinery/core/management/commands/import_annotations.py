import logging
import py2neo
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from core.models import DataSet
from itertools import chain

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Annotate available ontology terms with datasets.
    """

    def query_db(self):
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

        cursor.execute(sql)

        desc = cursor.description

        return [
            dict(zip([col[0] for col in desc], row))
            for row in cursor.fetchall()
        ]

    def normalize_ont_ids(self, annotations):
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

    def push_annotations_to_neo4j(self, annotations):
        # We currently disabled authentication as Neo4J is only accessible
        # locally.
        # py2neo.authenticate(settings.NEO4J_BASE_URL)

        # Connects to `http://localhost:7474/db/data/` by default.
        graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

        # Begin transaction
        tx = graph.cypher.begin()

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

        # Commit transaction
        tx.commit()

    def push_users(self):
        datasets = DataSet.objects.all()

        graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

        tx = graph.cypher.begin()

        statement_user = (
            "MERGE (u:User {id:{user_id}, name:{user_name}}) WITH u "
            "MATCH (ds:DataSet {uuid:{ds_uuid}})"
            "MERGE (ds)<-[:`read_access`]-(u)"
        )

        for dataset in datasets:
            users = [dataset.get_owner()]
            groups = dataset.get_groups()

            # Collect all users per group
            for group in groups:
                users = list(chain(users, group['group'].user_set.all()))

            for user in users:
                tx.append(
                    statement_user,
                    {
                        'user_id': user.id,
                        'user_name': str(user),
                        'ds_uuid': dataset.uuid
                    }
                )

            tx.process()

        tx.commit()

    def handle(self, *args, **options):
        annotations = self.query_db()
        annotations = self.normalize_ont_ids(annotations)
        self.push_annotations_to_neo4j(annotations)
        self.push_users()
