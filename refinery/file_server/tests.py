"""
Created on Apr 21, 2012

"""

import cStringIO
import struct

from django.test import TestCase

from file_server import tdf_file, models
from file_store import models as fs_models


class TDFItemTest(TestCase):
    """Test all operations on TDFItem instances"""

    # TODO: add missing tests
    def setUp(self):
        self.tdf_file = fs_models.FileStoreItem.objects.create_item("tdf")

    def test_add_tdfitem(self):
        self.assertIsNotNone(models.add(self.tdf_file.uuid))


class BigBEDItemTest(TestCase):
    """Test all operations on BigBEDItem instances"""

    def setUp(self):
        self.bigbed_file = fs_models.FileStoreItem.objects.create_item("bb")

    def test_add_bigbeditem(self):
        self.assertIsNotNone(models.add(self.bigbed_file.uuid))

    def test_get_bigbeditem(self):
        bigbed_item = models.BigBEDItem.objects.create(
            data_file=self.bigbed_file)
        self.assertEqual(models.get(bigbed_item), bigbed_item)

    def test_delete_bigbeditem(self):
        bigbed_item = models.BigBEDItem.objects.create(
            data_file=self.bigbed_file)
        self.assertTrue(models.delete(bigbed_item.data_file.uuid))
        self.assertRaises(models._FileServerItem.DoesNotExist,
                          models.BigBEDItem.objects.get,
                          data_file__uuid=bigbed_item.data_file.uuid)


class BAMItemTest(TestCase):
    """Test all operations on BAMItem instances"""

    # TODO: add missing tests
    def setUp(self):
        self.bam_file = fs_models.FileStoreItem.objects.create_item("bam")

    def test_add_bamitem(self):
        self.assertIsNotNone(models.add(self.bam_file.uuid))


class WIGItemTest(TestCase):
    """Test all operations on WIGItem instances"""

    # TODO: add missing tests
    def setUp(self):
        self.wig_file = fs_models.FileStoreItem.objects.create_item("wig")

    def test_add_wigitem(self):
        self.assertIsNotNone(models.add(self.wig_file.uuid))


class InvalidItemTest(TestCase):
    """Test operations on invalid instances"""

    def setUp(self):
        self.undefined_file = fs_models.FileStoreItem.objects.create_item(
            "testfile")

    def test_add_unknown_file_type(self):
        # create a FileStoreItem without a file type
        self.assertIsNone(models.add(self.undefined_file.uuid))


class TDFByteStreamTest(TestCase):
    """TDFByteStream unit test base class"""
    endianness = '<'  # should match endianness of TDFByteStream


class TDFByteStreamTestUpdateOffset(TDFByteStreamTest):
    """Test moving around the file"""

    def setUp(self):
        self.data = [1, 2, 3]
        self.fmt = self.endianness + 'iii'  # three ints
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)

    def test_initial_position(self):
        # check if the initial position is set to the beginning of the file
        self.assertEqual(self.tdf.update_offset(None), 0)

    def test_arbitrary_position(self):
        # go to an arbitrary position within the file
        pos = len(self.binary_data) / 2
        self.assertEqual(self.tdf.update_offset(pos), pos)

    def test_end_of_file(self):
        # check if we can seek past the end of the file
        self.assertEqual(self.tdf.update_offset(len(self.data) + 1),
                         len(self.data) + 1)

    def test_negative_offset(self):
        # negative offsets should set current position to the beginning of the
        # file
        self.assertEqual(self.tdf.update_offset(-1), 0)


class TDFByteStreamTestReadInteger(TDFByteStreamTest):
    """Test reading four byte integer values"""

    def setUp(self):
        self.data = [1, 2, 3]
        self.fmt = self.endianness + 'iii'  # three ints
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)

    def test_read_integer(self):
        # test automatic advancing to the next integer
        for i in range(len(self.data)):
            self.assertEqual(self.tdf.read_integer(), self.data[i])


class TDFByteStreamTestReadLong(TDFByteStreamTest):
    """Test reading eight byte integer values."""

    def setUp(self):
        self.data = [1, 2, 3]
        self.fmt = self.endianness + 'qqq'  # three longs
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)

    def test_read_long(self):
        # test automatic advancing to the next integer
        for i in range(len(self.data)):
            self.assertEqual(self.tdf.read_long(), self.data[i])


class TDFByteStreamTestReadFloat(TDFByteStreamTest):
    """Test reading four byte floating point numbers."""

    def setUp(self):
        self.data = [1.1, 2.2, 3.3]
        self.fmt = self.endianness + 'fff'  # three floats
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)

    def test_read_float(self):
        # test automatic advancing to the next float
        for i in range(len(self.data)):
            self.assertAlmostEqual(self.tdf.read_float(), self.data[i])


class TDFByteStreamTestReadBytes(TDFByteStreamTest):
    """Test reading a number of bytes."""

    def setUp(self):
        self.data = ['a', 'b', 'c']
        self.fmt = self.endianness + 'ccc'  # three one-byte characters
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)
        # total number of bytes used to encode the data
        self.length = struct.calcsize(self.fmt)

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
        result = self.tdf.read_bytes(self.length + 1)
        self.assertEqual(len(result), self.length)

    def test_read_fixed_string(self):
        # read an arbitrary number of bytes as a string
        self.assertEqual(self.tdf.read_string(len(self.data)),
                         ''.join(self.data))

    def test_read_string_end_of_file(self):
        # if number of bytes not provided, we should read until EOF
        self.assertEqual(self.tdf.read_string(), ''.join(self.data))

    def test_read_null_terminated_string(self):
        # if number of bytes not provided, we should read until null character
        self.data += ['\x00', 'd']
        self.fmt += 'cc'  # additional four one-byte characters
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)
        self.assertEqual(self.tdf.read_string(), ''.join(self.data[0:3]))


class TDFByteTestInvalidValues(TDFByteStreamTest):
    """Test reading invalid values."""

    def setUp(self):
        self.data = 'a'
        self.fmt = self.endianness + 'c'  # char - one byte long
        self.binary_data = struct.pack(self.fmt, *self.data)
        self.file_object = cStringIO.StringIO(self.binary_data)
        self.tdf = tdf_file.TDFByteStream(self.file_object)

    def test_read_int(self):
        self.assertRaises(tdf_file.InsufficientBytesError,
                          self.tdf.read_integer)

    def test_read_long(self):
        self.assertRaises(tdf_file.InsufficientBytesError, self.tdf.read_long)

    def test_read_float(self):
        self.assertRaises(tdf_file.InsufficientBytesError, self.tdf.read_float)


class TDFByteStreamRegressionTest(TestCase):
    """Regression test against TDFBitStream class."""

    def setUp(self):
        self.endianness = '<'  # should match endianness of TDFByteStream

    def test_update_offset(self):
        """Test moving around the file."""
        data = [1, 2, 3]
        fmt = self.endianness + 'iii'
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(cStringIO.StringIO(binary_data))
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        # check if the initial position is set to the beginning of the file
        self.assertEqual(bytestr.update_offset(None),
                         bitstr.update_offset(None))
        # go to random positions in the file
        self.assertEqual(bytestr.update_offset(2), bitstr.update_offset(2))
        self.assertEqual(bytestr.update_offset(1), bitstr.update_offset(1))
        # check if we can seek past the end of the file
        self.assertEqual(bytestr.update_offset(len(data) + 1),
                         bitstr.update_offset(len(data) + 1))

    def test_read_integer(self):
        """Test reading four byte integers"""
        data = [1, 2, 3]
        fmt = self.endianness + 'iih'  # two ints and a short
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(cStringIO.StringIO(binary_data))
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        self.assertEqual(bytestr.read_integer(), bitstr.read_integer())
        # test automatic advancing to the next integer
        self.assertEqual(bytestr.read_integer(), bitstr.read_integer())

    def test_read_long(self):
        """Test reading eight byte integers.

        """
        data = [1, 2, 3]
        fmt = self.endianness + 'qqh'  # two long ints and a short
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(cStringIO.StringIO(binary_data))
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)

        self.assertEqual(bytestr.read_long(), bitstr.read_long())
        # test automatic advancing to the next integer
        self.assertEqual(bytestr.read_long(), bitstr.read_long())

    def test_example(self):
        data = ['a', 'b', 'c', '\x00', 1, 2, 3, 'x', 'y', 'z', '\x00']
        fmt = self.endianness + '4c iqf 4c'
        binary_data = struct.pack(fmt, *data)
        bytestr = tdf_file.TDFByteStream(cStringIO.StringIO(binary_data))
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
        # read bytes (first reset the offset to the beginning of the binary
        # data stream)
        bytestr = tdf_file.TDFByteStream(cStringIO.StringIO(binary_data))
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)
        self.assertEqual(bytestr.read_bytes(3), bitstr.read_bytes(3))
        # test update offset (
        bytestr = tdf_file.TDFByteStream(cStringIO.StringIO(binary_data))
        bitstr = tdf_file.TDFBitStream(bytes=binary_data)
        self.assertEqual(bytestr.update_offset(None),
                         bitstr.update_offset(None))
        self.assertEqual(bytestr.update_offset(5), bitstr.update_offset(5))
