import logging

from django.db import models

logger = logging.getLogger(__name__)


# CLASSES FOR Taxonomy Names
class Taxon(models.Model):
    """Model for storing names and NCBI Taxon IDs for organisms"""
    taxon_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=1024)
    unique_name = models.CharField(max_length=1024, blank=True, null=True)
    type = models.CharField(max_length=255, db_index=True)

    class Meta:
        unique_together = ("taxon_id", "name")

    def __unicode__(self):
        return "%s: %s" % (self.taxon_id, self.name)


class GenomeBuild(models.Model):
    """Model that stores UCSC Genome Build Information"""
    name = models.CharField(max_length=255, unique=True)
    affiliation = models.CharField(max_length=255, default='UCSC')
    description = models.CharField(max_length=255)
    species = models.ForeignKey(Taxon)
    html_path = models.CharField(max_length=1024, blank=True, null=True)
    source_name = models.CharField(max_length=1024, blank=True, null=True)
    available = models.BooleanField(default=True)
    default_build = models.BooleanField(default=False)

    def __unicode__(self):
        return "%s: %s" % (self.name, self.description)


def species_to_taxon_id(species_name):
    """return list of (scientific_name, id) tuples for every taxon ID
    :param species_name: species whose taxon ID is unknown
    :type species_name: string
    :returns: list -- list of (scientific_name, id) tuples -- returns the UCSC
    equivalent
    :raises: Taxon.DoesNotExist -- raised if there's no match in db
    """
    ret_list = list()
    query_list = Taxon.objects.filter(name__iexact=species_name)

    if not query_list.count():  # if nothing came back
        raise Taxon.DoesNotExist
    # get unique list of taxon IDs
    query_set = set()
    for item in query_list:
        query_set.add(item.taxon_id)

    for taxon_id in query_set:
        item = Taxon.objects.get(taxon_id=taxon_id, type='scientific name')
        ret_list.append((item.name, item.taxon_id))

    return ret_list


def taxon_id_to_genome_build(taxon_id):
    """Finds the default genome build for this species given the name
    :param taxon_id: NCBI taxonomy ID
    :type taxon_id: integer
    :returns: string -- default_genome_build
    """
    org = Taxon.objects.get(taxon_id=taxon_id, type='scientific name')
    default_gb = GenomeBuild.objects.get(default_build=True, species=org).name
    return default_gb


def species_to_genome_build(species_name):
    """Finds the default genome build for this species given the name
    :param species_name: species whose taxon ID is unknown
    :type species_name: string
    :returns: list -- list of (species_scientific_name, default_genome_build)
    tuples
    :raises: Taxon.DoesNotExist, GenomeBuild.DoesNotExist
    """
    ret_list = list()
    query_list = Taxon.objects.filter(name__iexact=species_name)

    if not query_list.count():  # if no species matches the given name
        raise Taxon.DoesNotExist
    # get unique list of taxon IDs
    query_set = set()
    for item in query_list:
        query_set.add(item.taxon_id)

    for taxon_id in query_set:
        try:
            org = Taxon.objects.get(taxon_id=taxon_id, type='scientific name')
            default_gb = GenomeBuild.objects.get(
                default_build=True, species=org).name
            ret_list.append((org.name, default_gb))
        except GenomeBuild.DoesNotExist:
            pass

    if not len(ret_list):  # if no genome build matches to species
        raise GenomeBuild.DoesNotExist

    return ret_list


def genome_build_to_species(genome_build):
    """Returns the NCBI taxon ID of the species associated with the genome
    build provided
    :param genome_build: genome build whose associated species is not known
    :type genome_build: string
    :returns: tuple -- returns a tuple of (species name, species taxon ID) or
    raises an error
    """
    gb = GenomeBuild.objects.get(name__icontains=genome_build)
    return gb.species.name, gb.species.taxon_id


# Gene Annotation Models
class CytoBand (models.Model):
    """Format description: Describes the positions of cytogenetic bands with a
    chromosome
    """
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    chrom = models.CharField(max_length=255)
    chromStart = models.IntegerField(db_index=True)
    chromEnd = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    gieStain = models.CharField(max_length=255)

    def __unicode__(self):
        return self.chrom + " - " + self.name

    class Meta:
        ordering = ['chrom', 'chromStart']


class ChromInfo (models.Model):
    """Format description: Chromosome names and sizes"""
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    chrom = models.CharField(max_length=255, db_index=True)
    size = models.IntegerField()
    fileName = models.CharField(max_length=255)

    class Meta:
        ordering = ['-size']


class Gene (models.Model):
    """Format description: A gene prediction with some additional info"""
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    bin = models.IntegerField()
    name = models.CharField(max_length=255, db_index=True)
    chrom = models.CharField(max_length=255, db_index=True)
    strand = models.CharField(max_length=1)
    txStart = models.IntegerField(db_index=True)
    txEnd = models.IntegerField(db_index=True)
    cdsStart = models.IntegerField(db_index=True)
    cdsEnd = models.IntegerField(db_index=True)
    exonCount = models.IntegerField()
    exonStarts = models.CommaSeparatedIntegerField(max_length=3700,
                                                   db_index=True)
    exonEnds = models.CommaSeparatedIntegerField(max_length=3700,
                                                 db_index=True)
    score = models.IntegerField()
    name2 = models.CharField(max_length=255, db_index=True)
    cdsStartStat = models.CharField(max_length=10, db_index=True)
    cdsEndStat = models.CharField(max_length=10, db_index=True)
    exonFrames = models.CommaSeparatedIntegerField(max_length=3700)

    def __unicode__(self):
        return self.name + " - " + self.chrom

    class Meta:
        ordering = ['chrom', 'txStart']


class GapRegionFile(models.Model):
    """Annotation files for gap regions
    #bin  chrom  chromStart  chromEnd  ix  n  size  type  bridge
    """
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    bin = models.IntegerField()
    chrom = models.CharField(max_length=255, db_index=True)
    chromStart = models.IntegerField(db_index=True)
    chromEnd = models.IntegerField(db_index=True)
    ix = models.IntegerField(db_index=True)
    n = models.CharField(max_length=255)
    size = models.IntegerField(db_index=True)
    type = models.CharField(max_length=255)
    bridge = models.CharField(max_length=255)

    def __unicode__(self):
        return self.chrom + ":" + self.chromStart + "-" + self.chromEnd

    class Meta:
        ordering = ['chrom', 'chromStart']


class WigDescription(models.Model):
    """Model for storing description of WigFiles for GC and PhastCon models"""
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    annotation_type = models.CharField(max_length=255)
    name = models.CharField(max_length=1024)
    altColor = models.CharField(max_length=255)
    color = models.CharField(max_length=255)
    visibility = models.CharField(max_length=255)
    priority = models.IntegerField()
    type = models.CharField(max_length=255)
    description = models.TextField()

    def __unicode__(self):
        return self.name + "=" + self.description + ", " + self.type


class BedFile (models.Model):
    """Generic Model for Bed Files
    Based on http://genome.ucsc.edu/FAQ/FAQformat.html#format1
    """
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    chrom = models.CharField(max_length=255, db_index=True)
    chromStart = models.IntegerField(db_index=True)
    chromEnd = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255)
    score = models.CharField(max_length=255)
    strand = models.CharField(max_length=1)
    thickStart = models.IntegerField(null=True)
    thickEnd = models.IntegerField(null=True)
    itemRgb = models.CharField(max_length=255)
    blockCount = models.IntegerField(null=True)
    blockSizes = models.CommaSeparatedIntegerField(max_length=3700)
    blockStarts = models.CommaSeparatedIntegerField(max_length=3700)

    def __unicode__(self):
        return self.name + " - " + self.chrom + ":" \
               + self.chromStart + "-" + self.chromEnd

    class Meta:
        abstract = True
        ordering = ['chrom', 'chromStart']


class GffFile (models.Model):
    """Generic Model for GFF
    http://genome.ucsc.edu/FAQ/FAQformat.html#format2
    """
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    chrom = models.CharField(max_length=255, db_index=True)
    source = models.CharField(max_length=100)
    feature = models.CharField(max_length=100)
    start = models.IntegerField(db_index=True)
    end = models.IntegerField(db_index=True)
    score = models.CharField(max_length=100)
    strand = models.CharField(max_length=1)
    frame = models.CharField(max_length=100)
    attribute = models.TextField()

    def __unicode__(self):
        return self.feature + " - " + self.chrom + ":" + \
               self.start + "-" + self.end

    class Meta:
        abstract = True
        ordering = ['chrom', 'start']


class GtfFile (GffFile):
    """Generic Model for GTF Files
    http://genome.ucsc.edu/FAQ/FAQformat.html#format3
    """
    gene_id = models.CharField(max_length=255, db_index=True)
    transcript_id = models.CharField(max_length=255, db_index=True)

    def __unicode__(self):
        return self.gene_id + " - " + self.chrom + ":" + \
               self.start + "-" + self.end

    class Meta:
        abstract = True


class WigFile(models.Model):
    """Abstract Base class for storing Wiggle file format data i.e. GC and
    Phastcon data
    Following format description on
    http://genome.ucsc.edu/goldenPath/help/wiggle.html
    Currently only supporting FixedStep
    """
    genomebuild = models.ForeignKey('GenomeBuild', null=True, default=None)
    chrom = models.CharField(max_length=255, db_index=True)
    position = models.IntegerField(db_index=True)
    value = models.FloatField()

    def __unicode__(self):
        return self.chrom + ":" + self.position + " = " + self.value

    class Meta:
        abstract = True
        ordering = ['chrom', 'position']


# Models derived from other models

class EmpiricalMappability(BedFile):
    """Empirical Mappability track"""
    pass


class TheoreticalMappability(BedFile):
    """Theoretical Mappability track"""
    pass


class GCContent(WigFile):
    """GC Content annotation track for modEncode project"""
    annot = models.ForeignKey(WigDescription)


class ConservationTrack(WigFile):
    """Conserved region annotation track for modEncode project"""
    annot = models.ForeignKey(WigDescription)


# CLASSES FOR extra tables

class hg19_GenCode(GtfFile):
    """Gencode gene annotation track
    ftp://ftp.sanger.ac.uk/pub/gencode/release_10/gencode.v10.annotation.gtf.gz
    ['gene_id', 'transcript_id', 'gene_type', 'gene_status', 'gene_name',
    'transcript_type', 'transcript_status', 'transcript_name', 'level',
    'havana_gene', 'havana_transcript', 'ont', 'tag', 'ccdsid']
    """
    gene_type = models.CharField(max_length=100, db_index=True)
    gene_status = models.CharField(max_length=100, db_index=True)
    gene_name = models.CharField(max_length=100, db_index=True)
    transcript_type = models.CharField(max_length=100, db_index=True)
    transcript_status = models.CharField(max_length=100, db_index=True)
    transcript_name = models.CharField(max_length=100, db_index=True)


class ce10_WormBase(GffFile):
    """Wormbase gene annotation track
    ftp://ftp.wormbase.org/pub/wormbase/releases/WS220/species/c_elegans/c_elegans.WS220.annotations.gff3.gz
    ['cds', 'clone', 'gene', 'ID', 'Name']
    """
    cds = models.CharField(max_length=100)
    clone = models.CharField(max_length=100)
    gene = models.CharField(max_length=100)


class dm3_FlyBase(GffFile):
    """Flybase gene annotation track
    ftp://ftp.flybase.net/genomes/Drosophila_melanogaster/dmel_r5.45_FB2012_03/gff/dmel-all-r5.45.gff.gz
    """
    name = models.CharField(max_length=100)
    Alias = models.TextField()
    description = models.CharField(max_length=255)
    fullname = models.CharField(max_length=100)
    symbol = models.CharField(max_length=100)
