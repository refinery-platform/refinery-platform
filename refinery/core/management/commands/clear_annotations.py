import logging
import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand

import py2neo

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Clear datasets and annotations, i.e. delete all dataset nodes and
    user nodes as well as their relations.
    """

    def handle(self, *args, **options):
        graph = py2neo.Graph(
            urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
        )

        graph.cypher.execute(
            'MATCH (ds:DataSet) OPTIONAL MATCH (ds)-[r]-() DELETE ds, r',
        )

        graph.cypher.execute(
            'MATCH (u:User) OPTIONAL MATCH (u)-[r]-() DELETE u, r',
        )
