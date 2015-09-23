import logging
import py2neo
from django.conf import settings
from django.core.management.base import BaseCommand
from core.models import DataSet
from core.utils import normalize_annotation_ont_ids, get_data_set_annotations
from itertools import chain

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Annotate available ontology terms with datasets.
    """

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
        annotations = get_data_set_annotations(None)
        annotations = normalize_annotation_ont_ids(annotations)
        self.push_annotations_to_neo4j(annotations)
        self.push_users()
