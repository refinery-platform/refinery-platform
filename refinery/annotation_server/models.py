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


class ChromInfo ( models.Model ):   
    '''
    Format description: Chromosome names and sizes
    '''
    chrom = models.CharField( max_length=255, db_index=True )
    size = models.IntegerField()
    fileName = models.CharField( max_length=255 )
    
    class Meta:
        abstract = True


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
        
class BedFile (models.Model):
    '''
    Generic Model for Bed Files
    Based on http://genome.ucsc.edu/FAQ/FAQformat.html#format1
    '''
    chrom = models.CharField( max_length=255, db_index=True )
    chromStart = models.IntegerField(db_index=True)
    chromEnd = models.IntegerField(db_index=True)
    name = models.CharField( max_length=255, db_index=True )
    score = models.CharField( max_length=255, db_index=True )
    strand = models.CharField( max_length=1 )
    thickStart = models.IntegerField(db_index=True)
    thickEnd = models.IntegerField(db_index=True)
    itemRgb = models.CharField( max_length=255 )
    blockCount = models.IntegerField()
    blockSizes = models.CommaSeparatedIntegerField(max_length=3700)
    blockStarts = models.CommaSeparatedIntegerField(max_length=3700)
    
    def __unicode__(self):
        return self.name + " - " + self.chrom + ":" + self.chromStart + "-" + self.chromEnd
    
    class Meta:
        abstract = True
        
#TODO: 
#Gene annotation (GTF or GFF)
#GC content (WIG files)
#Gap regions (BED files)
#PhastCon conservation score (WIG files)
#Empirial mappability (BED files)
#Theoretical mappability (BED files)
    
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
    
      KEY `chrom` (`chrom`,`bin`),
      KEY `name` (`name`),
      KEY `name2` (`name2`)
    '''
    pass

class hg19_GapRegions ( BedFile ):
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

class dm3_GapRegions ( BedFile ):
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

### TODO ###
# OTHER GENES 
# Mappability
# GC content