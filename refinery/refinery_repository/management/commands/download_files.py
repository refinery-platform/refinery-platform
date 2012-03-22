from django.core.management.base import BaseCommand, CommandError
import sys, os, subprocess, re, string, tempfile, shutil, time, urllib2
from collections import defaultdict
from refinery_repository.tasks import convert_to_isatab
from django.conf import settings
from celery.task.sets import TaskSet
from celery.task import task, Task
from django.core.management import call_command
from StringIO import StringIO
from datetime import date, datetime, timedelta

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
        print "getting %s" % settings.WGET_URL
        u = urllib2.urlopen(settings.WGET_URL)
        """
        ae_file = os.path.join(settings.WGET_DIR, 'arrayexpress_studies')
        """
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
        
        last_date_run = datetime.strptime(settings.LAST_AE_UPDATE, '%Y-%m-%d').date()
    
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
                        isatab_dir = os.path.join(settings.ISA_TAB_DIR, a)
                        #will only convert new studies
                        if not os.path.isdir(isatab_dir): #hasn't been done before
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
        
        s_tasks = list()
        print ae_accessions
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
            time.sleep(10)
        
        results = result.join() #list of the results in dispatch order
    
        success_list = list()
        error_list = list()
        for a, r in zip(ae_accessions, results):
            if(r):
                success_list.append(a)
            else:
                error_list.append(a)
        
        print success_list
        print 
        print error_list
        """
        success_list = ['E-GEOD-35573', 'E-MTAB-805', 'E-GEOD-33887', 'E-GEOD-33546', 'E-GEOD-35791', 'E-GEOD-34962', 'E-GEOD-34261', 'E-GEOD-35774', 'E-MTAB-986', 'E-GEOD-35875', 'E-GEOD-35874', 'E-GEOD-31529', 'E-GEOD-33653', 'E-GEOD-27300', 'E-GEOD-30919', 'E-GEOD-35316', 'E-MTAB-711', 'E-GEOD-33128', 'E-GEOD-32442', 'E-GEOD-33716', 'E-GEOD-34890', 'E-GEOD-32631', 'E-GEOD-32864', 'E-GEOD-32673', 'E-GEOD-31785', 'E-GEOD-33838', 'E-GEOD-27841', 'E-MTAB-155', 'E-GEOD-34791', 'E-GEOD-33802', 'E-GEOD-32880', 'E-GEOD-33791', 'E-GEOD-31578', 'E-GEOD-25532', 'E-GEOD-34329', 'E-GEOD-34295', 'E-GEOD-30203', 'E-GEOD-23577', 'E-GEOD-31558', 'E-MTAB-740', 'E-GEOD-28180', 'E-GEOD-27048', 'E-GEOD-33509', 'E-GEOD-32587', 'E-GEOD-33913', 'E-GEOD-27016', 'E-GEOD-25426', 'E-GEOD-23716', 'E-GEOD-33889', 'E-GEOD-29146', 'E-GEOD-25549', 'E-GEOD-32882', 'E-GEOD-29636', 'E-GEOD-33819', 'E-GEOD-33804', 'E-GEOD-28264', 'E-GEOD-30882', 'E-GEOD-19461', 'E-GEOD-33596', 'E-GEOD-24356', 'E-GEOD-26610', 'E-GEOD-31181', 'E-MTAB-565', 'E-MTAB-437', 'E-GEOD-33059', 'E-GEOD-28987', 'E-GEOD-33049', 'E-GEOD-31966', 'E-MTAB-785', 'E-GEOD-29808', 'E-GEOD-33052', 'E-GEOD-32692', 'E-GEOD-31899', 'E-GEOD-32997', 'E-GEOD-32976', 'E-MTAB-440', 'E-GEOD-30740', 'E-GEOD-30538', 'E-GEOD-32349', 'E-GEOD-29195', 'E-GEOD-29194', 'E-GEOD-29193', 'E-GEOD-32663', 'E-GEOD-32627', 'E-GEOD-31485', 'E-GEOD-28269', 'E-GEOD-32491', 'E-GEOD-31332', 'E-GEOD-29506', 'E-GEOD-26564', 'E-GEOD-32218', 'E-GEOD-24211', 'E-GEOD-26085', 'E-GEOD-30623', 'E-GEOD-29130', 'E-MTAB-672', 'E-GEOD-31867', 'E-GEOD-31363', 'E-GEOD-29498', 'E-GEOD-26257', 'E-GEOD-23525', 'E-GEOD-24326', 'E-GEOD-29427', 'E-GEOD-25446', 'E-GEOD-27929', 'E-GEOD-22878', 'E-GEOD-29422', 'E-GEOD-29362', 'E-GEOD-25308', 'E-GEOD-28067', 'E-GEOD-27826', 'E-GEOD-27981', 'E-GEOD-27003', 'E-GEOD-26345', 'E-GEOD-24397', 'E-GEOD-23795', 'E-GEOD-23893', 'E-MTAB-371', 'E-GEOD-26083', 'E-GEOD-25494', 'E-MTAB-376', 'E-GEOD-16723', 'E-GEOD-25197', 'E-GEOD-25416', 'E-GEOD-25344', 'E-GEOD-25341', 'E-GEOD-24685', 'E-GEOD-24632', 'E-GEOD-21910', 'E-GEOD-23784', 'E-GEOD-22162', 'E-GEOD-21615', 'E-GEOD-21488', 'E-GEOD-18481', 'E-GEOD-24164', 'E-GEOD-25000', 'E-GEOD-24538', 'E-GEOD-22441', 'E-GEOD-22178', 'E-GEOD-24178', 'E-GEOD-24463', 'E-GEOD-24471', 'E-GEOD-21366', 'E-GEOD-21365', 'E-GEOD-21777', 'E-GEOD-24166', 'E-GEOD-20303', 'E-GEOD-21812', 'E-GEOD-21665', 'E-GEOD-19025', 'E-MTAB-332', 'E-GEOD-22478', 'E-GEOD-23830', 'E-GEOD-23681', 'E-GEOD-23792', 'E-GEOD-23762', 'E-GEOD-22549', 'E-GEOD-17611', 'E-GEOD-22562', 'E-GEOD-23537', 'E-GEOD-23455', 'E-GEOD-21234', 'E-GEOD-23080', 'E-GEOD-23078', 'E-GEOD-21108', 'E-GEOD-22211', 'E-GEOD-22075', 'E-GEOD-22104', 'E-GEOD-22105', 'E-GEOD-22341', 'E-GEOD-22303', 'E-GEOD-22302', 'E-GEOD-22268', 'E-GEOD-21978', 'E-GEOD-21669', 'E-GEOD-21671', 'E-GEOD-21141', 'E-GEOD-20870', 'E-GEOD-9367', 'E-GEOD-21917', 'E-GEOD-21916', 'E-GEOD-21898', 'E-GEOD-19991', 'E-GEOD-18720', 'E-GEOD-14092', 'E-TABM-828', 'E-GEOD-21770', 'E-GEOD-17067', 'E-GEOD-21790', 'E-GEOD-20078', 'E-GEOD-21068', 'E-GEOD-18588', 'E-GEOD-21202', 'E-GEOD-20753', 'E-GEOD-20040', 'E-GEOD-21172', 'E-GEOD-21207', 'E-GEOD-19325', 'E-GEOD-18578', 'E-GEOD-21314', 'E-GEOD-21161', 'E-GEOD-20485', 'E-GEOD-21301', 'E-TABM-722', 'E-GEOD-20176', 'E-GEOD-21026', 'E-GEOD-19485', 'E-GEOD-19484', 'E-GEOD-16926', 'E-GEOD-20890', 'E-GEOD-20889', 'E-GEOD-20888', 'E-GEOD-20887', 'E-GEOD-20076', 'E-GEOD-20042', 'E-GEOD-20673', 'E-GEOD-20650', 'E-GEOD-19553', 'E-GEOD-19786', 'E-GEOD-16893', 'E-GEOD-17937', 'E-GEOD-16526', 'E-GEOD-19013', 'E-GEOD-18542', 'E-GEOD-19365', 'E-GEOD-20000', 'E-GEOD-19019', 'E-GEOD-19708', 'E-GEOD-18776', 'E-GEOD-19235', 'E-GEOD-18371', 'E-GEOD-18292', 'E-GEOD-17917', 'E-GEOD-16375', 'E-GEOD-16657', 'E-GEOD-17458', 'E-GEOD-17454', 'E-GEOD-15188', 'E-GEOD-15806', 'E-GEOD-16552', 'E-GEOD-15814', 'E-GEOD-16023', 'E-GEOD-15896', 'E-GEOD-16013', 'E-GEOD-15286', 'E-GEOD-14600', 'E-GEOD-15625', 'E-GEOD-15567', 'E-GEOD-15535', 'E-GEOD-13845', 'E-GEOD-12721', 'E-GEOD-14022', 'E-GEOD-13511', 'E-GEOD-12680', 'E-GEOD-13370', 'E-GEOD-13084', 'E-GEOD-12782', 'E-GEOD-11724', 'E-GEOD-12241', 'E-GEOD-11172', 'E-GEOD-11074']
        
        #grab the stderr instead of having it go to console
        #orig_stderr = sys.stderr
        #sys.stderr = content = StringIO()
        print 'calling parser'
        call_command('parser', *success_list)
        #call_command('parser', *success_list, stderr=content)
        #sys.stderr = orig_stderr
        #content.seek(0)
    
        #if there was a problem, have it email you
        print 'stderr?'
        #stderr = content.read().strip()
        #if stderr:
        #    print stderr
        
        
        settings.LAST_AE_UPDATE = str(date.today())
        print settings.LAST_AE_UPDATE
