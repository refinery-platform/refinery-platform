from celery.task.sets import TaskSet, subtask
from data_set_manager.models import Study
from data_set_manager.tasks import convert_to_isatab
from datetime import date, datetime, timedelta
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
import os
import sys
import urllib2
import errno
import string
import re
import time
import os.path
import logging

# get module logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Fetches a list of ArrayExpress experiments and converts their"
    help = "%s MAGE-TAB to \nISA-Tab based on the keywords entered.\n" % help
    help = "%s\nKeyword Options:\n\t" % help
    help = "%s\"array\": array design, accession, or name;" % help
    help = "%s e.g. array=A-AFFY-33\n\t\"ef\": experimental factor," % help
    help = "%s name of the main variable in an experiment;\n\t\t" % help
    help = "%se.g. ef=CellType\n\t\"evf\": experimental factor value;" % help
    help = "%s e.g. evf=HeLa\n\t\"expdesign\": experiment design type;" % help
    help = "%s e.g. expdesign='dose response'\n\t\"exptype\":" % help
    help = "%s experiment type; e.g. exptype='RNA-seq OR ChIP-seq'\n" % help
    help = "%s\t\"gxa\": presence in the Gene Expression Atalas. Only" % help
    help = "%s value is gxa=true;\n\t\te.g. gxa=true\n\t\"keywords\": " % help
    help = "%s free-text search; e.g. keywords='prostate NOT breast'\n" % help
    help = "%s\t\"pmid\": PubMed identifier; e.g. pmid=16553887\n" % help
    help = "%s\t\"sa\": sample attribute values; e.g. sa=fibroblast\n" % help
    help = "%s\t\"species\": species of the samples; e.g." % help
    help = "%s species='homo sapiens AND mouse'\n\n" % help

    def _create_dir(self, file_path):
        """
        Name: create_dir
        Description:
            creates a directory if it needs to be created
        Parameters:
            file_path: directory to create if necessary
        """
        try:
            os.makedirs(file_path)
        except OSError, e:
            if e.errno != errno.EEXIST:
                raise
        

    def _make_query(self, args):
        """
        Name: make_query
        Description:
            creates an ArrayExpress query string from the command line arguments
        Parameters:
            args: the command line arguments
        """
        query_string = ""
        if args:
            query_list = list()
            for arg in args:
                query_list.append(arg)

            query_string = string.join(query_list, "&")
            query_string = "%s%s" % (settings.AE_BASE_QUERY, query_string)
        else:
            query_string = "%sexptype=" % settings.AE_BASE_QUERY

        return query_string


    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, *args, **options):
        logger.info("Logging from mage2isa_convert")
        ae_query = self._make_query(args)

        try:
            os.makedirs(settings.WGET_DIR)
        except OSError, e:
            if e.errno != errno.EEXIST:
                raise

        #find out when the last pull from ArrayExpress was
        ae_file = os.path.join(settings.WGET_DIR, 'arrayexpress_studies')
        try:
            t = os.path.getmtime(ae_file)
            last_date_run = datetime.fromtimestamp(t).date()
        except: #if file doesn't exist yet, then just make last_date_run today
            last_date_run = date.today()
        
        logger.info("getting %s" % ae_query)
        u = urllib2.urlopen(ae_query)    

        logger.info("writing to file %s" % ae_file)
        f = open(ae_file, 'w')
        #download in pieces to make sure you're never biting off too much
        block_sz = 8192
        while True:
            buffer = u.read(block_sz) #read block_sz bytes from url
            if not buffer:
                break

            f.write(buffer) #write what you read from url to file

        f.close()

        ae_accessions = list()
        f = open(ae_file, 'r')
        for line in f:
            try:
                #get date that study was updated; between "lastupdatedate" tags
                updated = string.split(line, 'lastupdatedate>').pop(1)
                updated = updated[:-2] #take off the </ connected to the date
                accessions = string.split(line, 'accession>')
                for a in accessions: #many accessions, so search for right one
                    if re.search(r'^E-', a):
                        a = a[:-2] #take off the </ connected to the accession
                        #will only convert new studies
                        if not Study.objects.filter(identifier=a):
                            ae_accessions.append(a)
                        else: #if updated recently, then convert also
                            #convert string to datetime.date object for comparison
                            update = datetime.strptime(updated, '%Y-%m-%d').date()
                            #if the study has been updated since the last time we
                            #did this, update the ISA-Tab
                            if (update - last_date_run) > timedelta(days=-1):
                                ae_accessions.append(a)
            except IndexError: #looking at line without interesting information
                pass                    
        f.close()
        
        """create directories that zip archives will reside in"""
        base_isa_dir = os.path.join(settings.ISA_TAB_DIR, 'isa')
        base_preisa_dir = os.path.join(settings.ISA_TAB_DIR, 'pre_isa')
        
        self._create_dir(base_isa_dir)
        self._create_dir(base_preisa_dir)

        """create subtasks for converting now that you know what to convert"""
        s_tasks = list()
        for ae_accession in ae_accessions:
            #print ae_accession
            s_task = convert_to_isatab.subtask(args=(ae_accession,))
            s_tasks.append(s_task)

        """dispatch the tasks and wait for everything to return"""
        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
    
        #go to sleep for 5 seconds at a time until all tasks are finished
        while result.waiting():
            time.sleep(5)

        results = result.join() #list of the results in dispatch order

        call_command('process_isatab', 'ArrayExpress', base_isa_dir, base_preisa_dir, is_public=True)