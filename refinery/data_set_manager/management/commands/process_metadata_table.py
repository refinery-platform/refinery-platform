from __future__ import absolute_import

from django.core.management.base import BaseCommand, CommandError

from ...single_file_column_parser import process_metadata_table


class Command(BaseCommand):
    args = "<username> <title> <file_name> <source_column_index> " \
           "<data_file_column>"
    help = "Takes a tab-delimited file as input, parses, and inputs it into " \
           "the database\n\nNOTE: All provided indices should be zero-based"

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            action='store',
            help='(Required) username of the owner of this data set'
        )
        parser.add_argument(
            '--title',
            action='store',
            help='(Required) name of this data set'
        )
        parser.add_argument(
            '--file_name',
            action='store',
            help='(Required) absolute path to the file being parsed'
        )
        parser.add_argument(
            '--source_column_index',
            '--source_column',
            action='store',
            help='(Required) list of column indices to be used for source '
                 'grouping (comma-separated, no spaces)\n'
                 'Values in the columns indicated by the list of '
                 'column indices provided for the '
                 '"source_column_index" will be concatenated to '
                 'create an identifier for the "source" of the sample'
        )
        parser.add_argument(
            '--data_file_column',
            action='store',
            type='int',
            help='(Required) index of the column of the input file that '
                 'contains the path to or the URL of the file associated '
                 'with this sample'
        )
        parser.add_argument(
            '--auxiliary_file_column',
            action='store',
            type='int',
            default=None,
            help='column index of the input file that contains the '
                 'path to an auxiliary file (e.g. for visualization) '
                 'associated with the input file'
        )
        parser.add_argument(
            '--base_path',
            action='store',
            default=None,
            help='base path of your data file paths if using relative '
                 'locations'
        )
        parser.add_argument(
            '--species_column',
            action='store',
            type='int',
            default=None,
            help='column containing species names or ids'
        )
        parser.add_argument(
            '--annotation_column',
            action='store',
            type='int',
            default=None,
            help='column containing boolean flag to indicate whether '
                 'the data file in this row should be treated as an '
                 'annotation file'
        )
        parser.add_argument(
            '--genome_build_column',
            action='store',
            type='int',
            default=None,
            help='column containing genome build ids'
        )
        parser.add_argument(
            '--data_file_permanent',
            action='store_true',
            default=False,
            help='flag for whether data files should be permanently '
                 'on the system or cached'
        )
        parser.add_argument(
            '--is_public',
            action='store_true',
            default=False,
            help='flag for whether this data set will be visible to the public'
        )

    def handle(self, *args, **options):
        """calls the parsing and insertion functions"""
        required = ['username', 'title', 'file_name', 'source_column_index',
                    'data_file_column']
        for arg in required:
            if not options[arg]:
                raise CommandError("%s was not provided" % arg)
        source_columns = \
            [x.strip() for x in options['source_column_index'].split(",")]
        try:
            with open(options['file_name']) as metadata_file:
                dataset_uuid = process_metadata_table(
                    username=options['username'], title=options['title'],
                    metadata_file=metadata_file, source_columns=source_columns,
                    data_file_column=options['data_file_column'],
                    auxiliary_file_column=options['auxiliary_file_column'],
                    base_path=options['base_path'],
                    data_file_permanent=options['data_file_permanent'],
                    species_column=options['species_column'],
                    genome_build_column=options['genome_build_column'],
                    annotation_column=options['annotation_column'],
                    is_public=options['is_public'])
        except IOError as exc:
            raise CommandError("Could not open file '%s': %s" %
                               options['file_name'], exc)
        except ValueError as exc:
            raise CommandError(exc)

        self.stdout.write("Created dataset with UUID '%s'" % dataset_uuid)
