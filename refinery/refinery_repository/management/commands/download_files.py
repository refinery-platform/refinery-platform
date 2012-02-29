from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from refinery.refinery_repository.models import Investigation, Assay, Raw_Data
from refinery.refinery_repository.models import Processed_Data
import sys, os, subprocess, re, string
from collections import defaultdict
from refinery_repository.tasks import download_ftp_file, download_http_file

class Command(BaseCommand):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help
    
    """
    Name: handle_label
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, *args, **options):
        """
        Name: select_files
        Description:
            grabs the (raw or processed) files out of the Django database
        Parameters:
            accession (ArrayExpress accession number)
            files_option (valued 0[only processed], 1[only raw], or 2[both])
        """
        def select_files(accession, files_option):
            try:
                #get investigation with primary key
                i = Investigation.objects.get(pk=accession)
            except Investigation.DoesNotExist:
                raise CommandError(
                            "Investigation %s is not available" % accession)
            
            assays = i.assay_set.all() #get assays via fk

            #object to return, dictionary of url lists
            file_lists = defaultdict(set)
    
            for a in assays:
                files_option = str(files_option)
                if files_option != '1': #get processed data
                    processed = a.processed_data.all() #assoc. processed data
                    for p in processed:
                        file_lists['processed'].add(p.url)

                if files_option != '0': #get raw data
                    raw = a.raw_data.all() #list of associated raw data
                    for r in raw:
                        file_lists['raw'].add(r.url)
    
            return file_lists

        """ main program start """
        assert len(args) > 1, "Need at least one accession & download flag"
        
        #directory where downloads will go
        output_directory = settings.DOWNLOAD_BASE_DIR

        #separate arguments into two arrays, accession and file_types
        accessions = args[::2] #list of all even-indexed arguments 
        file_types = args[1::2] #list of all odd-indexed arguments

        task_ids = list()
        for accession, f_type in zip(accessions, file_types):
            files = select_files(accession, f_type)
            for r in files['raw']:
                id = download_ftp_file.delay(r, output_directory)
                task_ids.append(id.task_id)
            #print files['processed'][0]
            #get_processed(files['processed'][0], accession, output_directory)
            for p in files['processed']:
                id = download_http_file.delay(p, output_directory)
                task_ids.append(id.task_id)
        #print "task_ids:"        
        print task_ids
