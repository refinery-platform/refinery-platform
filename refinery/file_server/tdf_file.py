"""
Created on Apr 21, 2012

@author: nils
"""

from bitstring import ConstBitStream
import cStringIO
import logging
import math
import struct
import zlib

from file_store.models import get_file_object

logger = logging.getLogger(__name__)


class TDFBitStream(ConstBitStream):
    def update_offset(self, offset):
        if offset is not None:
            self.pos = offset * 8
        return self.pos / 8

    def read_long(self):
        return self.read(64).intle

    def read_integer(self):
        return self.read(32).intle

    def read_float(self):
        return self.read(32).floatle

    def read_bytes(self, length):
        return self.read(length * 8).bytes

    def read_string(self, length=None):
        if length is not None:
            return self.read(length * 8).bytes
        else:
            string = ""
            character = self.read(8).uintle

            while character is not 0:
                string += chr(character)
                character = self.read(8).uintle

            return string


class InsufficientBytesError(BufferError):
    """Insufficient number of bytes read for conversion from stream"""
    def __init__(self, bytes_requested, bytes_read):
        self.message = "Only " + str(bytes_read) + " bytes out of " + str(
            bytes_requested) + " were read from binary stream"

    def __str__(self, *args, **kwargs):
        return self.message


class TDFByteStream(object):
    """Reads TDF files from disk one byte at a time"""
    #: File handle
    _stream = None
    #: Byte order for binary data interpretation
    _endianness = '<'  # little-endian is assumed by default
    #: Objects for reading different data types
    # (more efficient than calling struct functions)
    _int = struct.Struct(_endianness + 'i')
    _long = struct.Struct(_endianness + 'q')
    _float = struct.Struct(_endianness + 'f')

    def __init__(self, file_object):
        """Initialize the binary file handle.

        :param file_object: binary data file.
        :type file_name: file or file-like object.

        """
        # get ready the file object for reading
        self._stream = file_object
        self.update_offset(0)

    def __str__(self, *args, **kwargs):
        if self._stream:
            return "TDF file name: " + self._stream.name
        else:
            return object.__str__(self, *args, **kwargs)

    def update_offset(self, offset):
        """Set the file's current position.

        :param offset: number of bytes from the beginning of the file.
        :type offset: int.
        :returns: int -- new current position.

        """
        if offset is not None:
            self._stream.seek(offset)
        return self._stream.tell()

    def read_bytes(self, length):
        """Read length number of bytes from file.

        :param length: number of bytes to read.
        :type length: int.
        :returns: str -- raw binary data.

        """
        return self._stream.read(length)

    def read_integer(self):
        """Read a four byte integer from the current position in the file.

        :returns: int or None if not enough bytes were read.

        """
        length = 4
        data = self.read_bytes(length)
        # check if we were able to read enough data to convert to an integer
        try:
            return self._int.unpack(data)[0]
        except struct.error:
            raise InsufficientBytesError(length, len(data))

    def read_long(self):
        """Read an eight byte integer from the current position in the file.

        :returns: long or None if not enough bytes were read.

        """
        length = 8
        data = self.read_bytes(length)
        # check if we were able to read enough data to convert to a long
        # integer
        try:
            return self._long.unpack(data)[0]
        except struct.error:
            raise InsufficientBytesError(length, len(data))

    def read_float(self):
        """Read a four byte floating point number from the current position in
        the file.
        :returns: float or None if not enough bytes were read.
        """
        length = 4
        data = self.read_bytes(length)
        # check if we were able to read enough data to convert to a float
        try:
            return self._float.unpack(data)[0]
        except struct.error:
            raise InsufficientBytesError(length, len(data))

    def read_string(self, length=None):
        """Read number of bytes from file and convert them to string.
        If length is not provided, read until the null character or EOF are
        reached.
        :param length: number of bytes to read
        :type length: int.
        :returns: str -- binary data.
        """
        if length is not None:
            return self.read_bytes(length)
        else:
            string = ''
            for character in iter(lambda: self.read_bytes(1), '\x00'):
                # terminate if we reached EOF
                if character == '':
                    return string
                string += character
            return string


class TDFFile(object):
    """classdocs
    """
    def __init__(self, file_object):
        self.filename = file_object.name
        self.bytestream = TDFByteStream(file_object)
        self.preamble = None
        self.header = None
        self.index = None

    def __str__(self):
        return "TDF File (" + self.filename + ")"

    # prepare object for pickling (file objects cannot be serialized)
    # see example here: http://docs.python.org/library/pickle.html
    def __getstate__(self):
        odict = self.__dict__.copy()  # copy the dict since we change it
        del odict['bytestream']  # remove the byte stream
        return odict

    # prepare object for unpickling (byte stream needs to be restored)
    def __setstate__(self, dictionary):
        # reopen file byte stream
        # TODO: replace get_file_object() with open(), make sure file object
        # is closed after use
        file_object = get_file_object(dictionary['filename'])
        bytestream = TDFByteStream(file_object)
        self.__dict__.update(dictionary)  # reload attributes
        self.bytestream = bytestream  # re-attach the byte stream

    def create_data_set_name(self, sequence_name, zoom_level, window_function):
        if self.preamble is None:
            return None

        if self.preamble is not None:
            data_set_name = "/" + sequence_name + "/" + zoom_level
            if self.get_version() >= 2 and len(
                    window_function.strip()) > 0 and zoom_level != "raw":
                data_set_name += "/" + window_function

        return data_set_name

    def get_data_set(self, sequence_name, zoom_level, window_function=""):
        # TODO: implement caching
        data_set_name = self.create_data_set_name(sequence_name, zoom_level,
                                                  window_function)

        if self.index is not None and data_set_name is not None:
            data_set = self.index.data_set_index[data_set_name]
            if data_set is not None:
                data_set.read()
                return data_set

        return None

    def decompose_data_set_name(self, data_set_name):
        """This is a class method because data set names are different between
        v1 (window function is assumed to be "mean" and later versions of the
        TDF format.
        """
        # cannot decompose data set name without version information from the
        # preamble
        if self.preamble is None:
            return None
        # data set name format is:
        # "/<sequence_name>/<zoom_level>/<window_function>"
        components = data_set_name.split("/")

        if self.get_version() == 1 and len(components) == 3:
            return {
                "sequence_name": components[1],
                "zoom_level": components[2],
                "window_function": "mean"
            }
        # zoom_level "raw" does not have a window_function
        if self.get_version() > 1 and len(components) == 3:
            return ({"sequence_name": components[1], "zoom_level": "raw",
                     "window_function": "none"})

        if self.get_version() > 1 and len(components) == 4:
            return {
                "sequence_name": components[1],
                "zoom_level": components[2],
                "window_function": components[3]
            }
        return None

    def get_version(self):
        if self.preamble is None:
            return None
        return self.preamble.version

    def get_track_names(self):
        if self.header is None:
            return None
        return self.header.tracks

    def get_data_set_names(self):
        if self.index is None:
            return None
        return self.index.data_set_index

    def is_compressed(self):
        if self.header is None:
            return None
        return self.header.is_compressed

    def update_offset(self, offset):
        return self.bytestream.update_offset(offset)

    def read_long(self):
        return self.bytestream.read_long()

    def read_integer(self):
        return self.bytestream.read_integer()

    def read_float(self):
        return self.bytestream.read_float()

    def read_bytes(self, length):
        return self.bytestream.read_bytes(length)

    def read_string(self, length=None):
        return self.bytestream.read_string(length)

    def cache(self):
        self.preamble = TDFPreamble(self)
        self.preamble.read()
        self.header = TDFHeader(self)
        self.header.read()
        self.index = TDFIndex(self, self.preamble.index_position)
        self.index.read()
        return self

    def get_profile(self, sequence_name, zoom_level, window_functions,
                    start_location, end_location):
        """
        window_functions = array of window function names
        (e.g. "mean", "max", "min", etc.)
        """
        profile = []
        data_sets = {}
        for window_function in window_functions:
            data_sets[window_function] = self.get_data_set(
                sequence_name, zoom_level, window_function)
        tiles = {}
        for window_function in window_functions:
            tiles[window_function] = data_sets[window_function].get_tiles(
                start_location, end_location)

        # assumes that the number of tiles is equal across all window functions
        for tile_index in range(len(tiles[window_functions[0]])):
            logger.info("Tile: %s", tile_index)
            # TODO: compute correct start position
            # (first tile_index is usually > 0)
            location = {}
            for window_function in window_functions:
                logger.debug("WF: ", window_function)
                tile = tiles[window_function][tile_index]
                logger.debug("Type: ", str(tile.type))
                if tile.type == TDFTile.Type.EMPTY:
                    location["start"] = int(
                        tile_index * data_sets[window_function].tile_width + 1)
                    location["end"] = int(
                        (tile_index + 1) *
                        data_sets[window_function].tile_width)
                    location[window_function] = 0
                    profile.append(location)
                else:
                    if tile.type == TDFTile.Type.VARIABLE_STEP:
                        # update location
                        # need check if start_location and locations[0] are
                        # the same for all window functions!
                        location["start"] = int(tile.start_location)
                        location["end"] = int(tile.start_locations[0] - 1)
                        location[window_function] = 0
                        profile.append(location)

                    for location_index in range(len(tile.data[0])):
                        if tile.type == TDFTile.Type.VARIABLE_STEP:
                            location["start"] = int(
                                tile.start_locations[location_index])
                            location["end"] = int(
                                location["start"] + tile.span)
                            location[window_function] = tile.data[0][
                                location_index]
                            if math.isnan(location[window_function]):
                                location[window_function] = 0
                        elif tile.type == TDFTile.Type.FIXED_STEP:
                            location["start"] = int(
                                tile.start_location + math.floor(
                                    tile.span * location_index))
                            location["end"] = int(
                                tile.start_location + math.floor(
                                    tile.span * (location_index + 1)))
                            location[window_function] = tile.data[0][
                                location_index]
                            if math.isnan(location[window_function]):
                                location[window_function] = 0
                        elif (tile.type == TDFTile.Type.BED or
                                tile.type == TDFTile.Type.BED_WITH_NAME):
                            raise "BED TILE " + tile_index + \
                                  " (window function " + window_function + ")"
                        else:
                            raise "Unknown tile type in tile " + tile_index + \
                                  " (window function " + window_function + ")"
                        profile.append(location)
                        location = {}
        return profile


class TDFElement(object):
    def __init__(self, tdf_file, offset=None):
        """Constructor"""
        self.tdf_file = tdf_file
        self.offset = offset


class TDFPreamble(TDFElement):
    def __init__(self, tdf_file, offset=0):
        """Constructor"""
        super(TDFPreamble, self).__init__(tdf_file, offset)
        self.magic_string = None
        self.magic_number = None
        self.version = None
        self.index_position = None
        self.index_length = None
        self.header_length = None

    def read(self):
        self.offset = self.tdf_file.update_offset(self.offset)
        self.magic_string = self.tdf_file.read_string(4)
        self.tdf_file.update_offset(self.offset)
        self.magic_number = self.tdf_file.read_integer()
        self.version = self.tdf_file.read_integer()
        self.index_position = self.tdf_file.read_long()
        self.index_length = self.tdf_file.read_integer()
        self.header_length = self.tdf_file.read_integer()
        return self


class TDFHeader(TDFElement):
    GZIP_FLAG = 0x1

    def __init__(self, tdf_file, offset=None):
        """Constructor"""
        super(TDFHeader, self).__init__(tdf_file, offset)
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
            for i in range(window_function_count):
                self.window_functions.append(self.tdf_file.read_string())
        else:
            self.window_functions[0] = "mean"

        self.track_type = self.tdf_file.read_string()
        self.track_line = self.tdf_file.read_string().strip()
        self.tracks = []
        track_count = self.tdf_file.read_integer()
        for i in range(track_count):
            self.tracks.append(self.tdf_file.read_string())

        if self.tdf_file.get_version() >= 2:
            self.genome_id = self.tdf_file.read_string()
            self.flags = self.tdf_file.read_integer()
            self.is_compressed = (self.flags & self.GZIP_FLAG) is not 0
        else:
            self.is_compressed = False

        return self


class TDFIndex(TDFElement):
    def __init__(self, tdf_file, offset=None):
        """Constructor"""
        super(TDFIndex, self).__init__(tdf_file, offset)
        self.data_set_index = None
        self.group_index = None
        self.track_line = None
        self.tracks = None

    def read(self):
        self.offset = self.tdf_file.update_offset(self.offset)

        self.data_set_index = {}
        data_set_count = self.tdf_file.read_integer()
        for i in range(data_set_count):
            data_set = TDFDataSet(self.tdf_file)
            data_set.read_index()
            self.data_set_index[data_set.name] = data_set

        self.group_index = {}
        group_count = self.tdf_file.read_integer()
        for i in range(group_count):
            group = TDFGroup(self.tdf_file)
            group.read_index()
            self.group_index[group.name] = group

        return self


class TDFIndexedElement(TDFElement):
    def __init__(self, tdf_file, offset=None):
        """Constructor"""
        super(TDFIndexedElement, self).__init__(tdf_file, offset)
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


class TDFDataSet(TDFIndexedElement):
    def __init__(self, tdf_file, offset=None):
        """Constructor"""
        super(TDFDataSet, self).__init__(tdf_file, offset)
        self.is_compressed = tdf_file.is_compressed()
        self.track_names = tdf_file.get_track_names()
        self.attributes = None
        self.data_type = None
        self.tile_width = None
        self.tile_index = None

    def read(self):
        self.offset = self.tdf_file.update_offset(self.index_position)
        # read meta information
        self.attributes = {}
        attribute_count = self.tdf_file.read_integer()
        for i in range(attribute_count):
            key = self.tdf_file.read_string()
            value = self.tdf_file.read_string()
            self.attributes[key] = value

        self.data_type = self.tdf_file.read_string()
        self.tile_width = self.tdf_file.read_float()

        # read the tile index
        self.tile_index = []
        tile_count = self.tdf_file.read_integer()
        for i in range(tile_count):
            tile = TDFTile(self.tdf_file)
            tile.read_index()
            self.tile_index.append(tile)

        return self

    def get_tile(self, tile_number, file_object=None):
        # TODO: implement caching
        if tile_number < 0 or tile_number >= len(self.tile_index):
            return None

        if self.tile_index[tile_number] is None:
            return None

        return self.tile_index[tile_number].read(file_object,
                                                 self.is_compressed,
                                                 self.track_names)

    def get_tiles(self, start_location, end_location, file_object=None):
        # TODO: implement caching
        start_tile = int(math.floor(start_location / self.tile_width))
        end_tile = int(math.floor(end_location / self.tile_width))

        tiles = []
        for i in range(start_tile, end_tile + 1):
            tile = self.get_tile(i, file_object)
            if tile is not None:
                tiles.append(tile)

        return tiles


class TDFGroup(TDFIndexedElement):
    pass


class TDFTile(TDFElement):
    class Type:
        UNKNOWN = -1
        EMPTY = 0
        BED = 1
        BED_WITH_NAME = 2
        VARIABLE_STEP = 3
        FIXED_STEP = 4

    def __init__(self, tdf_file, offset=None, type=None, index_position=None,
                 index_length=None):
        """
        Constructor
        """
        super(TDFTile, self).__init__(tdf_file, offset)

        self.type = type
        self.index_position = index_position
        self.index_length = index_length
        self.data = None

    def get_type(self, type_string):
        types = {"bed": self.Type.BED,
                 "bedWithName": self.Type.BED_WITH_NAME,
                 "variableStep": self.Type.VARIABLE_STEP,
                 "fixedStep": self.Type.FIXED_STEP}

        if type_string in types:
            return types[type_string]

        return self.types.UNKNOWN

    def read_index(self):
        self.offset = self.tdf_file.update_offset(self.offset)
        self.index_position = self.tdf_file.read_long()
        self.index_length = self.tdf_file.read_integer()
        return self

    def read(self, file_object=None, is_compressed=False, track_names=None):
        if self.index_position < 0 and self.index_length == 0:
            # don't read anything
            self.type = self.Type.EMPTY
            return self

        if file_object is not None:
            self.tdf_file = TDFFile(file_object)

        self.tdf_file.update_offset(self.index_position)
        tile_data = self.tdf_file.read_bytes(self.index_length)

        if file_object is None:
            if self.tdf_file.is_compressed():
                tile_data = zlib.decompress(tile_data)
        else:
            if is_compressed:
                tile_data = zlib.decompress(tile_data)

        if track_names is None:
            track_names = self.tdf_file.get_track_names()

        # create a new byte stream for the tile
        tile_stream = TDFByteStream(cStringIO.StringIO(tile_data))

        self.type = self.get_type(tile_stream.read_string())

        if self.type == self.Type.BED or self.type == self.Type.BED_WITH_NAME:
            bedTile = TDFBedTile(self)
            self = bedTile.read(tile_stream, track_names)
        elif self.type == self.Type.VARIABLE_STEP:
            variableTile = TDFVariableTile(self)
            self = variableTile.read(tile_stream, track_names)
        elif self.type == self.Type.FIXED_STEP:
            fixedTile = TDFFixedTile(self)
            self = fixedTile.read(tile_stream, track_names)
        else:
            return self
        return self


class TDFFixedTile(TDFTile):
    def __init__(self, other):
        super(TDFFixedTile, self).__init__(other.tdf_file, other.offset,
                                           other.type, other.index_position,
                                           other.index_length)
        self.span = None
        self.start_location = None

    def read(self, tile_stream, track_names=None):

        location_count = tile_stream.read_integer()

        self.start_location = tile_stream.read_integer()
        self.span = tile_stream.read_float()
        self.data = []
        for track in range(len(track_names)):
            self.data.append([])
            for location in range(location_count):
                self.data[track].append(tile_stream.read_float())

        return self


class TDFVariableTile(TDFTile):
    def __init__(self, other):
        super(TDFVariableTile, self).__init__(other.tdf_file, other.offset,
                                              other.type, other.index_position,
                                              other.index_length)

        self.span = None
        self.start_locations = None
        self.start_location = None

    def read(self, tile_stream, track_names):
        self.start_location = tile_stream.read_integer()
        self.span = tile_stream.read_float()

        location_count = tile_stream.read_integer()
        self.start_locations = []
        for i in range(location_count):
            self.start_locations.append(tile_stream.read_integer())

        # read track count: this is not stored because the information is
        # available in the TDF file header
        tile_stream.read_integer()
        self.data = []
        for track in range(len(track_names)):
            self.data.append([])
            for location in range(location_count):
                self.data[track].append(tile_stream.read_float())

        return self


class TDFBedTile(TDFTile):
    def __init__(self, other):
        super(TDFBedTile, self).__init__(other.tdf_file, other.offset,
                                         other.type, other.index_position,
                                         other.index_length)
        self.start_locations = None
        self.end_locations = None
        self.names = None

    def read(self, tile_stream, track_names):
        location_count = tile_stream.read_integer()
        self.start_locations = []
        self.end_locations = []
        for i in range(location_count):
            self.start_locations.append(tile_stream.read_integer())
        for i in range(location_count):
            self.end_locations.append(tile_stream.read_integer())

        # read track count: this is not stored because the information is
        # available in the TDF file header
        tile_stream.read_integer()
        self.data = []
        for track in range(len(track_names)):
            self.data.append([])
            for location in range(location_count):
                self.data[track].append(tile_stream.read_float())
        # if this is a "bed with name" track load the names
        if self.type == self.Type.BED_WITH_NAME:
            self.names = []
            for track in range(len(track_names)):
                self.names.append([])
                for location in range(location_count):
                    self.names[track].append(tile_stream.read_string())
        return self


def get_profile_from_file(data_set, start_location, end_location, file_object):
    """
    window_functions = array of window function names
    (e.g. "mean", "max", "min", etc.)
    """
    profile = []
    tiles = data_set.get_tiles(start_location, end_location, file_object)
    # assumes that the number of tiles is equal across all window functions
    for tile_index in range(len(tiles)):
        print "Tile: " + str(tile_index)
        # TODO: compute correct start position
        # (first tile_index is usually > 0)
        location = []
        tile = tiles[tile_index]
        logger.debug("Type: ", str(tile.type))
        if tile.type == TDFTile.Type.EMPTY:
            location.append(int(tile_index * data_set.tile_width + 1))
            location.append(int((tile_index + 1) * data_set.tile_width))
            location.append(0)
            profile.append(location)
        else:
            if tile.type == TDFTile.Type.VARIABLE_STEP:
                # update location
                # need check if start_location and locations[0] are the same
                # for all window functions!
                location.append(int(tile.start_location))
                location.append(int(tile.start_locations[0] - 1))
                location.append(0)
                profile.append(location)

            for location_index in range(len(tile.data[0])):

                if tile.type == TDFTile.Type.VARIABLE_STEP:
                    location.append(int(tile.start_locations[location_index]))
                    location.append(
                        int(tile.start_locations[location_index] + tile.span))
                    location.append(tile.data[0][location_index])

                    if math.isnan(location[2]):
                        location[2] = 0
                elif tile.type == TDFTile.Type.FIXED_STEP:
                    location.append(int(tile.start_location + math.floor(
                        tile.span * location_index)))
                    location.append(int(tile.start_location + math.floor(
                        tile.span * (location_index + 1))))
                    location.append(tile.data[0][location_index])

                    if math.isnan(location[2]):
                        location[2] = 0
                elif (tile.type == TDFTile.Type.BED or
                        tile.type == TDFTile.Type.BED_WITH_NAME):
                    raise "BED TILE " + tile_index
                else:
                    raise "Unknown tile type in tile " + tile_index
                profile.append(location)
                location = []

    return profile
