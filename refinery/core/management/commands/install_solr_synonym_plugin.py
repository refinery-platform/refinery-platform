import logging
import shutil
import sys
import time

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Install a custom synonym analyzer for Solr. This is a micro
    wrapper for moving the compiled JAR to Solr's lib location.
    """

    def add_arguments(self, parser):
        parser.add_argument(
            '-j',
            '--jar',
            action='store',
            dest='jar',
            help='Path to JAR file e.g. /vagrant/transfer/myLib.jar'
        )

    def handle(self, *args, **options):
        if not settings.SOLR_SYNONYMS:
            sys.stdout.write('Enable synonym search in settings first')
            exit()

        if not options['jar']:
            sys.stderr.write('JAR file not given')
            exit()

        sys.stdout.write('Install Solr Plugin...')
        start = time.time()

        shutil.copy(options['jar'], settings.SOLR_LIB_DIR + '/')

        end = time.time()
        minutes = int(round((end - start) // 60))
        seconds = int(round((end - start) % 60))
        sys.stdout.write(
            'Install Solr Plugin... {} min and {} sec'.format(
                minutes,
                seconds
            )
        )
        sys.stdout.write('Restart Solr now: `sudo service solr restart`')
