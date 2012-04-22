'''
Created on Apr 21, 2012

@author: nils
'''
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from file_server.tdf_file import TDFFile
import simplejson

# Create your views here.
def index( request ):    
    
    tdf_file = TDFFile( "/Users/nils/Sites/tdf/TCGA-AG-4007-01A-01D-1115-02_101122_SN177_0123_B20APUABXX_s_5.rg.sorted.chr21.bam.tdf" )
    
    tdf_file.cache()
    
    data_set = tdf_file.get_data_set( "chr21", "z4", "mean" )    
    print( data_set )
    
    
    tile = data_set.get_tile( 0 )
    print(tile)

    tile = data_set.get_tile( 1 )
    print(tile)

    tile = data_set.get_tile( 2 )
    print(tile)

    tile = data_set.get_tile( 3 )
    print(tile)

    tile = data_set.get_tile( 4 )
    print(tile)

    tile = data_set.get_tile( 5 )
    print(tile)

    tile = data_set.get_tile( 6 )
    print(tile)

    tile = data_set.get_tile( 7 )
    print(tile)


    data_set = tdf_file.get_data_set( "chr21", "raw" )    
    print( data_set )

    tile = data_set.get_tile( 156 )
    print(tile)

    
    
    return HttpResponse( tdf_file )     
    #return render_to_response( 'file_server/index.html', {}, context_instance=RequestContext( request ) )

def file( request ):
    return render_to_response( 'file_server/file.html', context_instance=RequestContext( request ) )
