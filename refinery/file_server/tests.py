'''
Created on Apr 21, 2012

@author: Ilya Sytchev
'''

from django.utils import unittest
import struct
from file_server import tdf_file

class TDFByteStreamTest(unittest.TestCase):
    def setUp(self):
        self.endianness = '<'   # should match endianness of TDFByteStream

    def test_update_offset(self):
        '''Test moving around the file.

        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'iii'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        # check if the initial position is set to the beginning of the file
        self.assertEqual(tdf.update_offset(None), 0)
        # go to random positions in the file
        self.assertEqual(tdf.update_offset(2), 2)
        self.assertEqual(tdf.update_offset(1), 1)
        # check if we can seek past the end of the file
        self.assertEqual(tdf.update_offset(len(data)+1), len(data)+1)

    def test_read_integer(self):
        '''Test reading of four byte integers.

        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'iih'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        self.assertEqual(tdf.read_integer(), data[0])
        # test automatic advancing to the next integer
        self.assertEqual(tdf.read_integer(), data[1])
        # test reading a short (2 bytes) - past the end of the buffer
        self.assertEqual(tdf.read_integer(), None)

    def test_read_long(self):
        '''Test reading eight byte integers.
        
        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'qqh'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        self.assertEqual(tdf.read_long(), data[0])
        # test automatic advancing to the next integer
        self.assertEqual(tdf.read_long(), data[1])
        # test reading a short (2 bytes) - past the end of the buffer
        self.assertEqual(tdf.read_long(), None)

    def test_read_float(self):
        '''Test reading four byte floating point numbers.

        '''
        data = [1.1, 2.2, 3]
        fmt = self.endianness + 'ffh'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        self.assertAlmostEqual(tdf.read_float(), data[0])
        # test automatic advancing to the next float
        self.assertAlmostEqual(tdf.read_float(), data[1])
        # test reading a short (2 bytes) - past the end of the buffer
        self.assertEqual(tdf.read_float(), None)

    def test_read_bytes(self):
        '''Test reading a number of bytes.
        
        '''
        data = [1, 2, 3]
        fmt = self.endianness + 'iii'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)
        length = 4  # number of bytes used to encode each member of data
 
        for i in range(len(data)):
            result = tdf.read_bytes(length)
            # check if we got out the same number of byes as we requested
            self.assertEqual(len(result), length)
            # check if the bytes are the same
            self.assertEqual(struct.unpack('i', result)[0], data[i])
        # try reading past the end of the buffer
        result = tdf.read_bytes(length)
        self.assertNotEqual(len(result), length)

    def test_read_string(self):
        '''Test reading a string.

        '''
        data = ['a', 'b', 'c']
        fmt = self.endianness + '3c'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)
        # test reading number of bytes
        self.assertEqual(tdf.read_string(len(data)), ''.join(data))

        # if number of bytes not provided, we should read until EOF
        data = ['a', 'b', 'c']
        fmt = self.endianness + '3c'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)
        self.assertEqual(tdf.read_string(), ''.join(data))

        # if number of bytes not provided, we should read until null character
        data += ['\x00', 'd', 'e', 'f']
        fmt = self.endianness + '7c'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)
        self.assertEqual(tdf.read_string(), ''.join(data[0:3]))
