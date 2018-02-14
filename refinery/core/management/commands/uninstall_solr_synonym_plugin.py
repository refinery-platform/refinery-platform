import logging
import os
import sys
import time

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Uninstall a custom synonym analyzer for Solr. This is a micro
    wrapper for removing a Solr plugin.
    """

    def add_arguments(self, parser):
        parser.add_argument('name')
        parser.add_argument(
            '-n',
            '--name',
            action='store',
            dest='name',
            type='string',
            help='Name of the JAR file to be uninstalled'
                 'e.g. myLib.jar'
        )

    def handle(self, *args, **options):
        if settings.SOLR_SYNONYMS:
            sys.stderr.write('Disable synonym search in settings first')
            exit()

        if not options['name']:
            sys.stderr.write('Filename of plugin not given')
            exit()

        sys.stdout.write('Uninstall Solr Plugin...')
        start = time.time()

        try:
            os.remove(settings.SOLR_LIB_DIR + '/' + options['name'])
        except OSError:
            sys.stderr.write('File not found')
            exit()

        end = time.time()
        minutes = int(round((end - start) // 60))
        seconds = int(round((end - start) % 60))
        sys.stdout.write('Install Solr Plugin... {} min and {} sec'.format(
                minutes,
                seconds
            )
        )
        sys.stdout.write('Restart Solr now: `sudo service solr restart`')
