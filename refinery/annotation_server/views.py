# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseNotFound
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.conf import settings
import simplejson, re
from django.db import connection
from datetime import datetime
from django.http import Http404
from django.core.urlresolvers import resolve
from decimal import *
from annotation_server.models import *
from annotation_server.utils import *
import logging
from django.db.models import Q

# get module logger
logger = logging.getLogger(__name__)

def search_genes(request, genome, search_string):
    """ 
    Function for searching basic gene table currently: Ensembl (EnsGene table from UCSC genome browser)
    """
    logger.debug("annotation_server.search_genes called for genome: %s search: %s" % (genome, search_string))     
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_EnsGene")
        curr_vals = current_table.objects.filter(
                                                 Q(name__contains=search_string) | Q(name2__contains=search_string)
                                                 ).values('name', 'chrom', 'strand', 'txStart', 'txEnd', 'cdsStart', 'cdsEnd', 'exonCount', 'exonStarts', 'exonEnds')
        
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
           
    # Postbio query
    #cursor = connection.cursor() 
    #query = """Select a.name, a.symbol, a.synonyms,
    #<b.region as start, #>b.region as end, b.chrom FROM (SELECT name, symbol,
    #synonyms from dm3.flybase2004xref where symbol ilike '%s') a JOIN
    #(SELECT f.name, f.region, f.seq_id, s.name as chrom FROM dm3.flybase f JOIN
    #dm3.sequence s ON f.seq_id = s.id where s.name = 'chr2L' OR s.name = 'chr2R'
    #OR s.name = 'chr3L' OR s.name = 'chr3R' OR s.name = 'chr4' OR s.name =
    #'chrX' )  b ON a.name = b.name """ % (search_string)
    #cursor.execute(query)
    
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def search_extended_genes(request, genome, search_string):
    """ 
    Function for searching extended gene tables currently: GenCode (hg19), Flybase (dm3), or Wormbase (ce10)
    """
    logger.debug("annotation_server.search_extended_genes called for genome: %s search: %s" % (genome, search_string))


    # extended genes
    #url(r'^search_genes/(?P<genome>[a-zA-Z0-9]+)/(?P<search_string>[a-zA-Z0-9]+)/$', 'search_genes' ),
    # extended genes
    #url(r'^get_genes/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/(?P<start>[0-9]+)/(?P<end>[0-9]+)/$', 'get_genes' ),
    

def get_sequence(request, genome, chrom, start, end):
    """ 
    returns sequence for a specified chromosome start and end
    """
    logger.debug("annotation_server.get_sequence called for genome: %s chrom: %s" % (genome, chrom))     
    offset = int(end) - int(start)
    
    # NO SUBSTRING METHOD USING DJANGO ORM
    if genome in SUPPORTED_GENOMES:
        cursor = connection.cursor()   
        db_table = 'annotation_server_dm3_sequence'
        query = """select name as chrom, substr(seq, %s, %s) as seq from annotation_server_%s_sequence where name = '%s'""" % (start, offset, genome, chrom)
        cursor.execute(query)
        return HttpResponse(cursor_to_json(cursor), 'application/javascript') 
    else:
        return HttpResponse(status=400)

    # POSTBIO QUERY
    #cursor = connection.cursor() 
    #query = """select name as chrom, substr(seq, %s, %s) as seq from %s.sequence where name = '%s'""" % (start, offset, genome, chrom)
    #cursor.execute(query)
    #return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_length(request, genome):
    """
    Returns all chromosome lengths depending on genome i.e. dm3, hg18, etc.
    """
    logger.debug("annotation_server.get_length called for genome: %s" % (genome))     
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_ChromInfo")
        data = ValuesQuerySetToDict(current_table.objects.values('chrom', 'size'))
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
    # POSTBIO QUERY
    #cursor = connection.cursor() 
    #query = """SELECT chrom, size from %s.chrominfo where chrom !~* '_' order by size desc""" % (genome)   
    #cursor.execute(query)
    #return HttpResponse(cursor_to_json(cursor), 'application/javascript')


def get_chrom_length(request, genome, chrom):
    """
    returns the length of a specified chromosome
    """
    logger.debug("annotation_server.get_chrom_length called for genome: %s chromosome: %s" % (genome, chrom))     
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_ChromInfo")
        curr_vals = current_table.objects.filter(chrom__iexact=chrom).values('chrom', 'size')
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
    # TODO: return genome lengths according to chrom order i.e. 1,2,3 etc. 
    #cursor = connection.cursor() 
    #if (chrom):
    #    query = """SELECT chrom, size from %s.chrominfo where chrom ilike '%s'""" % (genome, chrom)
    #cursor.execute(query)
    #return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_cytoband(request, genome, chrom):
    """
    returns the length of a specified chromosome
    """
    logger.debug("annotation_server.get_cytoband called for genome: %s chromosome: %s" % (genome, chrom))     
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_CytoBand")
        curr_vals = current_table.objects.filter(chrom__iexact=chrom).values('chrom', 'chromStart', 'chromEnd', 'name', 'gieStain')
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
    #cursor = connection.cursor() 
    #query = """SELECT s.name as chrom, #<region as start, #>region as end, region_name from dm3.cytobandideo c join dm3.sequence s on s.id = c.seq_id where s.name ilike '%s' order by region;""" % (chrom)
    #cursor.execute(query)
    #return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_genes(request, genome, chrom, start, end):
    """
    gets a list of genes within a range i.e. gene start, cds, gene symbol
    """
    logger.debug("annotation_server.get_genes called for genome: %s chromosome: %s" % (genome, chrom))  
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_EnsGene")
        curr_vals = current_table.objects.filter(
                                                 Q(chrom__iexact=chrom),
                                                 Q(cdsStart__range=(start, end)) | Q(cdsEnd__range=(start, end))
                                                 ).values('name', 'chrom', 'strand', 'txStart', 'txEnd', 'cdsStart', 'cdsEnd', 'exonCount', 'exonStarts', 'exonEnds')
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
    
    # Postbio query
    #cursor = connection.cursor()    
    #query = """SELECT x.symbol, r.name, #<r.region as start, #>r.region as end, case when r.same_orient then '+' else '-' end as strand, #<r.cds as cds_start, #>r.cds as cds_end from dm3.flybase r join dm3.flyBase2004Xref x on r.name = x.name JOIN (select id, name from dm3.sequence where name = '%s') n ON n.id = r.seq_id and region && int_interval '(%s,%s)' order by region""" % (chrom, start, end)
    #cursor.execute(query) 
    #return HttpResponse(cursor_to_json(cursor), 'application/javascript')

'''
def get_exons(request, genome, chrom, start, end):
    #Get list of all gene exons within a specified range
    
    print "annotation_server.get_exons"
    
    cursor = connection.cursor()    
    query = """select x.symbol, r.name, s.name as chrom, case when r.same_orient then '+' else '-' end as strand, #<r.region as gene_start, #>r.region as gene_end, #<e.region as exonstart, #>e.region as exonend, exon_id from dm3.flybase r join dm3.sequence s on r.seq_id=s.id join dm3.flybase_exon ie on isoform_id=r.id join dm3.exon e on exon_id=e.id join dm3.flyBase2004Xref x on r.name = x.name where s.name = '%s' and r.region && int_interval'(%s,%s)' order by r.id, #<e.region""" % (chrom, start, end) 
    print query
    cursor.execute(query)
    
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')
    '''

def get_gc(request, genome, chrom, start, end):
    """
    gets GC content within a range i.e. gene start, cds, gene symbol
    """
    logger.debug("annotation_server.get_gc called for genome: %s chromosome: %s:%s-%s" % (genome, chrom, start, end))  
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_GC")
        curr_vals = current_table.objects.filter(
                                                 Q(chrom__iexact=chrom),
                                                 Q(position__range=(start, end)),
                                                 ).values('chrom', 'position', 'value')
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
    
def get_maptheo(request, genome, chrom, start, end):
    """
    gets Theoretical Mappability annotation track within a range i.e. gene start, cds, gene symbol
    """
    logger.debug("annotation_server.get_maptheo called for genome: %s chromosome: %s:%s-%s" % (genome, chrom, start, end))  
    
    if genome in MAPPABILITY_THEORETICAL:
        current_table = eval(genome+ "_MappabilityTheoretical")
        curr_vals = current_table.objects.filter(
                                                 Q(chrom__iexact=chrom),
                                                 Q(chromStart__range=(start, end)) | Q(chromEnd__range=(start, end))
                                                 ).values('chrom', 'chromStart', 'chromEnd' )
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
def get_mapemp(request, genome, chrom, start, end):
    """
    gets Theoretical Mappability annotation track within a range
    """
    logger.debug("annotation_server.get_mapemp called for genome: %s chromosome: %s:%s-%s" % (genome, chrom, start, end))  
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_MappabilityEmpirial")
        curr_vals = current_table.objects.filter(
                                                 Q(chrom__iexact=chrom),
                                                 Q(chromStart__range=(start, end)) | Q(chromEnd__range=(start, end))
                                                 ).values('chrom', 'chromStart', 'chromEnd' )
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    

def get_conservation(request, genome, chrom, start, end):
    """
    gets Conservation annotation scores within a range
    """
    logger.debug("annotation_server.get_conservation called for genome: %s chromosome: %s:%s-%s" % (genome, chrom, start, end))  
    
    if genome in SUPPORTED_GENOMES:
        current_table = eval(genome+ "_Conservation")
        curr_vals = current_table.objects.filter(
                                                 Q(chrom__iexact=chrom),
                                                 Q(position__range=(start, end)),
                                                 ).values('chrom', 'position', 'value' )
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    
    
def get_gapregion(request, genome, chrom, start, end):
    """
    gets Conservation annotation scores within a range
    """
    logger.debug("annotation_server.get_gapregion called for genome: %s chromosome: %s:%s-%s" % (genome, chrom, start, end))  
    
    if genome in GAP_REGIONS:
        current_table = eval(genome+ "_GapRegions")
        curr_vals = current_table.objects.filter(
                                                 Q(chrom__iexact=chrom),
                                                 Q(chromStart__gte=start),
                                                 Q(chromStart__range=(start, end)) | Q(chromEnd__range=(start, end))
                                                 ).values('bin', 'chromStart', 'chromEnd', 'ix', 'n', 'size', 'type', 'bridge' )
        data = ValuesQuerySetToDict(curr_vals)
        return HttpResponse(data, 'application/json')
    else:
        return HttpResponse(status=400)
    

def cursor_to_json(cursor_in):
    cols = [x[0] for x in cursor_in.description]
    out = []
    for r in cursor_in.fetchall():
        row = {}
        for prop, val in zip(cols, r):
            if isinstance(val, Decimal):
                val = float(val)
            row[prop] = val
        out.append(row)
    return simplejson.dumps(out)

def ValuesQuerySetToDict(vqs):
    '''
    Based on http://djangosnippets.org/snippets/2454/
    Helper function converts ValuesQuerySet to Dictionary: simpler way of dumping data to json without extraneous models and pk
    '''
    ret = [item for item in vqs]
    #return [item for item in vqs]
    return simplejson.dumps(ret, indent=4)