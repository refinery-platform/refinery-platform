from optparse import make_option

from django.core.management.base import BaseCommand, CommandError

from data_set_manager.single_file_column_parser import SingleFileColumnParser
from data_set_manager.tasks import create_dataset


class Command(BaseCommand):
    help = ("Takes a tab-delimited file in Refinery default format as input,"
            "parses, and %s inputs it into the database")

    option_list = BaseCommand.option_list + (
        make_option('--username',
                    action='store',
                    type='string',
                    help='(Required) username of the owner of this data set'
                    ),
        make_option('--title',
                    action='store',
                    type='string',
                    help='(Required) name of this data set'
                    ),
        make_option('--file_name',
                    action='store',
                    type='string',
                    help='(Required) absolute path to the file being parsed'
                    ),
        make_option('--base_path',
                    action='store',
                    type='string',
                    default="",
                    help='base path of your data file paths if using relative '
                         'locations'
                    ),
        make_option('--slug',
                    action='store',
                    type='string',
                    default=None,
                    help='shortcut name for dataset URL; can only contain '
                         'alpha-numeric characters and \'_\''
                    ),
        make_option('--is_public',
                    action='store_true',
                    default=False,
                    help='flag for whether this data set will be visible to '
                         'the public'
                    ),
    )

    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """
    def handle(self, *args, **options):

        # set pre-defined options for the Refinery default tabular file format
        options['source_column_index'] = "0"  # source = filename
        options['data_file_column'] = "1"
        options['auxiliary_file_column'] = "2"
        options['species_column'] = "3"
        options['genome_build_column'] = "4"
        options['annotation_column'] = "5"
        options['data_file_permanent'] = True
        required = ['username', 'title', 'file_name']
        for arg in required:
            if not options[arg]:
                raise CommandError('%s was not provided.' % arg)

        parser = SingleFileColumnParser()
        parser.source_column_index = [
            int(x.strip()) for x in options['source_column_index'].split(",")]
        parser.column_index_separator = "/"
        parser.file_base_path = options['base_path']
        # fixed settings
        parser.file_column_index = int(options['data_file_column'])
        parser.auxiliary_file_column_index = int(
            options['auxiliary_file_column'])
        parser.species_column_index = int(options['species_column'])
        parser.genome_build_column_index = int(options['genome_build_column'])
        parser.annotation_column_index = int(options['annotation_column'])
        parser.file_permanent = options['data_file_permanent']
        investigation = parser.run(options['file_name'])
        investigation.title = options['title']
        investigation.save()
        create_dataset(investigation.uuid, options['username'],
                       dataset_title=options['title'], slug=options['slug'],
                       public=options['is_public'])
