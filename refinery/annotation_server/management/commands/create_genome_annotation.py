import os, zipfile, gzip
import urllib2
from optparse import make_option
from django.core.management.base import LabelCommand, CommandError
from annotation_server.models import *
import logging
from file_store.models import _mkdir
from django.conf import settings
import tarfile
from data_set_manager.tasks import download_http_file
from django.core.management.color import no_style
from django.db import connection, transaction

'''
Management command for creating basic annotation server 
for a specific species and genome build 
'''

def extract_file(path, to_directory='.'):
    '''
    Extracts file from *.tar.gz files 
    http://code.activestate.com/recipes/576714-extract-a-compressed-file/
    '''
    logger.info("Extracting File %s to directory %s" % (path, to_directory))
    
    if path.endswith('.zip'):
        opener, mode = zipfile.ZipFile, 'r'
    elif path.endswith('.tar.gz') or path.endswith('.tgz'):
        opener, mode = tarfile.open, 'r:gz'
    elif path.endswith('.tar.bz2') or path.endswith('.tbz'):
        opener, mode = tarfile.open, 'r:bz2'
    else: 
        raise ValueError, "Could not extract `%s` as no appropriate extractor is found" % path
    
    cwd = os.getcwd()
    os.chdir(to_directory)
    
    try:
        file = opener(path, mode)
        print file.getmembers()
        try: file.extractall()
        finally: file.close()
    finally:
        os.chdir(cwd)
    

# get module logger
logger = logging.getLogger(__name__)

class Command(LabelCommand):
    # allows django settings.py to be used, define scratch space for download
    can_import_settings = True
    BASE_DOWNLOAD_URL = 'http://hgdownload.cse.ucsc.edu/goldenPath/%s/'
    #SEQUENCE_FILES = 'bigZips/chromFa.tar.gz'
    SEQUENCE_FILES = 'chromosomes/'
    OTHER_FILES = 'database/'
    SUPPORTED_GENOMES = ['hg19']
    GENOME_BUILD = None
    ANNOTATION_DIR = 'annotation_server'   # relative to MEDIA_ROOT

    # absolute path to the file store root dir
    ANNOTATION_BASE_DIR = os.path.join(settings.MEDIA_ROOT, ANNOTATION_DIR)
    # create this directory in case it doesn't exist
    if not os.path.isdir(ANNOTATION_BASE_DIR):
        _mkdir(ANNOTATION_BASE_DIR)

    """
    Name: handle
    Description:
    main program; run the command
    """   
    def handle_label(self, label, **options):
        '''
        This function creates an annotation_server for Refinery 
        for a specific genome build: dm3, ce10, hg19
        '''
        if label:
            self.GENOME_BUILD = label
            if self.GENOME_BUILD in self.SUPPORTED_GENOMES:
                self.BASE_DOWNLOAD_URL = self.BASE_DOWNLOAD_URL % self.GENOME_BUILD
                
                # temp dir should be located on the same file system as the base dir
                self.ANNOTATION_TEMP_DIR = os.path.join(self.ANNOTATION_BASE_DIR, self.GENOME_BUILD)
                # create this directory in case it doesn't exist
                if not os.path.isdir(self.ANNOTATION_TEMP_DIR):
                    _mkdir(self.ANNOTATION_TEMP_DIR)
                    
                #self.createGenomeModels()
                self.getChromInfo()
                self.getSequence()
                self.getCytoBand()
                self.getGenes()
                
            else:
                raise CommandError('Selected genome build currently not supported')
        else:
            raise CommandError('Please specify which genome to build i.e. hg19, dm3')
    
    def createGenomeModels(self):
        '''
        Dynamic creation of models based on input species
        '''
        current_genome = self.GENOME_BUILD 
        
        sequence_model = type("%s_Sequence" % current_genome, (Sequence,), {'__module__': 'annotation_server.models'})
        cytoband_model = type("%s_CytoBand" % current_genome, (CytoBand,), {'__module__': 'annotation_server.models'})
        chrominfo_model = type("%s_ChromInfo" % current_genome, (ChromInfo,), {'__module__': 'annotation_server.models'})
        refgene_model = type("%s_RefGene" % current_genome, (Gene,), {'__module__': 'annotation_server.models'})
        
        model_list = [sequence_model, cytoband_model, chrominfo_model, refgene_model] #list of models to add to the database
        
        """Add models to the Database"""
        #preparation
        style = no_style()
        cursor = connection.cursor()
        
        #actual adding
        for model in model_list:
            statements, pending = connection.creation.sql_create_model(model, style)
            for sql in statements:
                cursor.execute(sql)
        
        #commit creation statements
        transaction.commit_unless_managed()
                
        
    def getChromInfo(self):
        # chrominfo
        
        logger.debug("annotation_server.getChromInfo called for genome: %s" % self.GENOME_BUILD )
        
        url, file_name = self.getUrlFile('chromInfo.txt.gz')
        download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        
        current_table = eval(self.GENOME_BUILD + "_ChromInfo")
        
        # deletes all objects from table
        current_table.objects.all().delete()
        
        # reading gz file
        handle = gzip.open(file_name)
        
        # http://stackoverflow.com/questions/3548495/download-extract-and-read-a-gzip-file-in-python
        for line in handle:
            t1 = line.strip().split('\t')
            
            # Not including extraneous sequences i.e. chr6_ssto_hap7, chr6_random
            if str(t1[0]).find('_') == -1:
                item = current_table(chrom=t1[0], size=t1[1], fileName=t1[2])
                item.save()
        
        return
    
    def getCytoBand(self):
        # chrominfo
        
        logger.debug("annotation_server.getCytoBand called for genome: %s" % self.GENOME_BUILD )
        
        url, file_name = self.getUrlFile('cytoBand.txt.gz')
        download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        current_table = eval(self.GENOME_BUILD + "_CytoBand")
        
        # deletes all objects from table
        current_table.objects.all().delete()
        
        # reading gz file
        handle = gzip.open(file_name)
        for line in handle:
            t1 = line.strip().split('\t')
            item = current_table(chrom=t1[0], chromStart=t1[1], chromEnd=t1[2], name=t1[3], gieStain=t1[4])
            item.save()

        return
    
    def getGenes(self):
        # refGene
        
        logger.debug("annotation_server.getGenes called for genome: %s" % self.GENOME_BUILD )
        
        url, file_name = self.getUrlFile('ensGene.txt.gz')
        download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        current_table = eval(self.GENOME_BUILD + "_EnsGene")
        
        # deletes all objects from table
        current_table.objects.all().delete()
        
        # reading gz file
        handle = gzip.open(file_name)
        for line in handle:
            t1 = line.strip().split('\t')
            item = current_table(bin=t1[0], name=t1[1], chrom=t1[2], strand=t1[3], txStart=t1[4], txEnd=t1[5], cdsStart=t1[6], cdsEnd=t1[7], exonCount=t1[8], exonStarts=t1[9], exonEnds=t1[10], score=t1[11], name2=t1[12], cdsStartStat=t1[13], cdsEndStat=t1[14], exonFrames=t1[15])
            item.save()

        return
    
    def getSequence(self):
        '''
        Downloads and imports files into sequence table
        '''
        logger.debug("annotation_server.getSequence called for genome: %s" % self.GENOME_BUILD )
        
        url, file_name = self.getUrlFile(self.SEQUENCE_FILES)
        current_table = eval(self.GENOME_BUILD + "_Sequence")
        
        # deletes all objects from table
        current_table.objects.all().delete()
        logger.debug("Clearing sequence data for genome: %s" % (self.GENOME_BUILD) )

        chrom_table = eval(self.GENOME_BUILD + "_ChromInfo")
        all_chrom = chrom_table.objects.all()
        
        # Only iterating through obvious chromosomes no "_random, _hla2, etc.
        for chrom in all_chrom:
            logger.debug("Importing %s sequence for genome: %s" % (chrom.chrom, self.GENOME_BUILD) )
            url, file_name = self.getUrlFile(chrom.chrom+".fa.gz", sequence=True)
            
            download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        
            header_line = True
            handle = gzip.open(file_name)
            sequence = ''
            chrom_name = ''
            for line in handle:
                if header_line:
                    chrom_name = line.strip().lstrip('>')
                    header_line = False
                else:
                    sequence += line.strip('\n')
            
            # importing into database
            item = current_table(name=chrom_name, seq=sequence)
            item.save()
                    
    def getUrlFile(self, file_to_download, sequence=False):
        '''
        Helper function to return UCSC url to download file and current path for file to download
        '''
        if sequence:
            url = self.BASE_DOWNLOAD_URL + self.SEQUENCE_FILES;
        else:
            url = self.BASE_DOWNLOAD_URL + self.OTHER_FILES + file_to_download
        
        file_name = os.path.join(self.ANNOTATION_TEMP_DIR, url.split('/')[-1])
        
        return url, file_name
        
        