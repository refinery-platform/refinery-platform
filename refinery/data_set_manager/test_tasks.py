import os
from data_set_manager.tasks import generate_bam_index
from django.test import TestCase
from file_store.models import FileType, FileStoreItem

class BamFileIndexTest(TestCase):

    def setUp(self):
        self.file_store_item = FileStoreItem(
            filetype=FileType.objects.get(name='BAM')
        )
        self.file_store_item.save()
        self.folder = 'data_set_manager/test-data/'
        self.test_bam_file =  self.folder + 'test.bam'

    def tearDown(self):
        os.remove(self.test_bam_file + '.bai')

    def test_index_bam_success_model_update(self):
        generate_bam_index(self.file_store_item.uuid, self.test_bam_file)
        self.assertEquals(
            FileStoreItem.objects.get(
                uuid=self.file_store_item.uuid).source,
            'data_set_manager/test-data/test.bam.bai'
        )

    def test_index_bam_success_file_creation(self):
        generate_bam_index(self.file_store_item.uuid, self.test_bam_file)
        self.assertTrue(
            os.path.exists(self.test_bam_file + '.bai')
        )
