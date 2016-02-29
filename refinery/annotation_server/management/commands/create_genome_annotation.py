import gzip
import logging
import os
import tarfile
import zipfile

from django.core.management.base import LabelCommand, CommandError
from django.conf import settings

from annotation_server import models
from annotation_server import utils
from data_set_manager.tasks import download_http_file
from file_store.models import _mkdir


logger = logging.getLogger(__name__)


def extract_file(path, to_directory='.'):
    """Extracts file from *.tar.gz files
    http://code.activestate.com/recipes/576714-extract-a-compressed-file/
    """
    logger.info("Extracting File %s to directory %s" % (path, to_directory))

    if path.endswith('.zip'):
        opener, mode = zipfile.ZipFile, 'r'
    elif path.endswith('.tar.gz') or path.endswith('.tgz'):
        opener, mode = tarfile.open, 'r:gz'
    elif path.endswith('.tar.bz2') or path.endswith('.tbz'):
        opener, mode = tarfile.open, 'r:bz2'
    else:
        raise ValueError(
            "Could not extract `{}` as no appropriate extractor is found"
            .format(path)
        )
    cwd = os.getcwd()
    os.chdir(to_directory)
    try:
        file = opener(path, mode)
        logger.debug(file.getmembers())
        try:
            file.extractall()
        finally:
            file.close()
    finally:
        os.chdir(cwd)


class Command(LabelCommand):
    """Management command for creating basic annotation server
    for a specific species and genome build i.e. dm3, ce10, hg19
    """
    # allows Django settings to be used, define scratch space for download
    can_import_settings = True
    BASE_DOWNLOAD_URL = 'http://hgdownload.cse.ucsc.edu/goldenPath/%s/'
    SEQUENCE_FILES = 'chromosomes/'
    OTHER_FILES = 'database/'
    GENOME_BUILD = None
    GENOME_BUILD_NAME = None
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
        """Creates an annotation_server for Refinery
        for a specific genome build: dm3, ce10, hg19
        """
        if label:
            if label in utils.UPPORTED_GENOMES:
                self.GENOME_BUILD = models.GenomeBuild.objects.get(name=label)
                self.GENOME_BUILD_NAME = self.GENOME_BUILD.name
                self.BASE_DOWNLOAD_URL = self.BASE_DOWNLOAD_URL % label
                # temp dir should be located on the same file system as the
                # base dir
                self.ANNOTATION_TEMP_DIR = os.path.join(
                    self.ANNOTATION_BASE_DIR, label)
                # create this directory in case it doesn't exist
                if not os.path.isdir(self.ANNOTATION_TEMP_DIR):
                    _mkdir(self.ANNOTATION_TEMP_DIR)
                self.getChromInfo()
                self.getCytoBand()
                self.getGenes()
            else:
                raise CommandError(
                    'Selected genome build currently not supported')
        else:
            raise CommandError(
                'Please specify which genome to build i.e. hg19, dm3')

    def getChromInfo(self):
        logger.debug("annotation_server.getChromInfo called for genome: %s",
                     self.GENOME_BUILD_NAME)

        url, file_name = self.getUrlFile('chromInfo.txt.gz')
        download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        # deletes objects from ChromInfo table for that genome build
        models.ChromInfo.objects.filter(
            genomebuild__name__exact=self.GENOME_BUILD_NAME).delete()
        # reading gz file
        handle = gzip.open(file_name)
        # http://stackoverflow.com/q/3548495
        for line in handle:
            t1 = line.strip().split('\t')
            # Not including extraneous sequences i.e. chr6_ssto_hap7,
            # chr6_random
            if str(t1[0]).find('_') == -1:
                item = models.ChromInfo(
                    genomebuild=self.GENOME_BUILD,
                    chrom=t1[0],
                    size=t1[1],
                    fileName=t1[2]
                )
                item.save()
        return

    def getCytoBand(self):
        logger.debug("annotation_server.getCytoBand called for genome: %s",
                     self.GENOME_BUILD_NAME)

        url, file_name = self.getUrlFile('cytoBand.txt.gz')
        download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        # deletes all objects from table
        models.CytoBand.objects.filter(
            genomebuild__name__exact=self.GENOME_BUILD_NAME).delete()
        # reading gz file
        # handle = gzip.open(file_name)
        # for line in handle:
        #     t1 = line.strip().split('\t')
        #     # FIXME: current_table is unresolved
        #     # Fritz (2016-02-22): This method does not exist in Refinery's
        #     # code base. Not sure what's going on here.
        #     item = current_table(
        #         genomebuild=self.GENOME_BUILD, chrom=t1[0], chromStart=t1[1],
        #         chromEnd=t1[2], name=t1[3], gieStain=t1[4]
        #     )
        #     item.save()
        return

    def getGenes(self):
        logger.debug("annotation_server.getGenes called for genome: %s",
                     self.GENOME_BUILD_NAME)

        url, file_name = self.getUrlFile('ensGene.txt.gz')
        download_http_file(url, '', self.ANNOTATION_TEMP_DIR, as_task=False)
        # deletes all objects of that genome build from table
        models.Gene.objects.filter(
            genomebuild__name__exact=self.GENOME_BUILD_NAME).delete()
        # reading gz file
        handle = gzip.open(file_name)
        for line in handle:
            t1 = line.strip().split('\t')
            item = models.Gene(
                genomebuild=self.GENOME_BUILD, bin=t1[0], name=t1[1],
                chrom=t1[2], strand=t1[3], txStart=t1[4], txEnd=t1[5],
                cdsStart=t1[6], cdsEnd=t1[7], exonCount=t1[8],
                exonStarts=t1[9], exonEnds=t1[10], score=t1[11], name2=t1[12],
                cdsStartStat=t1[13], cdsEndStat=t1[14], exonFrames=t1[15]
            )
            item.save()
        return

    def getUrlFile(self, file_to_download, sequence=False):
        """Helper function to return UCSC url to download file and current path
        for file to download
        """
        logger.debug("annotation_server.create_genome_annotation getUrlFile"
                     "called build: %s file: %s",
                     self.GENOME_BUILD_NAME, file_to_download)
        if sequence:
            url = self.BASE_DOWNLOAD_URL + self.SEQUENCE_FILES + \
                  file_to_download
        else:
            url = self.BASE_DOWNLOAD_URL + self.OTHER_FILES + file_to_download

        file_name = os.path.join(self.ANNOTATION_TEMP_DIR, url.split('/')[-1])

        return url, file_name
