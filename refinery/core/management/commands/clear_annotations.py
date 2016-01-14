import logging
import py2neo
import urlparse
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Clear datasets and annotations, i.e. delete all dataset nodes and
    user nodes as well as their relations.
    """

    def handle(self, *args, **options):
        graph = py2neo.Graph(
            urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
        )

        tx = graph.cypher.begin()

        cql = (
            'MATCH (ds:DataSet), (u:User) ' +
            'OPTIONAL MATCH (ds)-[r1]-(), (u)-[r2]-() ' +
            'DELETE ds, u, r1, r2'
        )

        tx.append(cql)

        tx.commit()
