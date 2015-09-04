import logging
import sys
import subprocess
from optparse import make_option
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """
    Imports an OWL ontology into Neo4J using the Owl2neo4J converter [1].

    Usage: python manage.py import_ontology -o <Path> -n <String> -a <String>
           [--verbosity]

     -a,--abbreviation   Ontology abbreviation (E.g. go)
     -n,--name           Ontology name (E.g. Gene Ontology)
     -o,--ontology       Path to OWL file (E.g. /vagrant/transfer/GO.owl)

    Note: All options are required!

    [1]: https://github.com/flekschas/owl2neo4j
    """

    option_list = BaseCommand.option_list + (
        make_option(
            '-o',
            '--ontology',
            action='store',
            dest='ontology_file',
            type='string',
            help='OWL ontology file, e.g. /vagrant/transfer/GO.owl'
        ),
        make_option(
            '-n',
            '--name',
            action='store',
            dest='ontology_name',
            type='string',
            help='Ontology full name, e.g. Gene Ontology'
        ),
        make_option(
            '-a',
            '--abbreviation',
            action='store',
            dest='ontology_abbr',
            type='string',
            help='Ontology abbreviation or prefix, e.g. go'
        ),
    )

    def handle(self, *args, **options):
        try:
            subprocess.check_call(
                [
                    'java',
                    '-jar',
                    settings.LIBS_DIR + '/owl2neo4j.jar',
                    '-o ' + str(options['ontology_file'] or ''),
                    '-n "' + str(options['ontology_name'] or '') + '"',
                    '-a ' + str(options['ontology_abbr'] or ''),
                    '-s ' + settings.NEO4J_BASE_URL
                ]
            )
        except Exception, e:
            logger.error(e.message)
            sys.exit(1)
