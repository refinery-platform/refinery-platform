
from core.models import DataSet, ExtendedGroup
from data_set_manager.single_file_column_parser import SingleFileColumnParser
from data_set_manager.tasks import create_dataset
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
    def handle(self, username, title, file_name, source_column_index, data_file_column, data_file_permanent=False, is_public=False, **options):    
        parser = SingleFileColumnParser()
        parser.file_permanent = data_file_permanent
        parser.file_column_index = int( data_file_column )
        parser.source_column_index = [int(x.strip()) for x in source_column_index.split(",")]
        parser.column_index_separator = "/"
        
        investigation = parser.run(file_name)
        investigation.title = title
        investigation.save()
        
        user = User.objects.get(username__exact=username)
        data_set = DataSet.objects.create(name=title)
        data_set.set_investigation(investigation)
        data_set.set_owner(user)
        
        if is_public:
            public_group = ExtendedGroup.objects.get(name__exact="Public")
            data_set.share( public_group )  
