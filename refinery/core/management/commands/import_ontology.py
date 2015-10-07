import logging
import sys
import subprocess
import py2neo
from optparse import make_option
from django.conf import settings
from django.core.management.base import BaseCommand
from core.tasks import create_update_ontology

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Imports an OWL ontology into Neo4J using the Owl2Neo4J converter
    from https://github.com/flekschas/owl2neo4j.
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
            help='Ontology abbreviation or prefix, e.g. GO'
        ),
        make_option(
            '--eqp',
            action='store',
            dest='eqp',
            type='string',
            help=('Existencial quantification property, e.g. ' +
                  'http://purl.obolibrary.org/obo/RO_0002202')
        ),
    )

    def handle(self, *args, **options):
        # Wrap strings in double quotes in case they contain white spaces.
        if not options['ontology_file']:
            options['ontology_file'] = ''

        if options['ontology_abbr']:
            options['ontology_abbr'] = options['ontology_abbr'].upper()
            options['ontology_abbr'] = '"' + options['ontology_abbr'] + '"'
        else:
            options['ontology_abbr'] = ''

        if options['ontology_name']:
            options['ontology_name'] = '"' + options['ontology_name'] + '"'
        else:
            options['ontology_name'] = ''

        if options['eqp']:
            options['eqp'] = '-eqp ' + options['eqp']
        else:
            options['eqp'] = ''

        try:
            cmd = 'java -jar -DentityExpansionLimit={eel} '\
                '{lib}/owl2neo4j.jar -o {ontology} -n {name} -a {abbr} ' \
                '{eqp} -s {server} {verbosity}'.format(
                    eel=settings.JAVA_ENTITY_EXPANSION_LIMIT,
                    lib=settings.LIBS_DIR,
                    ontology=options['ontology_file'],
                    name=options['ontology_name'],
                    abbr=options['ontology_abbr'],
                    eqp=options['eqp'],
                    server=settings.NEO4J_BASE_URL,
                    verbosity=('-v' if int(options['verbosity']) == 2 else '')
                )

            # Note that `owl2neo4j.jar` handles all other possible errors.
            if int(options['verbosity']) > 0:
                subprocess.check_call(cmd, shell=True)
            else:
                subprocess.check_output(cmd, shell=True)
        except Exception, e:
            logger.error(e.output)
            sys.exit(1)

        try:
            # Connects to `http://localhost:7474/db/data/` by default.
            graph = py2neo.Graph('{}/db/data/'.format(settings.NEO4J_BASE_URL))

            results = graph.cypher.execute(
                'MATCH (o:Ontology {acronym:{acronym}}) RETURN o',
                parameters={
                    'acronym': options['ontology_abbr']
                }
            )

            if len(results) == 1:
                base_uri = results[0]['uri']
            elif len(results) > 1:
                raise Exception(
                    'Multiple ontologies with the same name were found. ' +
                    'Please clean up the mess first!'
                )
            else:
                raise Exception(
                    'No ontology with the given name was found. It is most ' +
                    'likely that the actual import into Neo4J failed.'
                )

            create_update_ontology(
                options['ontology_name'],
                options['ontology_abbr'],
                base_uri
            )
        except Exception, e:
            logger.error(e.output)
            sys.exit(1)
