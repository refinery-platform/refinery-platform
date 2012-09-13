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
    name = models.CharField( max_length=255, unique=True )
    seq = models.TextField()
    strand = models.CharField( max_length=1, default='+')
    
    def __unicode__(self):
        return self.name
    
    class Meta:
        abstract = True


class Cytoband ( models.Model ):
    '''
    Format description: Describes the positions of cytogenetic bands with a chromosom
    '''
    chrom = models.CharField( max_length=255 )
    chromStart = models.IntegerField()
    chromEnd = models.IntegerField()
    name = models.CharField( max_length=255 )
    gieStain = models.CharField( max_length=255 )
    
    def __unicode__(self):
        return self.chrom + " - " + self.name
    
    class Meta:
        abstract = True


class ChromInfo ( models.Model ):   
    '''
    Format description: Chromosome names and sizes
    '''
    chrom = models.CharField( max_length=255 )
    size = models.IntegerField()
    fileName = models.CharField( max_length=255 )
    
    class Meta:
        abstract = True


class Gene ( models.Model ):   
    '''
    Format description: A gene prediction with some additional info.
    '''
    bin = models.IntegerField()
    name = models.CharField( max_length=255 )
    chrom = models.CharField( max_length=255 )
    strand = models.CharField( max_length=1 )
    txStart = models.IntegerField()
    txEnd = models.IntegerField()
    cdsStart = models.IntegerField()
    cdsEnd = models.IntegerField()
    exonCount = models.IntegerField()
    exonStarts = models.CommaSeparatedIntegerField(max_length=10)
    exonEnds = models.CommaSeparatedIntegerField(max_length=10)
    score = models.IntegerField()
    name2 = models.CharField( max_length=255 )
    cdsStartStat = models.CharField( max_length=1 )
    cdsEndStat = models.CharField( max_length=1 )
    exonFrames = models.CommaSeparatedIntegerField(max_length=10)
    
    def __unicode__(self):
        return self.name + " - " + self.chrom
    
    class Meta:
        abstract = True

##################################################
### CLASSES FOR HG19 
##################################################

class hg19_Sequence( Sequence ):
    '''
    Human, hg19, sequence data
    wget http://hgdownload.cse.ucsc.edu/goldenPath/hg19/bigZips/chromFa.tar.gz  
    
    Indexes:
    "sequence_pkey" PRIMARY KEY, btree (id)
    "sequence_name_key" UNIQUE, btree (name)
    '''
    pass

class hg19_Cytoband( Cytoband ):
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

class hg19_RefGene( Gene ):
    '''
    Based on http://hgdownload.cse.ucsc.edu/goldenPath/hg19/database/refGene.sql
    Database: hg19    Primary Table: refGene    Row Count: 43,699
    Format description: A gene prediction with some additional info.
    
      KEY `chrom` (`chrom`,`bin`),
      KEY `name` (`name`),
      KEY `name2` (`name2`)
    '''
    pass

### TODO ###
# OTHER GENES 
# Mappability
# GC content