
from core.models import DataSet, ExtendedGroup
from data_set_manager.single_file_column_parser import SingleFileColumnParser
from data_set_manager.tasks import create_dataset, annotate_nodes
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from optparse import make_option
import os
import re
import time

class Command(BaseCommand):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help

    option_list = BaseCommand.option_list + (
                make_option('--username',
                            action='store',
                            type='string'
                            ),
                make_option('--title',
                            action='store',
                            type='string'
                            ),
                make_option('--file_name',
                            action='store',
                            type='string'
                            ),
                make_option('--source_column_index',
                            action='store',
                            type='string'
                            ),
                make_option('--data_file_column',
                            action='store',
                            type='string'
                            ),
                make_option('--auxiliary_file_column',
                            action='store',
                            type='string'
                            ),
                make_option('--base_path',
                            action='store',
                            type='string',
                            default=""
                            ),
                make_option('--slug',
                            action='store',
                            type='string',
                            default=None
                            ),
                make_option('--species_column',
                            action='store',
                            type='string',
                            default=None
                            ),
                make_option('--annotation_column',
                            action='store',
                            type='string',
                            default=None
                            ),
                make_option('--genome_build_column',
                            action='store',
                            type='string',
                            default=None
                            ),
                make_option('--data_file_permanent',
                            action='store_true',
                            default=False
                            ),
                make_option('--is_public',
                            action='store_true',
                            default=False
                            ),
                )

    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, *args, **options):
        
        required = ['username', 'title', 'file_name', 'source_column_index', 'data_file_column', 'auxiliary_file_column']
        for arg in required:
            if not options[arg]:
                raise CommandError('%s was not provided.' % arg)
        
        
        parser = SingleFileColumnParser()
        parser.file_permanent = options['data_file_permanent']
        parser.file_column_index = int( options['data_file_column'] )
        parser.auxiliary_file_column_index = int( options['auxiliary_file_column'] )
        parser.source_column_index = [int(x.strip()) for x in options['source_column_index'].split(",")]
        parser.column_index_separator = "/"
        parser.file_base_path = options['base_path']
        
        if options['species_column'] is not None:
            parser.species_column_index = int( options['species_column'] )
        
        if options['genome_build_column'] is not None:
            parser.genome_build_column_index = int( options['genome_build_column'] )                
        
        if options['annotation_column'] is not None:
            parser.annotation_column_index = int( options['annotation_column'] )                
        
        investigation = parser.run(options['file_name'])
        investigation.title = options['title']
        investigation.save()
        
        create_dataset( investigation.uuid, options['username'], dataset_title=options['title'], slug=options['slug'], public=options['is_public'] )