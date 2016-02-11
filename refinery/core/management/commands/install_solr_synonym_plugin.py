import logging
import time
import shutil
from optparse import make_option
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Install a custom synonym analyzer for Solr. This is a micro
    wrapper for moving the compiled JAR to Solr's lib location.
    """

    option_list = BaseCommand.option_list + (
        make_option(
            '-j',
            '--jar',
            action='store',
            dest='jar',
            type='string',
            help='Path to JAR file'
                 'e.g. /vagrant/transfer/myLib.jar'
        ),
    )

    def handle(self, *args, **options):
        if not settings.SOLR_SYNONYMS:
            print(
                u'\033[91m' +
                u'Enable synonym search in settings first' +
                u'\033[0m'
            )
            exit()

        if not options['jar']:
            print(
                u'\033[91m' +
                u'JAR file not given' +
                u'\033[0m'
            )
            exit()

        print('Install Solr Plugin...')
        start = time.time()

        shutil.copy(options['jar'], settings.SOLR_LIB_DIR + '/')

        end = time.time()
        minutes = int(round((end - start) // 60))
        seconds = int(round((end - start) % 60))
        print(
            u'Install Solr Plugin... ' +
            u'\033[32m\u2713\033[0m ' +
            u'\033[2m({} min and {} sec)\033[22m'.format(
                minutes,
                seconds
            )
        )
        print(
            u'\033[93m' +
            u'\033[4m\033[1mIMPORTANT\033[21m\033[24m  ' +
            u'Restart Solr now: `sudo service solr restart`' +
            u'\033[0m'
        )
