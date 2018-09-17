from __future__ import absolute_import

import json
import logging
import subprocess
import sys
import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand

import py2neo

from ...utils import create_update_ontology

logger = logging.getLogger(__name__)
root_logger = logging.getLogger()


class Command(BaseCommand):
    help = """Imports an OWL ontology into Neo4J using the Owl2Neo4J converter
    from https://github.com/flekschas/owl2neo4j.
    """

    def add_arguments(self, parser):
        parser.add_argument('verbosity', type=int)
        parser.add_argument('ontology_file')
        parser.add_argument('ontology_abbr')
        parser.add_argument('ontology_name')
        parser.add_argument('batch_import_file')
        parser.add_argument(
            '-b',
            '--batch',
            action='store',
            dest='batch_import_file',
            help='Batch import definition file, e.g. '
                 '/vagrant/transfer/import.json'
        )
        parser.add_argument(
            '-o',
            '--ontology',
            action='store',
            dest='ontology_file',
            help='OWL ontology file, e.g. /vagrant/transfer/GO.owl'
        )
        parser.add_argument(
            '-n',
            '--name',
            action='store',
            dest='ontology_name',
            help='Ontology full name, e.g. Gene Ontology'
        )
        parser.add_argument(
            '-a',
            '--abbreviation',
            action='store',
            dest='ontology_abbr',
            help='Ontology abbreviation or prefix, e.g. GO'
        )
        parser.add_argument(
            '--eqp',
            action='store',
            dest='eqp',
            help=('Existencial quantification property, e.g. ' +
                  'http://purl.obolibrary.org/obo/RO_0002202')
        )

    def handle(self, *args, **options):
        verbosity = options['verbosity']

        if verbosity == 0:
            logger.setLevel(logging.ERROR)
            root_logger.setLevel(logging.ERROR)
        elif verbosity == 1:  # default
            logger.setLevel(logging.WARNING)
            root_logger.setLevel(logging.WARNING)
        elif verbosity > 1:
            logger.setLevel(logging.INFO)
            root_logger.setLevel(logging.INFO)
        if verbosity > 2:
            logger.setLevel(logging.DEBUG)
            root_logger.setLevel(logging.DEBUG)

        if not options['ontology_file']:
            options['ontology_file'] = ''

        # Wrap strings in double quotes in case they contain white spaces.
        if options['ontology_abbr']:
            options['ontology_abbr'] = options['ontology_abbr'].upper()
            ontology_abbr = '"' + options['ontology_abbr'] + '"'
        else:
            ontology_abbr = ''

        if options['ontology_name']:
            ontology_name = '"' + options['ontology_name'] + '"'
        else:
            ontology_name = ''

        if options['eqp']:
            options['eqp'] = '-eqp ' + options['eqp']
        else:
            options['eqp'] = ''

        # Check if constraints have already been added or add them
        try:
            graph = py2neo.Graph(
                urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
            )

            for constraint in settings.NEO4J_CONSTRAINTS:
                existing_constraints = graph.schema.get_uniqueness_constraints(
                    constraint['label']
                )
                existing_indices = graph.schema.get_indexes(
                    constraint['label']
                )
                for prop in constraint['properties']:
                    if prop['unique']:
                        if prop['name'] not in existing_constraints:
                            graph.schema.create_uniqueness_constraint(
                                constraint['label'],
                                prop['name']
                            )
                    else:
                        if prop['name'] not in existing_indices:
                            graph.schema.create_index(
                                constraint['label'],
                                prop['name']
                            )
        except Exception as e:
            logger.error(e)
            sys.exit(1)

        if options['batch_import_file']:
            cmd = 'java -jar -DentityExpansionLimit={eel} '\
                '{lib}/owl2neo4j.jar -b {batch} {verbosity}'.format(
                    eel=settings.JAVA_ENTITY_EXPANSION_LIMIT,
                    lib=settings.LIBS_DIR,
                    batch=options['batch_import_file'],
                    verbosity=('-v' if verbosity == 2 else '')
                )
        else:
            cmd = 'java -jar -DentityExpansionLimit={eel} '\
                '{lib}/owl2neo4j.jar -o {ontology} -n {name} -a {abbr} ' \
                '{eqp} -s {server} {verbosity}'.format(
                    eel=settings.JAVA_ENTITY_EXPANSION_LIMIT,
                    lib=settings.LIBS_DIR,
                    ontology=options['ontology_file'],
                    name=ontology_name,
                    abbr=ontology_abbr,
                    eqp=options['eqp'],
                    server=settings.NEO4J_BASE_URL,
                    verbosity=('-v' if verbosity == 2 else '')
                )

        logger.debug('Call Owl2Neo4J: %s', cmd)
        try:
            # Note that `owl2neo4j.jar` handles all other possible errors.
            if options['verbosity'] > 0:
                subprocess.check_call(cmd, shell=True)
            else:
                subprocess.check_output(cmd, shell=True)
        except Exception as e:
            logger.error(e)
            sys.exit(1)

        # Get Owl2Neo4J version
        owl2neo4j_version = None
        try:
            cmd = 'java -jar {lib}/owl2neo4j.jar --version'.format(
                    lib=settings.LIBS_DIR,
                )
            owl2neo4j_version = subprocess.check_output(
                cmd, shell=True
            ).rstrip()
        except Exception as e:
            logger.error(e)
            sys.exit(1)

        if options['batch_import_file']:
            with open(options['batch_import_file']) as json_file:
                ontologies = json.load(json_file)['ontologies']
        else:
            ontologies = [{
                "o": options['ontology_file'],
                "n": options['ontology_name'],
                "a": options['ontology_abbr']
            }]

        try:
            # Connects to `http://localhost:7474/db/data/` by default.
            graph = py2neo.Graph(
                urlparse.urljoin(settings.NEO4J_BASE_URL, 'db/data')
            )

            for ontology in ontologies:
                uri = graph.cypher.execute_one(
                    'MATCH (o:Ontology {acronym:{acronym}}) RETURN o.uri',
                    parameters={
                        'acronym': ontology['a']
                    }
                )

                version = graph.cypher.execute_one(
                    'MATCH (o:Ontology {acronym:{acronym}}) RETURN o.version',
                    parameters={
                        'acronym': ontology['a']
                    }
                )

                if not uri:
                    raise Exception(
                        'No ontology with the given name was found. It is ' +
                        'most likely that the actual import into Neo4J failed.'
                    )

                create_update_ontology(
                    ontology['n'],
                    ontology['a'],
                    uri,
                    version,
                    owl2neo4j_version
                )
        except Exception as e:
            logger.error(e)
            sys.exit(1)
