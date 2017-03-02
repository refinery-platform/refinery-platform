from __future__ import absolute_import
import gzip
import logging
from optparse import make_option
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from ...models import WigDescription
from ...utils import SUPPORTED_GENOMES
from file_store.models import _mkdir


"""Helper command to deal with additional annotation tracks not available from
UCSC genome browser

TODO: Should we import annotation files into file_server?
how to cleanup directories used to store and download files
"""

logger = logging.getLogger(__name__)


def parse_wig_attribute(wig):
    """Helper function for dealing w/ wig tracks"""
    ret_dict = {}
    t2 = wig.strip().split(" ")
    for item in t2:
        t3 = item.split("=")
        if len(t3) == 2:
            ret_dict[t3[0]] = t3[1].strip('"')
    return ret_dict


def parse_gff_attribute(attr):
    """Helper function for dealing w/ parse_gff_attributes,
    converts " " or ";" string into a dictionary
    """
    t2 = attr.strip().split(";")
    ret_dict = {}
    k = None
    for item in t2:
        t3 = item.strip().split("=")
        if len(t3) != 2:
            t3 = item.strip().split(" ")

        if len(t3) == 2:
            k = t3[0]
            v = t3[1].strip('"').strip("'")
            ret_dict[k] = v

    return ret_dict


def parse_db_string(attr, sym):
    """Helper function for entering gff, gtf, files into models"""
    ret_string = ''
    for var in sym:
        if var in attr:
            if ret_string:
                ret_string += ', %s="%s"' % (var, attr[var])
            else:
                ret_string += '%s="%s"' % (var, attr[var])
    return ret_string


def getFileHandle(file_in):
    """Helper function for returning a file handler
    :param file_in: Path for file
    :type file_in: str.
    :returns: file handler
    """
    # reading gz file
    if file_in.endswith('.gz'):
        handle = gzip.open(file_in)
    # else reading unzipped file
    else:
        handle = open(file_in, 'r')
    return handle


class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option(
            '--genome',
            dest='genome',
            help='Genome build i.e. dm3, ce10, hg19'),
        make_option(
            '--gene_annotation',
            dest='gene_annotation',
            help='Additional genome information'),
        make_option(
            '--map_theoretical',
            dest='map_theoretical',
            help='Adding Annotation for Theoretical Mappability information'),
        make_option(
            '--map_empirical',
            dest='map_empirical',
            help='Adding Annotation for Empirical Mappability information'),
        make_option(
            '--gap_regions',
            dest='gap_regions',
            help='Adding Annotation for Gap Regions information'),
        make_option(
            '--gc',
            dest='gc',
            help='Adding Annotation for GC content'),
        make_option(
            '--conservation',
            dest='conservation',
            help='Adding Annotation for Conservation scores'),
        )
    can_import_settings = True
    GENOME_BUILD = None
    ANNOTATION_DIR = 'annotation_server'  # relative to MEDIA_ROOT

    # absolute path to the file store root dir
    ANNOTATION_BASE_DIR = os.path.join(settings.MEDIA_ROOT, ANNOTATION_DIR)
    # create this directory in case it doesn't exist
    if not os.path.isdir(ANNOTATION_BASE_DIR):
        _mkdir(ANNOTATION_BASE_DIR)

    def handle(self, *args, **options):
        if options['genome']:
            self.GENOME_BUILD = options['genome'].strip()
            if self.GENOME_BUILD in SUPPORTED_GENOMES:
                # temp dir should be located on the same file system as the
                # base dir
                self.ANNOTATION_TEMP_DIR = os.path.join(
                    self.ANNOTATION_BASE_DIR, self.GENOME_BUILD)
                # create this directory in case it doesn't exist
                if not os.path.isdir(self.ANNOTATION_TEMP_DIR):
                    _mkdir(self.ANNOTATION_TEMP_DIR)
                if options['gene_annotation']:
                    # Human from GENCODE, fly from FlyBase, worm from WormBase
                    self.geneAnnotation(options['gene_annotation'])
                elif options['map_empirical']:
                    self.mappabilityEmpirical(options['map_empirical'])
                elif options['map_theoretical']:
                    self.mappabilityTheoretical(options['map_theoretical'])
                elif options['gap_regions']:
                    self.gapRegions(options['gap_regions'])
                elif options['gc']:
                    self.gcContent(options['gc'])
                elif options['conservation']:
                    self.conservation(options['conservation'])
            else:
                raise CommandError(
                    'Selected genome build currently not supported')

        else:
            raise CommandError(
                'Please specify which genome to build i.e. hg19, dm3')

    def gcContent(self, wig_file):
        """Function for dealing w/ gc content annotation tracks"""
        logger.debug("annotation_server.gcContent called for genome: "
                     "%s, file: %s", self.GENOME_BUILD, wig_file)
        db_table = self.GENOME_BUILD + "_GC"
        self.addWigAnnotation(wig_file, db_table, "GC")

    def conservation(self, wig_file):
        """Function for dealing conservation annotation tracks"""
        logger.debug("annotation_server.conservation called for genome: "
                     "%s, file: %s", self.GENOME_BUILD, wig_file)
        db_table = self.GENOME_BUILD + "_Conservation"
        self.addWigAnnotation(wig_file, db_table, "conservation")

    def addWigAnnotation(self, wig_file, db_model, annot_type):
        """General function for adding Wig files into the annotation_server
        specifically for Conservation and GC content
        """
        current_table = eval(db_model)
        current_table.objects.all().delete()
        handle = getFileHandle(wig_file)
        for line in handle:
            # TODO: what to do with additional description fields
            if line[0] != '#':
                t1 = line.strip().split(' ')
                # first descriptive line of
                if t1[0] == 'track':
                    # overwrite if already entered into db
                    try:
                        item = WigDescription.objects.get(
                            genome_build=self.GENOME_BUILD,
                            annotation_type=annot_type
                        )
                        item.delete()
                    except (WigDescription.DoesNotExist,
                            WigDescription.MultipleObjectsReturned) \
                            as e:
                        logger.error("%s for genome: %s, annotation_type: %s",
                                     e, self.GENOME_BUILD, annot_type)

                    ret_attr = parse_wig_attribute(line)
                    table_vals = ['name', 'altColor', 'color', 'visibility',
                                  'priority', 'type', 'description']
                    db_string = "WigDescription(genome_build='%s', " \
                                "annotation_type='%s', %s)"
                    db_string = db_string % (
                        self.GENOME_BUILD, annot_type, parse_db_string(
                            ret_attr, table_vals)
                    )
                    # saving to wigDescription model
                    item = eval(db_string)
                    item.save()

                elif t1[0] == 'fixedStep':
                    attr = parse_wig_attribute(line)
                    chrom = attr['chrom']
                    start = int(attr['start'])
                    step = int(attr['step'])
                    curr_pos = start
                else:
                    curr_pos += step
                    # adding to django model
                    wigItem = current_table(annot=item, chrom=chrom,
                                            position=curr_pos, value=t1[0])
                    wigItem.save()

    def mappabilityTheoretical(self, bed_file):
        """Annotation tracks pertaining to Theoretical Mappability
        params: annotation_file
        """
        logger.debug("annotation_server.mappabilityTheoretical called for "
                     "genome: %s, file: %s", self.GENOME_BUILD, bed_file)
        if self.GENOME_BUILD == 'hg19':
            db_table = self.GENOME_BUILD + "_MappabilityTheoretical"
            self.addBedAnnotation(bed_file, db_table)
        else:
            raise CommandError(
                'Theoretical Mappability Annotation track only supported for '
                'hg19 currently'
            )

    def mappabilityEmpirical(self, bed_file):
        """Annotation tracks pertaining to Empirical Mappability
        params: annotation_file
        """
        logger.debug("annotation_server.mappabilityEmpirical called for "
                     "genome: %s, file: %s", self.GENOME_BUILD, bed_file)
        db_table = self.GENOME_BUILD + "_MappabilityEmpirial"
        if (self.GENOME_BUILD == 'hg19' or
                self.GENOME_BUILD == 'dm3' or
                self.GENOME_BUILD == 'ce10'):
            self.addBedAnnotation(bed_file, db_table)
        else:
            raise CommandError(
                'Empirical Mappability Annotation track only supported for '
                'hg19 currently'
            )

    def gapRegions(self, bed_file):
        """Annotation tracks pertaining to GapRegions
        params: annotation_file
        """
        logger.debug("annotation_server.gapRegions called for "
                     "genome: %s, file: %s", self.GENOME_BUILD, bed_file)
        db_table = self.GENOME_BUILD + "_GapRegions"

        if self.GENOME_BUILD == 'hg19' or self.GENOME_BUILD == 'dm3':
            self.addGapRegions(bed_file, db_table)
        else:
            raise CommandError(
                'GapRegions Annotation track only supported for hg19 and dm3')

    def geneAnnotation(self, gff_file):
        """Adding additional annotation tracks from
        Gencode / Wormbase / Flybase based on the GFF file format
        params: annotation_file
        """
        logger.debug("annotation_server.addGeneAnnotation called for "
                     "genome: %s, file: %s", self.GENOME_BUILD, gff_file)

        if self.GENOME_BUILD == 'hg19':
            # Adding Human gencode annotation to refinery models
            # attributes part of the annotation model
            db_table = self.GENOME_BUILD + "_GenCode"
            db_vars = ['gene_id', 'transcript_id', 'gene_type', 'gene_status',
                       'gene_name', 'transcript_type', 'transcript_status',
                       'transcript_name']
            self.addGeneAnnotation(gff_file, db_table, db_vars)

        elif self.GENOME_BUILD == 'ce10':
            db_table = self.GENOME_BUILD + "_WormBase"
            db_vars = ['cds', 'clone', 'gene', 'Name']
            self.addGeneAnnotation(gff_file, db_table, db_vars)

        elif self.GENOME_BUILD == 'dm3':
            db_table = self.GENOME_BUILD + "_FlyBase"
            db_vars = ['Alias', 'description', 'fullname', 'symbol']
            self.addGeneAnnotation(gff_file, db_table, db_vars)

    def addGeneAnnotation(self, gff_file, db_model, table_vals):
        """Function for adding additional gene annotation files
        i.e hg19 gencode, dm3 flybase, ce10 wormbase
        """
        current_table = eval(db_model)
        current_table.objects.all().delete()
        handle = getFileHandle(gff_file)
        for line in handle:
            # TODO: what to do with additional description fields
            if line[0] != '#':
                t1 = line.strip().split('\t')
                attrib = parse_gff_attribute(t1[8])
                db_string = (
                    'current_table(chrom=t1[0], source=t1[1], feature=t1[2], '
                    'start=t1[3], end=t1[4], score=t1[5], strand=t1[6], '
                    'frame=t1[7], attribute=t1[8], %s)'
                )
                parse_db_string(attrib, table_vals)
                db_string = db_string % (parse_db_string(attrib, table_vals))
                item = eval(db_string)
                item.save()

    def addGapRegions(self, bed_file, db_model):
        """Function for adding additional annotation files giving in BED format
        encode project i.e. gap_regions
        """
        logger.debug("annotation_server.addGapRegions called for "
                     "genome: %s, file: %s table: %s",
                     self.GENOME_BUILD, bed_file, db_model)

        current_table = eval(db_model)
        current_table.objects.all().delete()
        handle = getFileHandle(bed_file)
        for line in handle:
            if line[0] != '#':
                t1 = line.strip().split('\t')
                item = current_table(bin=t1[0], chrom=t1[1], chromStart=t1[2],
                                     chromEnd=t1[3], ix=t1[4], n=t1[5],
                                     size=t1[6], type=t1[7], bridge=t1[8])
                item.save()

    def addBedAnnotation(self, bed_file, db_model):
        """Function for adding additional annotation files giving in BED format
        encode project i.e. empirical mappability, theoretical mappability
        """
        logger.debug("annotation_server.addBedAnnotation called for "
                     "genome: %s, file: %s table: %s",
                     self.GENOME_BUILD, bed_file, db_model)

        current_table = eval(db_model)
        current_table.objects.all().delete()
        handle = getFileHandle(bed_file)
        for line in handle:
            if line[0] != '#':
                t1 = line.strip().split('\t')
                item = current_table(
                    chrom=t1[0], chromStart=t1[1], chromEnd=t1[2])
                item.save()
