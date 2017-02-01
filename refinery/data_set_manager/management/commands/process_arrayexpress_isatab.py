from __future__ import absolute_import

from . import process_isatab


class Command(process_isatab.Command):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database\n" % help
    help = "%s\nUsage: python manage.py process_arrayexpress_isatab" % help
    help = "%s <base_isatab_directory> [base_pre_isa_dir=" % help
    help = "%s<base_pre_isatab_directory> is_public=True]\n" % help

    def __init__(self, filename=None):
        super(Command, self).__init__()
        self._username = "ArrayExpress"
        self._additional_raw_data_file_extension = ".gz"

    def handle(self, *args, **options):
        # insert username into argument list
        list_args = list(args)
        list_args.insert(0, self._username)
        args = tuple(list_args)
        super(Command, self).handle(*args, **options)
