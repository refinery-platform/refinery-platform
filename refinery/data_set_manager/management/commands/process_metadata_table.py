
from core.models import DataSet, ExtendedGroup
from data_set_manager.single_file_column_parser import SingleFileColumnParser
from data_set_manager.tasks import create_dataset, annotate_nodes
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
import os
import re
import time

class Command(BaseCommand):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help


    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, username, title, file_name, source_column_index, data_file_column, auxiliary_file_column, base_path="", slug=None, species_column=None, annotation_column=None, genome_build_column=None, data_file_permanent=False, is_public=False, **options):    
        parser = SingleFileColumnParser()
        parser.file_permanent = data_file_permanent
        parser.file_column_index = int( data_file_column )
        parser.auxiliary_file_column_index = int( auxiliary_file_column )
        parser.source_column_index = [int(x.strip()) for x in source_column_index.split(",")]
        parser.column_index_separator = "/"
        parser.file_base_path = base_path
        parser.species_column_index = int( species_column )
        
        if genome_build_column is not None:
            parser.genome_build_column_index = int( genome_build_column )                
        
        if annotation_column is not None:
            parser.annotation_column_index = int( annotation_column )                
        
        investigation = parser.run(file_name)
        investigation.title = title
        investigation.save()
        
        create_dataset( investigation.uuid, username, dataset_title=title, slug=slug, public=False )