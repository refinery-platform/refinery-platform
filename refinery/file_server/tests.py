'''
Created on Apr 21, 2012

@author: Ilya Sytchev
'''

from django.utils import unittest
import struct
from file_server import tdf_file


class TDFByteStreamTest(unittest.TestCase):
    '''TDFByteStream unit test base class.

    '''
    endianness = '<'   # should match endianness of TDFByteStream


class TDFByteStreamTestUpdateOffset(TDFByteStreamTest):
    '''Test moving around the file.

    '''
    def setUp(self):
        self.data = [1, 2, 3]
        self.fmt = self.endianness + 'iii'  # three ints
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)

    def test_initial_position(self):
        # check if the initial position is set to the beginning of the file
        self.assertEqual(self.tdf.update_offset(None), 0)

    def test_arbitrary_position(self):
        # go to an arbitrary position within the file
        pos = len(self.binary_data) / 2
        self.assertEqual(self.tdf.update_offset(pos), pos)

    def test_end_of_file(self):
        # check if we can seek past the end of the file
        self.assertEqual(self.tdf.update_offset(len(self.data)+1), len(self.data)+1)

    def test_negative_offset(self):
        # negative offsets should set current position to the beginning of the file
        self.assertEqual(self.tdf.update_offset(-1), 0)


class TDFByteStreamTestReadInteger(TDFByteStreamTest):
    '''Test reading four byte integer values.

    '''
    def setUp(self):
        self.data = [1, 2, 3]
        self.fmt = self.endianness + 'iii'  # three ints
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)

    def test_read_values(self):
        # test automatic advancing to the next integer
        for i in range(len(self.data)):
            self.assertEqual(self.tdf.read_integer(), self.data[i])


class TDFByteStreamTestReadLong(TDFByteStreamTest):
    '''Test reading eight byte integer values.

    '''
    def setUp(self):
        self.data = [1, 2, 3]
        self.fmt = self.endianness + 'qqq'   # three longs
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)

    def test_read_values(self):
        # test automatic advancing to the next integer
        for i in range(len(self.data)):
            self.assertEqual(self.tdf.read_long(), self.data[i])


class TDFByteStreamTestReadFloat(TDFByteStreamTest):
    '''Test reading four byte floating point numbers.

    '''
    def setUp(self):
        self.data = [1.1, 2.2, 3.3]
        self.fmt = self.endianness + 'fff'   # three floats
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)

    def test_read_values(self):
        # test automatic advancing to the next float
        for i in range(len(self.data)):
            self.assertAlmostEqual(self.tdf.read_float(), self.data[i])


class TDFByteStreamTestReadBytes(TDFByteStreamTest):
    '''Test reading a number of bytes.

    '''
    def setUp(self):
        self.data = ['a', 'b', 'c']
        self.fmt = self.endianness + 'ccc'  # three one-byte characters
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)
        self.length = struct.calcsize(self.fmt)  # total number of bytes used to encode the data

    def test_read_zero_bytes(self):
        self.assertEqual(self.tdf.read_bytes(0), '')

    def test_read_negative_bytes(self):
        self.assertEqual(self.tdf.read_bytes(-1), ''.join(self.data))

    def test_read_available_bytes(self):
        # test reading all available bytes
        result = self.tdf.read_bytes(self.length)
        # check if we got out the same number of byes as we requested
        self.assertEqual(len(result), self.length)
        # check if the bytes are the same
        self.assertEqual(list(struct.unpack(self.fmt, result)), self.data)

    def test_read_end_of_file(self):
        # read past the end of the buffer
        result = self.tdf.read_bytes(self.length+1)
        self.assertEqual(len(result), self.length)

    def test_read_fixed_string(self):
        # read an arbitrary number of bytes as a string
        self.assertEqual(self.tdf.read_string(len(self.data)), ''.join(self.data))

    def test_read_string_end_of_file(self):
        # if number of bytes not provided, we should read until EOF
        self.assertEqual(self.tdf.read_string(), ''.join(self.data))

    def test_read_null_terminated_string(self):
        # if number of bytes not provided, we should read until null character
        self.data += ['\x00', 'd']
        self.fmt += 'cc'   # additional four one-byte characters
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)
        self.assertEqual(self.tdf.read_string(), ''.join(self.data[0:3]))


class TDFByteTestInvalidValues(TDFByteStreamTest):
    '''Test reading invalid values.

    '''
    def setUp(self):
        self.data = 'a'
        self.fmt = self.endianness + 'c'  # char - one byte long
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.tdf = tdf_file.TDFByteStream(bytes=self.binary_data)

    def test_read_int(self):
        self.assertRaises(tdf_file.InsufficientBytesError, self.tdf.read_integer)

    def test_read_long(self):
        self.assertRaises(tdf_file.InsufficientBytesError, self.tdf.read_long)

    def test_read_float(self):
        self.assertRaises(tdf_file.InsufficientBytesError, self.tdf.read_float)


class TDFByteStreamRegressionTest(unittest.TestCase):
    '''Regression test against TDFBitStream class.

    '''
    def setUp(self):
        self.endianness = '<'   # should match endianness of TDFByteStream

    def test_update_offset(self):
        '''Test moving around the file.

        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'iii'
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(bytes=binary_data)
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        # check if the initial position is set to the beginning of the file
        self.assertEqual(bytestr.update_offset(None), bitstr.update_offset(None))
        # go to random positions in the file
        self.assertEqual(bytestr.update_offset(2), bitstr.update_offset(2))
        self.assertEqual(bytestr.update_offset(1), bitstr.update_offset(1))
        # check if we can seek past the end of the file
        self.assertEqual(bytestr.update_offset(len(data)+1), bitstr.update_offset(len(data)+1))

    def test_read_integer(self):
        '''Test reading four byte integers.

        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'iih'   # two ints and a short
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(bytes=binary_data)
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        self.assertEqual(bytestr.read_integer(), bitstr.read_integer())
        # test automatic advancing to the next integer
        self.assertEqual(bytestr.read_integer(), bitstr.read_integer())

    def test_read_long(self):
        '''Test reading eight byte integers.

        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'qqh'   # two long ints and a short
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(bytes=binary_data)
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        self.assertEqual(bytestr.read_long(), bitstr.read_long())
        # test automatic advancing to the next integer
        self.assertEqual(bytestr.read_long(), bitstr.read_long())

    def test_example(self):
        data = ['a', 'b', 'c', '\x00', 1, 2, 3, 'x', 'y', 'z', '\x00']
        fmt = self.endianness + '4c iqf 4c'
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(bytes=binary_data)
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        # test reading a two character string
        self.assertEqual(bytestr.read_string(2), bitstr.read_string(2))
        # test reading until the null character
        self.assertEqual(bytestr.read_string(), bitstr.read_string())
        # test reading numbers
        self.assertEqual(bytestr.read_integer(), bitstr.read_integer())
        self.assertEqual(bytestr.read_long(), bitstr.read_long())
        self.assertEqual(bytestr.read_float(), bitstr.read_float())
        # test reading until the EOF
        self.assertEqual(bytestr.read_string(), bitstr.read_string())
        # read bytes (first reset the offset to the beginning of the binary data stream)
        bytestr = tdf_file.TDFByteStream(bytes=binary_data)
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)
        self.assertEqual(bytestr.read_bytes(3), bitstr.read_bytes(3))
        # test update offset (
        bytestr = tdf_file.TDFByteStream(bytes=binary_data)
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)
        self.assertEqual(bytestr.update_offset(None), bitstr.update_offset(None))
        self.assertEqual(bytestr.update_offset(5), bitstr.update_offset(5))
