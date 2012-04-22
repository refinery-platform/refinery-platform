'''
Created on Apr 21, 2012

@author: nils
'''

from bitstring import ConstBitStream
import math
import zlib
import copy


class TDFBitStream(ConstBitStream):

    def update_offset(self,offset):
        if offset is not None:        
            self.pos = offset * 8        
        return( self.pos / 8 )
            
            
    def read_long(self):
        return self.read( 64 ).intle


    def read_integer(self):
        return self.read( 32 ).intle


    def read_float(self):
        return self.read( 32 ).floatle


    def read_bytes(self, length):
        return self.read( length*8 ).bytes

    
    def read_string( self, length=None ):        
        if length is not None:
            return self.read( length*8 ).bytes
        else:
            string = ""    
            character = self.read( 8 ).uintle
            
            while character is not 0:
                string += chr( character )
                character = self.read( 8 ).uintle
            
            return string        
    


class TDFFile(object):
    '''
    classdocs
    '''

    def __init__(self, filename):
        '''
        Constructor
        '''
        self.filename = filename
        self.bitstream = TDFBitStream(filename=self.filename)
        self.preamble = None
        self.header = None
        self.index = None
        
    def __str__(self):
        return ( "TDF Reader (" + self.filename + ")" )


    def create_data_set_name(self, sequence_name, zoom_level, window_function ):
        
        if self.preamble is None:
            return None

        if self.preamble is not None:
            data_set_name = "/" + sequence_name + "/" + zoom_level
            if self.get_version() >= 2 and len( window_function.strip() ) > 0:
                data_set_name += "/" + window_function
        
        return data_set_name


    def get_data_set(self, sequence_name, zoom_level, window_function="" ):
        # TODO: implement caching
        data_set_name = self.create_data_set_name( sequence_name, zoom_level, window_function )
        
        if self.index is not None and data_set_name is not None:
            data_set = self.index.data_set_index[data_set_name]
            if data_set is not None:                
                data_set.read()
                return data_set
        
        return None
    
    
    def get_version(self):
        if self.preamble is None:
            return None;
        return self.preamble.version


    def get_tracks(self):
        if self.header is None:
            return None;
        return self.header.tracks


    def is_compressed(self):
        if self.header is None:
            return None;
        return self.header.is_compressed


    def update_offset(self,offset):
        return self.bitstream.update_offset(offset)
                    
            
    def read_long(self):
        return self.bitstream.read_long()


    def read_integer(self):
        return self.bitstream.read_integer()


    def read_float(self):
        return self.bitstream.read_float()


    def read_bytes(self, length):
        return self.bitstream.read_bytes( length )

    
    def read_string( self, length=None ):
        return self.bitstream.read_string(length)        
                
                        
    def cache(self):
        self.preamble = TDFPreamble(self)
        self.preamble.read()
        self.header = TDFHeader(self)
        self.header.read()
        self.index = TDFIndex(self, self.preamble.index_position)
        self.index.read()
        
        return self
        
        
class TDFElement(object):

    def __init__(self, tdf_file, offset=None ):
        '''
        Constructor
        '''
        self.tdf_file = tdf_file
        self.offset = offset


    
class TDFPreamble(TDFElement):

    def __init__(self, tdf_file, offset=0 ):
        '''
        Constructor
        '''
        super( TDFPreamble, self ).__init__( tdf_file, offset )
        
        self.magic_string = None
        self.magic_number = None
        self.version = None
        self.index_position = None
        self.index_length = None
        self.header_length = None
        
        
    def read(self):
        self.offset = self.tdf_file.update_offset(self.offset)
                
        self.magic_string = self.tdf_file.read_string( 4 )                
        self.tdf_file.update_offset(self.offset)
        self.magic_number = self.tdf_file.read_integer()
        
        self.version = self.tdf_file.read_integer()        
        self.index_position = self.tdf_file.read_long()
        self.index_length = self.tdf_file.read_integer()
        self.header_length = self.tdf_file.read_integer()

        return self



class TDFHeader(TDFElement):
    
    GZIP_FLAG = 0x1

    def __init__(self, tdf_file, offset=None ):
        '''
        Constructor
        '''
        super( TDFHeader, self ).__init__( tdf_file, offset )
                
        self.window_functions = None
        self.track_type = None
        self.track_line = None
        self.tracks = None
        self.genome_id = None
        self.flags = None
        self.is_compressed = None
        
        
    def read(self):        
        self.offset = self.tdf_file.update_offset(self.offset)
        
        self.window_functions = []
        
        if self.tdf_file.get_version() >= 2:
            window_function_count = self.tdf_file.read_integer()            
            for i in range( window_function_count ):
                self.window_functions.append( self.tdf_file.read_string() )
        else:
            self.window_functions[0] = "mean";
        
        self.track_type = self.tdf_file.read_string();        
        self.track_line = self.tdf_file.read_string().strip();
                
        self.tracks = []        
        track_count = self.tdf_file.read_integer()
        for i in range( track_count ):
            self.tracks.append( self.tdf_file.read_string() )
            
        if self.tdf_file.get_version() >= 2:
            self.genome_id = self.tdf_file.read_string()
            self.flags = self.tdf_file.read_integer()
            self.is_compressed = ( self.flags & self.GZIP_FLAG ) is not 0
        else:
            self.is_compressed = False;
                        
        return self



class TDFIndex( TDFElement ):
    
    def __init__(self, tdf_file, offset=None ):
        '''
        Constructor
        '''
        super( TDFIndex, self ).__init__( tdf_file, offset )
                
        self.data_set_index = None
        self.group_index = None
        self.track_line = None
        self.tracks = None
        
        
    def read(self):        
        self.offset = self.tdf_file.update_offset(self.offset)
            
        self.data_set_index = {}
        data_set_count = self.tdf_file.read_integer()
        for i in range( data_set_count ):
            data_set = TDFDataSet( self.tdf_file )
            data_set.read_index()
            self.data_set_index[data_set.name] = data_set                        

        self.group_index = {}
        group_count = self.tdf_file.read_integer()
        for i in range( group_count ):
            group = TDFGroup( self.tdf_file )
            group.read_index()
            self.group_index[group.name] = group                        

        return self



class TDFIndexedElement( TDFElement ):
    
    def __init__(self, tdf_file, offset=None):
        '''
        Constructor
        '''
        super( TDFIndexedElement, self ).__init__( tdf_file, offset )
        
        self.name = None
        self.index_position = None
        self.index_length = None
        
    def read_index(self): 
        self.tdf_file.update_offset(self.offset)
            
        self.name = self.tdf_file.read_string()
        self.index_position = self.tdf_file.read_long()
        self.index_length = self.tdf_file.read_integer()

        return self

        
    def read(self):
        return self



class TDFDataSet( TDFIndexedElement ):    
    
    def __init__(self, tdf_file, offset=None ):
        '''
        Constructor
        '''
        super( TDFDataSet, self ).__init__( tdf_file, offset )        
        
        self.attributes = None
        self.data_type = None
        self.tile_width = None
        self.tile_index = None


    def read(self):
        self.offset = self.tdf_file.update_offset(self.index_position)
        
        # read meta information
        self.attributes= {}
        attribute_count = self.tdf_file.read_integer()
        for i in range( attribute_count ):
            key = self.tdf_file.read_string()
            value = self.tdf_file.read_string()
            self.attributes[key] = value
        
        self.data_type = self.tdf_file.read_string()        
        self.tile_width = self.tdf_file.read_float()
        
        # read the tile index
        self.tile_index = []
        tile_count = self.tdf_file.read_integer()
        for i in range( tile_count ):
            tile = TDFTile( self.tdf_file )
            tile.read_index()
            self.tile_index.append( tile )
        
        return self
    

    def get_tile(self, tile_number):
        # TODO: implement caching
        if tile_number < 0 or tile_number >= len( self.tile_index ): 
            return None        
        
        if self.tile_index[tile_number] is None:
            return None
        
        return self.tile_index[tile_number].read()
            
                    
    def get_tiles(self, start_location, end_location):
        # TODO: implement caching
        start_tile = math.floor(start_location/self.tile_width);
        end_tile = math.floor(end_location/self.tile_width);
     
        tiles = []
        for i in range(start_tile, end_tile+1):
            tiles.append( self.get_tile(i) )
        
        return tiles


class TDFGroup( TDFIndexedElement ):
    pass


class TDFTile( TDFElement ):
    
    class Type:
        UNKNOWN = -1
        EMPTY = 0
        BED = 1
        BED_WITH_NAME = 2
        VARIABLE_STEP = 3
        FIXED_STEP = 4
            
                    
    def __init__(self, tdf_file, offset=None, type=None, index_position=None, index_length=None ):
        '''
        Constructor
        '''
        super( TDFTile, self ).__init__( tdf_file, offset )
                
        self.type = type
        self.index_position = index_position
        self.index_length = index_length
        self.data = None


    def get_type(self,type_string):
        types = { "bed": self.Type.BED, 
                  "bedWithName": self.Type.BED_WITH_NAME,
                  "variableStep": self.Type.VARIABLE_STEP,
                  "fixedStep": self.Type.FIXED_STEP }
        
        if type_string in types:
            return types[type_string]
        
        return self.types.UNKNOWN
                 
    
    def read_index(self):        
        self.offset = self.tdf_file.update_offset(self.offset)
            
        self.index_position = self.tdf_file.read_long()
        self.index_length = self.tdf_file.read_integer()
        
        return self        
    
    
    def read(self):
        if self.index_position < 0 and self.index_length == 0:
            # don't read anything
            self.type = self.Type.EMPTY
            return self
        
        self.tdf_file.update_offset( self.index_position )
        tile_data = self.tdf_file.read_bytes( self.index_length )
                        
        if self.tdf_file.is_compressed():
            tile_data = zlib.decompress( tile_data )
            
        # create a new BitStream for the tile
        tile_stream = TDFBitStream( bytes=tile_data )

        self.type = self.get_type( tile_stream.read_string() )
        
        if self.type == self.Type.BED or self.type == self.Type.BED_WITH_NAME:
            bedTile = TDFBedTile(self)
            self = bedTile.read(tile_stream)
        elif self.type == self.Type.VARIABLE_STEP:
            variableTile = TDFVariableTile(self)
            self = variableTile.read(tile_stream)
        elif self.type == self.Type.FIXED_STEP:
            fixedTile = TDFFixedTile(self)
            self = fixedTile.read(tile_stream)
        else:
            return self; 
        
        return self
    
    
    
class TDFFixedTile(TDFTile):
    
    def __init__(self,other):                        
        super(TDFFixedTile, self).__init__(other.tdf_file, other.offset, other.type, other.index_position, other.index_length)

        self.span = None
        self.start_location = None

        
    def read(self,tile_stream):
        
        location_count = tile_stream.read_integer()
                
        self.start_location = tile_stream.read_integer()
        self.span = tile_stream.read_float()
        
        self.data = []        
        for track in range( len( self.tdf_file.get_tracks() ) ):            
            self.data.append( [] )
            for location in range( location_count ):
                self.data[track].append( tile_stream.read_float() )
        
        return self
    
    
class TDFVariableTile(TDFTile):
    
    def __init__(self,other):                        
        super( TDFVariableTile, self ).__init__(other.tdf_file, other.offset, other.type, other.index_position, other.index_length)

        self.span = None
        self.start_locations = None
        self.start_location = None

        
    def read(self,tile_stream):
        
        self.start_location = tile_stream.read_integer()
        self.span = tile_stream.read_float()

        location_count = tile_stream.read_integer()
        self.start_locations = []
        for i in range( location_count ):
            self.start_locations.append( tile_stream.read_integer() )

        # read track count: this is not stored because the information is available in the TDF file header            
        track_count = tile_stream.read_integer()        
        # assert( track_count = len( self.tdf_file.get_tracks() ) )
                
        self.data = []        
        for track in range( len( self.tdf_file.get_tracks() ) ):            
            self.data.append( [] )
            for location in range( location_count ):
                self.data[track].append( tile_stream.read_float() )
        
        return self


class TDFBedTile(TDFTile):
    
    def __init__(self,other):                        
        super( TDFBedTile, self ).__init__(other.tdf_file, other.offset, other.type, other.index_position, other.index_length)

        self.start_locations = None
        self.end_locations = None
        self.names = None
        
        
    def read(self,tile_stream):
                
        location_count = tile_stream.read_integer()
        self.start_locations = []
        self.end_locations = []
        for i in range( location_count ):
            self.start_locations.append( tile_stream.read_integer() )
        for i in range( location_count ):
            self.end_locations.append( tile_stream.read_integer() )
            
        # read track count: this is not stored because the information is available in the TDF file header
        track_count = tile_stream.read_integer()        
        # assert( track_count = len( self.tdf_file.get_tracks() ) )
                
        self.data = []        
        for track in range( len( self.tdf_file.get_tracks() ) ):            
            self.data.append( [] )
            for location in range( location_count ):
                self.data[track].append( tile_stream.read_float() )

        # if this is a "bed with name" track load the names
        if self.type == self.Type.BED_WITH_NAME:
            self.names = []        
            for track in range( len( self.tdf_file.get_tracks() ) ):            
                self.names.append( [] )
                for location in range( location_count ):
                    self.names[track].append( tile_stream.read_string() )
        
        return self    