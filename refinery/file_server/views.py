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
    
    
    ''' 
    for track_name in tdf_file.get_track_names():
        print( track_name )


    for data_set_name in tdf_file.get_data_set_names():
        print(data_set_name)
        window_function = ""
        if len( data_set_name.split("/") ) == 4:
            window_function = data_set_name.split("/")[3] 
        data_set = tdf_file.get_data_set( data_set_name.split("/")[1], data_set_name.split("/")[2], window_function )
        data_set.read()
        print("Tile Count: " + str(len(data_set.tile_index)))
        print("Tile Width: " + str(data_set.tile_width))
            
    
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
    '''
        
    profile = tdf_file.get_profile("chr21", "z0", ["mean"], start_location=13591070, end_location=14845362 )
    
    print( profile )


    #data_set = tdf_file.get_data_set( "chr21", "raw" )    
    #print( data_set )

    #tile = data_set.get_tile( 156 )
    #print(tile)
    
    
    return HttpResponse( simplejson.dumps( profile ), mimetype='application/json' )     
    #return render_to_response( 'file_server/index.html', {}, context_instance=RequestContext( request ) )

def file( request, sequence_name, zoom_level, start_location, end_location ):
    
    print ( sequence_name )
    print ( zoom_level )
    print ( start_location )
    print ( end_location )
    
    
    tdf_file = TDFFile( "/Users/nils/Sites/tdf/TCGA-AG-4007-01A-01D-1115-02_101122_SN177_0123_B20APUABXX_s_5.rg.sorted.chr21.bam.tdf" )        
    tdf_file.cache()    
    profile = tdf_file.get_profile( sequence_name, zoom_level, ["mean"], int( start_location ), int( end_location ) )    

    return HttpResponse( simplejson.dumps( profile ), mimetype='application/json' )     
    
    #return render_to_response( 'file_server/file.html', context_instance=RequestContext( request ) )
