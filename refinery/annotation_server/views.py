# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, HttpResponse
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.conf import settings
import simplejson, re
from django.db import connection
from datetime import datetime
from django.http import Http404
from django.core.urlresolvers import resolve
from decimal import *

def search_genes(request, genome, search_string):
    print "annotation_server.search_genes"
    cursor = connection.cursor() 
    query = """Select a.name, a.symbol, a.synonyms,
    #<b.region as start, #>b.region as end, b.chrom FROM (SELECT name, symbol,
    synonyms from dm3.flybase2004xref where symbol ilike '%s') a JOIN
    (SELECT f.name, f.region, f.seq_id, s.name as chrom FROM dm3.flybase f JOIN
    dm3.sequence s ON f.seq_id = s.id where s.name = 'chr2L' OR s.name = 'chr2R'
    OR s.name = 'chr3L' OR s.name = 'chr3R' OR s.name = 'chr4' OR s.name =
    'chrX' )  b ON a.name = b.name """ % (search_string)
    cursor.execute(query)
    
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_sequence(request, genome, chrom, start, end):
    """ 
    returns sequence for a specified chromosome start and end
    """
    offset = int(end) - int(start)
    cursor = connection.cursor() 
    query = """select name as chrom, substr(seq, %s, %s) as seq from %s.sequence where name = '%s'""" % (start, offset, genome, chrom)
    cursor.execute(query)
    #ret_json = cursor_to_json(cursor)
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_length(request, genome):
    """
    Returns all chromosome lengths depending on genome i.e. dm3, hg18, etc.
    """
    cursor = connection.cursor() 
    query = """SELECT chrom, size from %s.chrominfo where chrom !~* '_' order by size desc""" % (genome)
        
    cursor.execute(query)
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')


def get_chrom_length(request, genome, chrom):
    """
    returns the length of a specified chromosome
    """
    
    # TODO: return genome lengths according to chrom order i.e. 1,2,3 etc. 
    cursor = connection.cursor() 
    if (chrom):
        query = """SELECT chrom, size from %s.chrominfo where chrom ilike '%s'""" % (genome, chrom)
    
    cursor.execute(query)
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_cytoband(request, genome, chrom):
    """
    returns the length of a specified chromosome
    """
    cursor = connection.cursor() 
    query = """SELECT s.name as chrom, #<region as start, #>region as end, region_name from dm3.cytobandideo c join dm3.sequence s on s.id = c.seq_id where s.name ilike '%s' order by region;""" % (chrom)
    cursor.execute(query)
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_genes(request, genome, chrom, start, end):
    """
    gets a list of genes within a range i.e. gene start, cds, gene symbol
    """
    print "annotation_server.get_genes"
    cursor = connection.cursor()    
    query = """SELECT x.symbol, r.name, #<r.region as start, #>r.region as end, case when r.same_orient then '+' else '-' end as strand, #<r.cds as cds_start, #>r.cds as cds_end from dm3.flybase r join dm3.flyBase2004Xref x on r.name = x.name JOIN (select id, name from dm3.sequence where name = '%s') n ON n.id = r.seq_id and region && int_interval '(%s,%s)' order by region""" % (chrom, start, end)
    cursor.execute(query)
    
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')

def get_exons(request, genome, chrom, start, end):
    """
    Get list of all gene exons within a specified range
    """
    
    print "annotation_server.get_exons"
    
    cursor = connection.cursor()    
    query = """select x.symbol, r.name, s.name as chrom, case when r.same_orient then '+' else '-' end as strand, #<r.region as gene_start, #>r.region as gene_end, #<e.region as exonstart, #>e.region as exonend, exon_id from dm3.flybase r join dm3.sequence s on r.seq_id=s.id join dm3.flybase_exon ie on isoform_id=r.id join dm3.exon e on exon_id=e.id join dm3.flyBase2004Xref x on r.name = x.name where s.name = '%s' and r.region && int_interval'(%s,%s)' order by r.id, #<e.region""" % (chrom, start, end) 
    print query
    cursor.execute(query)
    
    return HttpResponse(cursor_to_json(cursor), 'application/javascript')
    
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
    