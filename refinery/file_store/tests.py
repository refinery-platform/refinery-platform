"""
This file contains tests for file_store.models and file_store.tasks

"""

import os
from django.test import TestCase
import settings
import file_store.models as models
import file_store.tasks as tasks

class FileStoreUnitTest(TestCase):

    filename = 'test_file.dat'
    source = os.path.join('/some/path', filename)
    sharename = 'labname'
    item = models.FileStoreItem(source=source, sharename=sharename)

    def test_file_path(self):
        """
        Tests that the file store path contains sharename and filename
        """
        path = models.file_path(self.item, self.filename)
        #TODO: replace with assertRegexpMatches()
        self.assertIn(self.sharename, path)
        self.assertIn(self.filename, path)

    def test_get_temp_dir(self):
        """
        Tests that the file store temp dir is equal to file_store.models.FILE_STORE_TEMP_DIR
        """
        self.assertEqual(models.get_temp_dir(), models.FILE_STORE_TEMP_DIR)
    
    def test_get_file_extension(self):
        """
        Tests that the correct file extension is returned
        """

    def test_is_permanent(self):
        """
        Tests that the file is not in the file store cache
        """
