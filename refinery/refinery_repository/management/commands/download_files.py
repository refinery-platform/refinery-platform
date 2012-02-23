from django.core.management.base import BaseCommand, CommandError
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

        """
        Name: get_raw
        Description:
            reformats the incorrect FTP link to the correct one and dispatches
            a download of that file
        Parameters:
            ftp_file (incorrect FTP link)
        """
        def get_raw(ftp_file, out_dir):
            #list that has different parts of final ftp link to concatenate
            ftp = ["ftp://ftp.sra.ebi.ac.uk/vol1/fastq"]
    
            """isolate the file name"""
            #get the index of the last / in the given ftp link
            rind = string.rindex(ftp_file, '/')
            #take substring from the last slash to the end of given ftp link
            f_name = ftp_file[rind+1:] #file name
    
            #add first 6 characters of the ENA/SRA accession to list
            ftp.append(f_name[:6])
    
            #isolate the ENA/SRA accession number
            split = f_name.split('.') #split on "." for ENA/SRA acc (ind=0)
            #if paired-end data, remove the _1/_2 from end before list append
            if re.search(r'_(1|2)$', split[0]):
                #add everything but last 2 chars (_1 or _2)
                ftp.append(split[0][:-2])
            else:
                ftp.append(split[0]) 
    
            #if getting FASTQ file, make sure gzip version
            if re.search(r'\.fastq$', f_name):
                f_name += ".gz"
            #add file name to the end of the list
            ftp.append(f_name)
    
            #concatenate everything to get the final FTP link
            ftp_url = string.join(ftp, '/')
    
            command = "python download_ftp.py %s downloads" % ftp_url
            #print "%s\n" % command
            #call(['python', 'download_ftp_file.py', ftp_url, out_dir])
            dl_task = download_ftp_file.delay(ftp_url, out_dir)
            return dl_task.task_id


        """
        Name: get_processed
        Description:
            reformats the incorrect FTP link to a correct HTTP URL and
            dispatches a download of that file
        Parameters:
            ftp_file (incorrect FTP [should be HTTP] link)
            acc (accession number)
        """
        def get_processed(ftp_file, acc, out_dir):
            #isolate the file name
            #get the index of the last / in the given ftp link
            rind = string.rindex(ftp_file, '/')
            #take substring from the last slash to the end of given ftp link
            f_name = ftp_file[rind+1:] #file name
    
            #format final url, plugging in the accession and the file name
            url = "http://www.ebi.ac.uk/arrayexpress/files"
            url = "%s/%s/%s" % (url, acc, f_name)
            
            command = "python download_http.py %s downloads" % url
            #self.stdout.write("%s\n" % command)
            #call(['python', 'download_http_file.py', url, out_dir])
            dl_task = download_http_file.delay(url, out_dir)
            return dl_task.task_id
        
        
        """ main program start """
        assert len(args) > 1, "Need at least one accession & download flag"
        
        #directory where downloads will go
        output_directory = "/data/home/galaxy/refinery_downloads"

        #separate arguments into two arrays, accession and file_types
        accessions = args[::2] #list of all even-indexed arguments 
        file_types = args[1::2] #list of all odd-indexed arguments

        task_ids = list()
        for accession, f_type in zip(accessions, file_types):
            files = select_files(accession, f_type)
            for r in files['raw']:
                id = get_raw(r, output_directory)
                task_ids.append(id)
            #print files['processed'][0]
            #get_processed(files['processed'][0], accession, output_directory)
            for p in files['processed']:
                id = get_processed(p, accession, output_directory)
                task_ids.append(id)
        #print "task_ids:"        
        print task_ids
