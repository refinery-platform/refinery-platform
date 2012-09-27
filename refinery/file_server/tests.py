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
        data = [1, 2, 3, 'c']
        fmt = self.endianness + 'iihc'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        self.assertEqual(tdf.read_integer(), data[0])
        # test automatic advancing to the next integer
        self.assertEqual(tdf.read_integer(), data[1])
        # test reading a short (2 bytes)
        self.assertEqual(tdf.read_integer(), None)
        # reading a character (1 byte)
        self.assertEqual(tdf.read_integer(), None)
        # reading past the end of the buffer
        self.assertEqual(tdf.read_integer(), None)

    def test_read_long(self):
        '''Test reading eight byte integers.
        
        '''
        data = [1, 2, 3, 'c']
        fmt = self.endianness + 'qqhs'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        self.assertEqual(tdf.read_long(), data[0])
        # test automatic advancing to the next integer
        self.assertEqual(tdf.read_long(), data[1])
        # test reading a short (2 bytes)
        self.assertEqual(tdf.read_long(), None)
        # reading a character (1 byte)
        self.assertEqual(tdf.read_long(), None)
        # reading past the end of the buffer
        self.assertEqual(tdf.read_long(), None)

    def test_read_float(self):
        '''Test reading four byte floating point numbers.

        '''
        data = [1.1, 2.2, 3, 'c']
        fmt = self.endianness + 'ffhs'
        binary_data = struct.pack(fmt, *data)
        tdf = tdf_file.TDFByteStream(bytes=binary_data)

        self.assertAlmostEqual(tdf.read_float(), data[0])
        # test automatic advancing to the next integer
        self.assertAlmostEqual(tdf.read_float(), data[1])
        # test reading a short (2 bytes)
        self.assertAlmostEqual(tdf.read_float(), None)
        # reading a character (1 byte)
        self.assertAlmostEqual(tdf.read_float(), None)
        # reading past the end of the buffer
        self.assertAlmostEqual(tdf.read_float(), None)
