import logging
import py2neo
import time
import urlparse
from optparse import make_option
from django.conf import settings
from django.core.management.base import BaseCommand
from core.models import DataSet, ExtendedGroup
from core.utils import normalize_annotation_ont_ids, get_data_set_annotations

logger = logging.getLogger(__name__)
root_logger = logging.getLogger()


class Command(BaseCommand):
    help = """Annotate available ontology terms with datasets.
    """

    option_list = BaseCommand.option_list + (
        make_option(
            '-c',
            '--clear',
            action='store_true',
            dest='clear',
            help='Clear annotations before import'
        ),
    )

    def push_annotations_to_neo4j(self, annotations):
        # We currently disabled authentication as Neo4J is only accessible
        # locally.
        # py2neo.authenticate(settings.NEO4J_BASE_URL)

        # Connects to `http://localhost:7474/db/data/` by default.
        graph = py2neo.Graph(
            urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
        )

        # Begin transaction
        tx = graph.cypher.begin()

        counter = 1

        statement_name = (
            "MATCH (term:Class {name:{ont_id}}) "
            "MERGE (ds:DataSet {id:{ds_id},uuid:{ds_uuid}}) "
            "MERGE ds-[r:`annotated_with`]->term "
            "SET r.count = {count}"
        )
        statement_uri = (
            "MATCH (term:Class {uri:{uri}}) "
            "MERGE (ds:DataSet {id:{ds_id},uuid:{ds_uuid}}) "
            "MERGE ds-[r:`annotated_with`]->term "
            "SET r.count = {count}"
        )

        for annotation in annotations:
            if ('value_uri' in annotation):
                tx.append(
                    statement_uri,
                    {
                        'uri': annotation['value_uri'],
                        'ds_id': annotation['data_set_id'],
                        'ds_uuid': annotation['data_set_uuid'],
                        'count': annotation['value_count']
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
                        'ds_id': annotation['data_set_id'],
                        'ds_uuid': annotation['data_set_uuid'],
                        'count': annotation['value_count']
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

        graph = py2neo.Graph(
            urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
        )

        tx = graph.cypher.begin()

        statement_user = (
            "MERGE (u:User {id:{user_id}, name:{user_name}}) WITH u "
            "MATCH (ds:DataSet {uuid:{ds_uuid}}) "
            "MERGE (ds)<-[:`read_access`]-(u)"
        )

        public_group_id = ExtendedGroup.objects.public_group().id

        for dataset in datasets:
            owner = dataset.get_owner()
            users = [{
                'id': owner.id,
                'name': str(owner)
            }]
            groups = dataset.get_groups()

            # Collect all users per group
            for group in groups:

                users += map(
                    lambda u: {'id': u.id, 'name': str(u)},
                    group['group'].user_set.all()
                )

                # We need to add an anonymous user so that people who haven't
                # logged in can still see some visualization.
                if group['group'].id is public_group_id:
                    users += [{
                        'id': -1,
                        'name': 'Anonymous'
                    }]

            for user in users:
                tx.append(
                    statement_user,
                    {
                        'user_id': user['id'],
                        'user_name': user['name'],
                        'ds_uuid': dataset.uuid
                    }
                )

            tx.process()

        tx.commit()

    def handle(self, *args, **options):
        verbosity = int(options['verbosity'])

        if verbosity == 0:
            root_logger.setLevel(logging.ERROR)
        elif verbosity == 1:  # default
            root_logger.setLevel(logging.WARNING)
        elif verbosity > 1:
            root_logger.setLevel(logging.INFO)
        if verbosity > 2:
            root_logger.setLevel(logging.DEBUG)

        if options['clear']:
            print('Clear existing annotations and users...')
            start = time.time()

            graph = py2neo.Graph(
                urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
            )

            graph.cypher.execute(
                'MATCH (ds:DataSet) OPTIONAL MATCH (ds)-[r]-() DELETE ds, r',
            )

            graph.cypher.execute(
                'MATCH (u:User) OPTIONAL MATCH (u)-[r]-() DELETE u, r',
            )

            end = time.time()
            minutes = int(round((end - start) // 60))
            seconds = int(round((end - start) % 60))
            print(
                u'Clear existing annotations and users... ' +
                u'\033[32m\u2713\033[0m ' +
                u'\033[2m({} min and {} sec)\033[22m'.format(
                    minutes,
                    seconds
                )
            )

        print('Import annotations...')

        start = time.time()

        annotations = get_data_set_annotations(None)
        annotations = normalize_annotation_ont_ids(annotations)
        self.push_annotations_to_neo4j(annotations)
        self.push_users()

        end = time.time()
        minutes = int(round((end - start) // 60))
        seconds = int(round((end - start) % 60))

        print(
            u'Import annotations... \033[32m\u2713\033[0m ' +
            u'\033[2m({} min and {} sec)\033[22m'.format(
                minutes,
                seconds
            )
        )
