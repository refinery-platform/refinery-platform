import logging
import time
import os
from optparse import make_option
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Uninstall a custom synonym analyzer for Solr. This is a micro
    wrapper for removing a Solr plugin.
    """

    option_list = BaseCommand.option_list + (
        make_option(
            '-n',
            '--name',
            action='store',
            dest='name',
            type='string',
            help='Name of the JAR file to be uninstalled'
                 'e.g. myLib.jar'
        ),
    )

    def handle(self, *args, **options):
        if settings.SOLR_SYNONYMS:
            print(
                u'\033[91m' +
                u'Disable synonym search in settings first' +
                u'\033[0m'
            )
            exit()

        if not options['name']:
            print(
                u'\033[91m' +
                u'Filename of plugin not given' +
                u'\033[0m'
            )
            exit()

        print('Uninstall Solr Plugin...')
        start = time.time()

        try:
            os.remove(settings.SOLR_LIB_DIR + '/' + options['name'])
        except OSError:
            print(
                u'\033[91m' +
                u'File not found' +
                u'\033[0m'
            )
            exit()

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
