from celery.schedules import crontab
from celery.task import task, periodic_task
from celery.task.sets import TaskSet, subtask
from collections import defaultdict
from core.models import *
from data_set_manager.isa_tab_parser import IsaTabParser
from data_set_manager.models import Investigation, Study, Node
from data_set_manager.utils import get_node_types, update_annotated_nodes
from datetime import date, datetime, timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import call_command
from django.db import connection
from django.db.utils import IntegrityError
from file_store.tasks import create, delete, read
from zipfile import ZipFile, BadZipfile
import csv
import errno
import ftplib
import glob
import os
import os.path
import re
import shutil
import socket
import string
import subprocess
import sys
import tempfile
import time
import traceback
import urllib2
import logging

"""get logger for all tasks"""
logger = logging.getLogger(__name__)

def create_dir(file_path):
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


@task()
def download_http_file(url, out_dir, accession, new_name=None, galaxy_file_size=None):
    """
    Name: download_http_file
    Description:
        downloads a file from a given URL
    Parameters:
        url: URL for the file being downloaded
        out_dir: base directory where file is being downloaded
        accession: name of directory that will house the downloaded 
                   file, in this case, the investigation accession
    """
    out_dir = os.path.join(out_dir, accession) #directory where file downloads
    
    logger.info("data_set_manager.download_http_file called")
    
    #make super-directory (out_dir/accession) if it doesn't exist
    create_dir(out_dir)
    
    if (new_name is None):
        file_name = url.split('/')[-1] #get the file name
        file_path = os.path.join(out_dir, file_name) # path where file downloads
    else:
        file_name = new_name
        file_path = os.path.join(out_dir, new_name) 

    logger.info("file_path: %s\n" % file_path)
    logger.info("file_name: %s\n" % file_name)
    logger.info("out_dir: %s\n" % out_dir)
    logger.info("url: %s\n" % url)
    
    if(not os.path.exists(file_path)):
        u = urllib2.urlopen(url)
        f = open(file_path, 'wb')
        
        if (galaxy_file_size is None):
            meta = u.info()
            logger.info("meta: %s\n" % meta)
            file_size = int(meta.getheaders("Content-Length")[0])
        else:
            file_size = galaxy_file_size
            
        logger.info("Downloading: %s Bytes: %s" % (file_name, file_size))
        file_size_dl = 0
        block_sz = 8192
        while True:
            buffer = u.read(block_sz)
            if not buffer:
                break

            file_size_dl += len(buffer)
            f.write(buffer)
            
            downloaded = file_size_dl * 100. / file_size
            download_http_file.update_state(state="PROGRESS",
                        meta={
                              "percent_done": "%3.2f%%" % (downloaded),
                              'current': file_size_dl,
                              'total': file_size
                        })
            
            #status = r"%10d  [%3.2f%%]" % (file_size_dl, downloaded)
            #status = status + chr(8)*(len(status)+1)
            #print status,

        f.close()

@task()
def convert_to_isatab(accession):
    """
    Name: convert_to_isatab
    Description:
        converts MAGE-Tab file from ArrayExpress into ISA-Tab, zips up the 
        ISA-Tab, and zips up the MAGE-Tab
    Parameters:
        accession: ArrayExpress study to convert
    """
    logger = convert_to_isatab.get_logger()
    logger.info("logging from convert_to_isatab")
    retval = 1 #successful conversion
    
    #send stdout and stderr to a unique temp directory to avoid console
    temp_dir = tempfile.mkdtemp()
    #stderr_n = tempfile.NamedTemporaryFile(dir=temp_dir, prefix='ae_stderr').name
    #stdout_n = tempfile.NamedTemporaryFile(dir=temp_dir, prefix='ae_stdout').name

    #create the subprocess
    process = subprocess.Popen(args="./convert.sh", shell=True, 
                               cwd=settings.CONVERSION_DIR,
                               stdin=subprocess.PIPE,
                               stderr=subprocess.PIPE,
                               stdout=subprocess.PIPE)
                               #stderr=open(stderr_n, 'wb'),
                               #stdout=open(stdout_n, 'wb'))
    #run the subprocess and grab the exit code
    #exit_code = process.wait()
    (stdout, stderr) = process.communicate(input=accession)
    exit_code = process.returncode
    """process stderr"""
    #stderr = open(stderr_n).read().strip()
    if stderr:
        shutil.rmtree(os.path.join(settings.ISA_TAB_DIR, accession))
        logger.error(stderr)
        if exit_code != 0: #something bad happened
            shutil.rmtree(temp_dir)
            raise Exception, "Error Converting to ISA-Tab: %s" % stderr
        else:
            retval = 0 #unsuccessful conversion, but clean exit
    else: #successfully converted
        #zip up ISA-Tab files 
        isatab_file_location = os.path.join(settings.ISA_TAB_DIR, 'isa', accession)
        preisatab_file_location = os.path.join(settings.ISA_TAB_DIR, 'pre_isa')
        """
        shutil makes a zip, tar, tar.gz, etc file out of files in given dir 
        Params:
        zip file prefix
        type of archive (e.g. zip, tar)
        superdirectory of the directory you want to archive
        name of directory that's being archived
        """ 
        shutil.make_archive(isatab_file_location, 'zip',  
                                        settings.ISA_TAB_DIR, accession)

        #Get and zip up the MAGE-TAB and put in the ISA-Tab folder
        #make file name for ArrayExpress information to download into
        ae_name = tempfile.NamedTemporaryFile(dir=temp_dir, prefix='ae_').name
        #make url to fetch the experiment
        url = "%s/%s" % (settings.AE_BASE_URL, accession)

        #get ArrayExpress information to get URLs to download
        u = urllib2.urlopen(url)
        f = open(ae_name, 'wb')
        f.write(u.read()) #small file, so just grab whole thing in one go
        f.close()

        #open and read in the last line (the HTML) that has the info we want
        f = open(ae_name, 'rb')
        lines = f.readlines()
        f.close()
        last_line = lines[-1]

        dir_to_zip = os.path.join(temp_dir, "magetab")
        create_dir(dir_to_zip)

        #isolate the links by splitting on '<a href="'
        a_hrefs = string.split(last_line, '<a href="')
        #get the links we want
        for a_href in a_hrefs:
            if re.search(r'sdrf.txt', a_href) or re.search(r'idf.txt', a_href):
                link = string.split(a_href, '"').pop(0) #grab the link
                file_name = link.split('/')[-1] #get the file name
                if not re.search(r'^http://', link):
                    link = "http://www.ebi.ac.uk%s" % link
                
                u = urllib2.urlopen(link)
                file = os.path.join(dir_to_zip, file_name)
                f = open(file, 'wb')
                f.write(u.read()) #again, shouldn't be a large file
                f.close()
        
        files_to_zip = 0
        for dirname, dirnames, filenames in os.walk(dir_to_zip):
            for filename in filenames:
                files_to_zip += 1
        if files_to_zip > 1:
            #zip up and move the MAGE-TAB files
            shutil.make_archive("%s/MAGE-TAB_%s" % (preisatab_file_location, accession), 
                                'zip', temp_dir, "magetab")
            #shutil.move("%s/MAGE-TAB_%s.zip" % (temp_dir, accession), pre_isatab_file_location)

    #clean up the temporary directory and other files
    #shutil.rmtree(temp_dir)

    return retval

"""
Name: get_arrayexpress_studies
Description:
    task that runs every Friday at 9:00PM that checks ArrayExpress for new
    and updated studies, then pulls down their metadata, converts it to
    ISA-Tab, and parses it into the Django database
"""
@periodic_task(run_every=crontab(hour="12", day_of_week="friday"))
def get_arrayexpress_studies():
    """
    If you don't want to fetch all studies, edit in this fashion:
        call_command('mage2isa_convert', 'exptype=chip-seq', species='human')
    """
    call_command('mage2isa_convert', 'exptype=ChIP-seq')

@task() 
def create_dataset(investigation_uuid, username, public=False):
    logger = create_dataset.get_logger()
    logger.info("logging from create_dataset") 
    """get User for assigning DataSets"""
    try:
        user = User.objects.get(username__exact=username)
    except:
        logger.info("User %s doesn't exist, so creating with password 'test'" % username)
        #user doesn't exist
        user = User.objects.create_user(username, "", "test")

    if investigation_uuid != None:
        
        # TODO: make sure this is used everywhere 
        annotate_nodes(investigation_uuid)
        
        dataset = ""
        investigation = Investigation.objects.get(uuid=investigation_uuid)
        identifier = investigation.get_identifier()
    
        datasets = DataSet.objects.filter(name=identifier)
        if len(datasets): #if not 0, update dataset with new investigation
            """go through datasets until you find one with the correct owner"""
            for ds in datasets:
                own = ds.get_owner()
                if own == user:
                    ds.update_investigation(investigation, "updated %s" % date.today())
                    dataset = ds
                    break
            
        else: #create a new dataset
            d = DataSet.objects.create(name=identifier)
            d.set_investigation(investigation)
            d.set_owner(user)
            dataset = d

        if public:
            public_group = ExtendedGroup.objects.public_group()
            dataset.share(public_group)  

@task()
def annotate_nodes(investigation_uuid):
    """
    Adds all nodes in this investigation to the annotated nodes table for faster lookup. 
    """
    investigation = Investigation.objects.get(uuid=investigation_uuid)
    
    studies = investigation.study_set.all()
    for study in studies:
        assays = study.assay_set.all()
        for assay in assays:
            node_types = get_node_types(study.uuid, assay.uuid, files_only=True, filter_set=Node.FILES)            
            for node_type in node_types:
                update_annotated_nodes( node_type, study.uuid, assay.uuid, update=True )
                    

@task()
def parse_isatab(username, public, path, additional_raw_data_file_extension=None, isa_archive=None, pre_isa_archive=None):
    """
    parse_isatab(username, is_public, folder_name, additional_raw_data_file_extension, isa_archive=<path> pre_isa_archive=<path>
    """
    logger.info("logging from parse_isatab")
    p = IsaTabParser()
    p.additional_raw_data_file_extension = additional_raw_data_file_extension
    try:
        investigation = p.run(path, isa_archive=isa_archive, preisa_archive=pre_isa_archive)
        create_dataset(investigation.uuid, username, public=public)
    except: #prints the error message without breaking things
        logger.error("*** print_tb:")
        exc_type, exc_value, exc_traceback = sys.exc_info()
        logger.error(traceback.print_tb(exc_traceback, file=sys.stdout))
        logger.error("*** print_exception:")
        logger.error(traceback.print_exception(exc_type, exc_value,
                          exc_traceback, file=sys.stdout))
    return None

@task()
def process_isa_tab(uuid):
    ''' Unzip and parse ISA-Tab archive file object specified by UUID, return investigation UUID '''
    #TODO: check if the incoming ISA-Tab is already in the system
    result = read.delay(uuid)    #TODO: convert to subtask?
    item = result.get()
    input_file = item.get_absolute_path()
    
    if input_file:
        p = IsaTabParser()
        investigation = p.run(input_file)  # takes "/full/path/to/isatab/zipfile/or/directory"
        return investigation.uuid
    else:
        return None