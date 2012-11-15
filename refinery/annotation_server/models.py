from django.db import models
from datetime import datetime
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class Sequence ( models.Model ):
    '''
    Genomic sequence data
    '''
    seq_id = models.AutoField(primary_key=True)
    name = models.CharField( max_length=255, unique=True, db_index=True )
    seq = models.TextField()
    strand = models.CharField( max_length=1, default='+')
    
    def __unicode__(self):
        return self.name
    
    class Meta:
        abstract = True


class CytoBand ( models.Model ):
    '''
    Format description: Describes the positions of cytogenetic bands with a chromosom
    '''
    chrom = models.CharField( max_length=255 )
    chromStart = models.IntegerField(db_index=True)
    chromEnd = models.IntegerField(db_index=True)
    name = models.CharField( max_length=255, db_index=True )
    gieStain = models.CharField( max_length=255 )
    
    def __unicode__(self):
        return self.chrom + " - " + self.name
    
    class Meta:
        abstract = True
        ordering = ['chrom', 'chromStart']

class ChromInfo ( models.Model ):   
    '''
    Format description: Chromosome names and sizes
    '''
    chrom = models.CharField( max_length=255, db_index=True )
    size = models.IntegerField()
    fileName = models.CharField( max_length=255 )
    
    class Meta:
        abstract = True
        ordering = ['-size']


class Gene ( models.Model ):   
    '''
    Format description: A gene prediction with some additional info.
    '''
    bin = models.IntegerField()
    name = models.CharField( max_length=255, db_index=True )
    chrom = models.CharField( max_length=255, db_index=True )
    strand = models.CharField( max_length=1 )
    txStart = models.IntegerField(db_index=True)
    txEnd = models.IntegerField(db_index=True)
    cdsStart = models.IntegerField(db_index=True)
    cdsEnd = models.IntegerField(db_index=True)
    exonCount = models.IntegerField()
    exonStarts = models.CommaSeparatedIntegerField(max_length=3700, db_index=True)
    exonEnds = models.CommaSeparatedIntegerField(max_length=3700, db_index=True)
    score = models.IntegerField()
    name2 = models.CharField( max_length=255, db_index=True )
    cdsStartStat = models.CharField( max_length=10, db_index=True )
    cdsEndStat = models.CharField( max_length=10, db_index=True )
    exonFrames = models.CommaSeparatedIntegerField(max_length=3700)
    
    def __unicode__(self):
        return self.name + " - " + self.chrom
    
    class Meta:
        abstract = True
        ordering = ['chrom', 'txStart']
        
class BedFile (models.Model):
    '''
    Generic Model for Bed Files
    Based on http://genome.ucsc.edu/FAQ/FAQformat.html#format1
    '''
    chrom = models.CharField( max_length=255, db_index=True )
    chromStart = models.IntegerField(db_index=True)
    chromEnd = models.IntegerField(db_index=True)
    name = models.CharField( max_length=255 )
    score = models.CharField( max_length=255 )
    strand = models.CharField( max_length=1 )
    thickStart = models.IntegerField(null=True)
    thickEnd = models.IntegerField(null=True)
    itemRgb = models.CharField( max_length=255 )
    blockCount = models.IntegerField(null=True)
    blockSizes = models.CommaSeparatedIntegerField(max_length=3700)
    blockStarts = models.CommaSeparatedIntegerField(max_length=3700)
    
    def __unicode__(self):
        return self.name + " - " + self.chrom + ":" + self.chromStart + "-" + self.chromEnd
    
    class Meta:
        abstract = True
        ordering = ['chrom', 'chromStart']
        
class GffFile (models.Model):
    '''
    Generic Model for GFF
    http://genome.ucsc.edu/FAQ/FAQformat.html#format2
    '''      
    chrom = models.CharField( max_length=255, db_index=True )
    source = models.CharField( max_length=100 )
    feature = models.CharField( max_length=100 )
    start = models.IntegerField(db_index=True)
    end = models.IntegerField(db_index=True)
    score = models.CharField( max_length=100 )
    strand = models.CharField( max_length=1 )
    frame = models.CharField( max_length=100 )
    attribute = models.TextField()
    
    def __unicode__(self):
        return self.feature + " - " + self.chrom + ":" + self.start + "-" + self.end
    
    class Meta:
        abstract = True
        ordering = ['chrom', 'start']
 
class GtfFile (GffFile):
    '''
    Generic Model for GTF Files
    http://genome.ucsc.edu/FAQ/FAQformat.html#format3
    '''     
    gene_id = models.CharField( max_length=255, db_index=True )
    transcript_id = models.CharField( max_length=255, db_index=True )
    
    def __unicode__(self):
        return self.gene_id + " - " + self.chrom + ":" + self.start + "-" + self.end
    
    class Meta:
        abstract = True


class GapRegionFile (models.Model):
    '''
    Annotation files for gap regions
    #bin    chrom   chromStart      chromEnd        ix      n       size    type    bridge
    ''' 
    bin = models.IntegerField()    
    chrom = models.CharField( max_length=255, db_index=True )   
    chromStart = models.IntegerField(db_index=True)     
    chromEnd = models.IntegerField(db_index=True)        
    ix = models.IntegerField(db_index=True)      
    n = models.CharField( max_length=255 )       
    size = models.IntegerField(db_index=True)    
    type = models.CharField( max_length=255)    
    bridge = models.CharField( max_length=255 )

    def __unicode__(self):
        return self.chrom + ":" + self.chromStart + "-" + self.chromEnd
    
    class Meta:
        abstract = True
        ordering = ['chrom', 'chromStart']
        
class WigFile(models.Model):
    '''
    Abstract Base class for storing Wiggle file format data i.e. GC and Phastcon data
    Following format description on http://genome.ucsc.edu/goldenPath/help/wiggle.html
    Currently only supporting FixedStep
    '''
    chrom = models.CharField( max_length=255, db_index=True ) 
    position = models.IntegerField(db_index=True)  
    value = models.FloatField()
    
    def __unicode__(self):
        return self.chrom + ":" + self.position + " = " + self.value
    
    class Meta:
        abstract = True
        ordering = ['chrom', 'position']


##################################################
### General organizational models
##################################################

#class AvailableAnnotations(models.Model):
    '''
    Model for keep tracking of which annotation files are currently available
    i.e. sequence, chrominfo, gc, conservation, gene tracks, extended gene tracks
    '''
    #genome_build = models.CharField( max_length=255 )
    #annotation_type = models.CharField( max_length=255 )
    #table_name = models.CharField( max_length=255 )
    #description = models.CharField( max_length=255 )
    #file_store_uuid = 
    
    ## TODO: file_store uuid?       


class WigDescription(models.Model):
    '''
    Model for storing description of WigFiles for GC and PhastCon models
    '''
    genome_build = models.CharField( max_length=255 ) 
    annotation_type = models.CharField( max_length=255 )
    name = models.CharField( max_length=1024 )
    altColor = models.CharField( max_length=255 )  
    color = models.CharField( max_length=255 )    
    visibility  = models.CharField( max_length=255 )  
    priority = models.IntegerField()  
    type = models.CharField( max_length=255 )  
    description = models.TextField()
    
    def __unicode__(self):
        return self.name + "=" + self.description + ", " + self.type
    
##################################################
### CLASSES FOR Taxonomy Names 
##################################################
class Taxon(models.Model):
    '''
    Model for storing names and NCBI Taxon IDs for organisms
    '''
    taxon_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=1024)
    unique_name = models.CharField(max_length=1024, blank=True, null=True)
    type = models.CharField(max_length=255, db_index=True)

    class Meta:
        unique_together = ("taxon_id", "name")

    def __unicode__(self):
        return "%s: %s" % (self.taxon_id, self.name)


class Genome_Build(models.Model):
    '''
    Model that stores UCSC Genome Build Information
    '''
    name = models.CharField(max_length=255, unique=True)
    affiliation = models.CharField(max_length=255, default='UCSC')
    description = models.CharField(max_length=255)
    organism = models.ForeignKey(Taxon)
    html_path = models.CharField(max_length=1024, blank=True, null=True)
    source_name = models.CharField(max_length=1024, blank=True, null=True)
    available = models.BooleanField(default=True)
    default_build = models.BooleanField(default=False)
    ucsc_equivalent = models.ForeignKey('Genome_Build', blank=True, null=True)
    
    def __unicode__(self):
        return "%s: %s" % (self.name, self.description)


def organism_to_id(organism_name):
    '''
    return list of (scientific_name, id) tuples for every taxon ID

    :param organism_name: organism whose taxon ID is unknown
    :type organism_name: str
    :returns: list -- list of (scientific_name, id) tuples -- returns the UCSC equivalent
    :raises: Taxon.DoesNotExist -- raised if there's no match in db
    '''
    ret_list = list()
    query_list = Taxon.objects.filter(name__iexact=organism_name)
    
    if not query_list.count(): #if nothing came back
        raise Taxon.DoesNotExist
    
    #get unique list of taxon IDs
    query_set = set()
    for item in query_list:
        query_set.add(item.taxon_id)
    
    for id in query_set:
        item = Taxon.objects.get(taxon_id=id, type='scientific name')
        ret_list.append((item.name, item.taxon_id))

    return ret_list

def taxon_id_to_genome_build(taxon_id):
    '''
    Finds the default genome build for this organism given the name.

    :param taxon_id: NCBI taxonomy ID
    :type taxon_id: integer
    :returns: str -- default_genome_build
    '''
    org = Taxon.objects.get(taxon_id=taxon_id, type='scientific name')
    default_gb = Genome_Build.objects.get(default_build=True, organism=org).name
    return default_gb

def organism_to_genome_build(organism_name):
    '''
    Finds the default genome build for this organism given the name.

    :param organism_name: organism whose taxon ID is unknown
    :type organism_name: str
    :returns: list -- list of (organism_scientific_name, default_genome_build) tuples
    :raises: Taxon.DoesNotExist, Genome_Build.DoesNotExist
    '''
    ret_list = list()
    query_list = Taxon.objects.filter(name__iexact=organism_name)
    
    if not query_list.count(): #if no organism matches the given name
        raise Taxon.DoesNotExist
    
    #get unique list of taxon IDs
    query_set = set()
    for item in query_list:
        query_set.add(item.taxon_id)
    
    for id in query_set:
        try:
            org = Taxon.objects.get(taxon_id=id, type='scientific name')
            default_gb = Genome_Build.objects.get(default_build=True, organism=org).name
            ret_list.append((org.name, default_gb))
        except Genome_Build.DoesNotExist:
            pass
    
    if not len(ret_list): #if no genome build matches to organism
        raise Genome_Build.DoesNotExist
    
    return ret_list

def resolve_to_ucsc_genome_build(alt_genome_build):
    '''
    returns the UCSC equivalent of a non-UCSC genome build name if an equivalent exists

    :param alt_genome_build: non-UCSC genome build name
    :type alt_genome_build: str
    :returns: str -- returns the UCSC equivalent genome build name
    :raises: Genome_Build.DoesNotExist
    '''
    try:
        genome_build = Genome_Build.objects.exclude(affiliation='UCSC').get(name__icontains=alt_genome_build)
    except:
        raise

    try:
        return genome_build.ucsc_equivalent.name
    except:
        raise Genome_Build.DoesNotExist

def genome_build_to_species_id(genome_build):
    '''
    Returns the NCBI taxon ID of the organism associated with the genome build provided

    :param genome_build: genome build whose associated organism is not known
    :type genome_build: str
    :returns: integer -- returns the taxon ID of the organism or raises an error  
    '''
    try:
        gb = Genome_Build.objects.get(name=genome_build)
    except:
        #something went very wrong, so just re-raise whatever the problem was
        raise
    return gb.organism.taxon_id

##################################################
### CLASSES FOR Human, hg19 
##################################################

class hg19_Sequence( Sequence ):
    '''
    Human, hg19, sequence data
    wget http://hgdownload.cse.ucsc.edu/goldenPath/hg19/bigZips/chromFa.tar.gz  
    '''
    pass

class hg19_CytoBand( CytoBand ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/hg19/database/cytoBand.sql  
    Database: hg19    Primary Table: cytoBand    Row Count: 862
    Format description: Describes the positions of cytogenetic bands with a chromosom
    '''
    pass

class hg19_ChromInfo( ChromInfo ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/hg19/database/chromInfo.sql  
    Database: hg19    Primary Table: chromInfo    Row Count: 93
    Format description: Chromosome names and sizes
    '''
    pass

class hg19_EnsGene( Gene ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/hg19/database/ensGene.sql
    Database: hg19    Primary Table: refGene    Row Count: 43,699
    Format description: A gene prediction with some additional info.
    '''
    pass

class hg19_GapRegions ( GapRegionFile ):
    '''
    Gap Regions track
    /data/home/hojwk/sharedData/modENCODE/Others/gap/human.hg19.gap.txt
    '''
    pass

class hg19_MappabilityEmpirial ( BedFile ):
    '''
    Empirical Mappability track
    /data/home/hojwk/sharedData/modENCODE/annotation/mappable/mappable.hg19.lucy.bed
    '''
    pass

class hg19_MappabilityTheoretical ( BedFile ):
    '''
    Empirical Theoretical track
    /data/home/hojwk/sharedData/modENCODE/annotation/mappable/mappable.hg19.anshul.25.bed
    '''
    pass

class hg19_GenCode ( GtfFile ):
    '''
    Gencode gene annotation track
    ftp://ftp.sanger.ac.uk/pub/gencode/release_10/gencode.v10.annotation.gtf.gz
    ['gene_id', 'transcript_id', 'gene_type', 'gene_status', 'gene_name', 'transcript_type', 'transcript_status', 'transcript_name', 'level', 'havana_gene', 'havana_transcript', 'ont', 'tag', 'ccdsid']
    '''
    gene_type = models.CharField( max_length=100, db_index=True )
    gene_status = models.CharField( max_length=100, db_index=True )
    gene_name = models.CharField( max_length=100, db_index=True )
    transcript_type = models.CharField( max_length=100, db_index=True )
    transcript_status = models.CharField( max_length=100, db_index=True )
    transcript_name = models.CharField( max_length=100, db_index=True )

class hg19_GC (WigFile):
    '''
    GC Content annotation track for modEncode project
    /data/home/hojwk/sharedData/modENCODE/human/GC/GC.wig
    '''
    annot = models.ForeignKey(WigDescription)
    pass

class hg19_Conservation (WigFile):
    '''
    GC Content annotation track for modEncode project
    /data/home/hojwk/sharedData/modENCODE/human/GC/GC.wig
    '''
    annot = models.ForeignKey(WigDescription)
    pass


##################################################
### CLASSES FOR Worm, ce10 
##################################################

class ce10_Sequence( Sequence ):
    '''
    Human, ce10, sequence data
    wget http://hgdownload.cse.ucsc.edu/goldenPath/ce10/bigZips/chromFa.tar.gz  
    '''
    pass

class ce10_CytoBand( CytoBand ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/ce10/database/cytoBand.sql  
    Database: ce10    Primary Table: cytoBance10
    Format description: Describes the positions of cytogenetic bands with a chromosom
    '''
    pass

class ce10_ChromInfo( ChromInfo ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/ce10/database/chromInfo.sql  
    Database: ce10    Primary Table: chromInfo   
    Format description: Chromosome names and sizes
    '''
    pass

class ce10_EnsGene( Gene ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/ce10/database/ensGene.sql
    Database: ce10    Primary Table: ensGene    
    Format description: A gene prediction with some additional info.
    
    '''
    pass

class ce10_MappabilityEmpirial ( BedFile ):
    '''
    Empirical Mappability track
    /data/home/hojwk/sharedData/modENCODE/annotation/mappable/mappable.ce10.lucy.bed
    '''
    pass

class ce10_WormBase ( GffFile ):
    '''
    Wormbase gene annotation track
    ftp://ftp.wormbase.org/pub/wormbase/releases/WS220/species/c_elegans/c_elegans.WS220.annotations.gff3.gz['cds', 'clone', 'gene', 'ID', 'Name']
    '''
    cds = models.CharField( max_length=100 )
    clone = models.CharField( max_length=100 )
    gene = models.CharField( max_length=100 )
    
class ce10_GC (WigFile):
    '''
    GC Content annotation track for modEncode project
    /data/home/hojwk/sharedData/modENCODE/worm/GC/GC.wig
    '''
    annot = models.ForeignKey(WigDescription)
    pass

class ce10_Conservation (WigFile):
    '''
    GC Content annotation track for modEncode project
    /data/home/hojwk/sharedData/modENCODE/worm/GC/GC.wig
    '''
    annot = models.ForeignKey(WigDescription)
    pass
    
##################################################
### CLASSES FOR Fly, dm3 
##################################################

class dm3_Sequence( Sequence ):
    '''
    Human, dm3, sequence data
    wget http://hgdownload.cse.ucsc.edu/goldenPath/dm3/bigZips/chromFa.tar.gz  
    '''
    pass

class dm3_CytoBand( CytoBand ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/dm3/database/cytoBand.sql  
    Database: dm3    Primary Table: cytoBance10
    Format description: Describes the positions of cytogenetic bands with a chromosom
    '''
    pass

class dm3_ChromInfo( ChromInfo ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/dm3/database/chromInfo.sql  
    Database: dm3    Primary Table: chromInfo   
    Format description: Chromosome names and sizes
    '''
    pass

class dm3_EnsGene( Gene ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/dm3/database/ensGene.sql
    Database: dm3    Primary Table: ensGene    
    Format description: A gene prediction with some additional info.
    '''
    pass

class dm3_GapRegions ( GapRegionFile ):
    '''
    Gap Regions track
    /data/home/hojwk/sharedData/modENCODE/Others/gap/human.dm3.gap.txt
    '''
    pass

class dm3_MappabilityEmpirial ( BedFile ):
    '''
    Empirical Mappability track
    /data/home/hojwk/sharedData/modENCODE/annotation/mappable/mappable.dm3.lucy.bed
    '''
    pass

class dm3_FlyBase ( GffFile ):
    '''
    Flybase gene annotation track
    ftp://ftp.flybase.net/genomes/Drosophila_melanogaster/dmel_r5.45_FB2012_03/gff/dmel-all-r5.45.gff.gz
    '''
    name = models.CharField( max_length=100 )
    Alias = models.TextField()
    description = models.CharField( max_length=255 )
    fullname = models.CharField( max_length=100 )
    symbol = models.CharField( max_length=100 )
    
class dm3_GC (WigFile):
    '''
    GC Content annotation track for modEncode project
    /data/home/hojwk/sharedData/modENCODE/fly/GC/GC.wig
    '''
    annot = models.ForeignKey(WigDescription)
    pass

class dm3_Conservation (WigFile):
    '''
    GC Content annotation track for modEncode project
    /data/home/hojwk/sharedData/modENCODE/fly/GC/GC.wig
    '''
    annot = models.ForeignKey(WigDescription)
    pass

