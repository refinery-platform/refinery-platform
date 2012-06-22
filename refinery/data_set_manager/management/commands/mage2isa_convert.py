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

class Command(BaseCommand):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help

    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, *args, **options):
        """
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
            
        print "getting %s" % settings.WGET_URL
        u = urllib2.urlopen(settings.WGET_URL)

        print "writing to file %s" % ae_file
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
        """
        ae_accessions = ["E-GEOD-37235", "E-MTAB-1084", "E-MTAB-1085"]
        s_tasks = list()
        for ae_accession in ae_accessions:
            #print ae_accession        
            #task = convert_to_isatab.delay(ae_accession)
            s_task = convert_to_isatab.subtask(args=(ae_accession,))
            s_tasks.append(s_task)
    
        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
    
        #go to sleep for 3 seconds at a time until all tasks are finished
        while result.waiting():
            print 'sleeping'
            time.sleep(3)

        results = result.join() #list of the results in dispatch order

        base_isa_dir = os.path.join(settings.ISA_TAB_DIR, 'isa')
        base_preisa_dir = os.path.join(settings.ISA_TAB_DIR, 'pre_isa')
        print "call_command('process_isatab', 'ArrayExpress', %s, %s, is_public=%s)" % (base_isa_dir, base_preisa_dir, True)
        call_command('process_isatab', 'ArrayExpress', base_isa_dir, base_preisa_dir, is_public=True)