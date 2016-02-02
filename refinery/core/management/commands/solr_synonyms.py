import logging
import time
import os
from optparse import make_option
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = """Add, update or remove synonyms for Solr. If no synonym file is
    specified but an identifier is given, the synonyms related to this
    identifier will be removed.
    """

    option_list = BaseCommand.option_list + (
        make_option(
            '-i',
            '--id',
            action='store',
            dest='identifier',
            type='string',
            help='Synonyms identifier. Used for proper updating or deleting.' +
                 'Note: identifiers are caseinsensitive!' +
                 'E.g. "MyFancyAnimalSynonymCollection" or "MeSH"'
        ),
        make_option(
            '-s',
            '--synonyms',
            action='store',
            dest='synonyms',
            type='string',
            help='Path to a file containing Solr compatible synonyms.'
                 'E.g. /vagrant/transfer/myFancySynonymCollection.txt'
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

        if not options['identifier']:
            print(
                u'\033[91m' +
                u'Identifier file not given' +
                u'\033[0m'
            )
            exit()

        id = options['identifier'].lower()
        update = False
        removal = False if options['synonyms'] else True

        print('Solr synonyms...')
        start = time.time()

        # Open or create the synonyms file
        with open(settings.SOLR_CUSTOM_SYNONYMS_FILE + '-tmp', 'a+') as tmp:
            # Since `a+` moves the pointer to the end of the file we need to
            # move the pointer back to the beginning
            tmp.seek(0)

            rewrite = False
            # Open existing file
            with open(settings.SOLR_CUSTOM_SYNONYMS_FILE, 'a+') as f:
                f.seek(0)
                for line in f:
                    if line[:1] == '#':
                        # Do not carry over existing synonyms of the same ID
                        if line.rstrip() == '# ID: ' + id:
                            rewrite = False
                            update = True
                        else:
                            rewrite = True

                    if rewrite:
                        # Write already existing lines to the new temporary
                        # file
                        tmp.write(line)

            # Add new or updated synonyms
            if options['synonyms']:
                with open(options['synonyms'], 'r') as f:
                    tmp.write('# ID: ' + id + '\n')
                    for line in f:
                        tmp.write(line)

        # Remove existing file
        os.remove(settings.SOLR_CUSTOM_SYNONYMS_FILE)

        # Rename temporary file
        os.rename(
            settings.SOLR_CUSTOM_SYNONYMS_FILE + '-tmp',
            settings.SOLR_CUSTOM_SYNONYMS_FILE
        )

        end = time.time()
        minutes = int(round((end - start) // 60))
        seconds = int(round((end - start) % 60))

        if removal:
            message = 'removed'
        elif update:
            message = 'updated'
        else:
            message = 'added'

        print(
            u'Solr synonyms have been ' + message + '. '
            u'\033[32m\u2713\033[0m ' +
            u'\033[2m({} min and {} sec)\033[22m'.format(
                minutes,
                seconds
            )
        )
