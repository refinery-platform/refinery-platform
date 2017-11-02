import uuid

from django.test import TestCase

from bioblend import galaxy
import mock

from galaxy_connector.models import Instance


class GalaxyInstanceTests(TestCase):
    def setUp(self):
        self.GALAXY_HISTORY_ID = str(uuid.uuid4())
        self.GALAXY_DATASET_ID = str(uuid.uuid4())
        self.GALAXY_DATASET_FILESIZE = 1024
        self.MISCELLANEOUS_STRING = "Coffee is tasty"

        self.galaxy_instance = Instance.objects.create(
            base_url="www.example.com",
            api_key=str(uuid.uuid4()),
        )
        self.show_history_mock = mock.patch.object(
            galaxy.histories.HistoryClient,
            "show_history",
            return_value=[
                {
                    "name": "Test History Content Entry",
                    "url": "www.example.com/history_content_entry",
                    "type": "file",
                    "id": self.GALAXY_DATASET_ID
                }
            ]

        ).start()
        self.show_dataset_mock = mock.patch.object(
            galaxy.histories.HistoryClient,
            "show_dataset"
        ).start()

    def test_get_history_file_list_with_populated_dataset_dict(self):
        self.show_dataset_mock.return_value = {
            "file_ext": "bam",
            "state": "ok",
            "id": self.GALAXY_DATASET_ID,
            "file_size": self.GALAXY_DATASET_FILESIZE,
            "visible": True,
            "file_name": "Cool bam file",
            "genome_build": "hg19",
            "misc_info": self.MISCELLANEOUS_STRING,
            "misc_blurb": self.MISCELLANEOUS_STRING,
        }

        history_file_list = self.galaxy_instance.get_history_file_list(
            self.GALAXY_HISTORY_ID
        )

        self.assertEqual(len(history_file_list), 1)
        history_file = history_file_list[0]
        self.assertEqual(history_file["type"], "bam")
        self.assertEqual(history_file["state"], "ok")
        self.assertEqual(history_file["dataset_id"], self.GALAXY_DATASET_ID)
        self.assertEqual(history_file["file_size"],
                         self.GALAXY_DATASET_FILESIZE)
        self.assertTrue(history_file["visible"])
        self.assertEqual(history_file["file_name"], "Cool bam file")
        self.assertEqual(history_file["genome_build"], "hg19")
        self.assertEqual(history_file["misc_info"], self.MISCELLANEOUS_STRING)
        self.assertEqual(history_file["misc_blurb"], self.MISCELLANEOUS_STRING)

    def test_get_history_file_list_with_unpopulated_dataset_dict(self):
        self.show_dataset_mock.return_value = {}
        history_file_list = self.galaxy_instance.get_history_file_list(
            self.GALAXY_HISTORY_ID
        )

        self.assertEqual(len(history_file_list), 1)
        history_file = history_file_list[0]
        self.assertIsNone(history_file["type"])
        self.assertIsNone(history_file["state"])
        self.assertIsNone(history_file["dataset_id"])
        self.assertIsNone(history_file["file_size"])
        self.assertIsNone(history_file["visible"])
        self.assertIsNone(history_file["file_name"])
        self.assertIsNone(history_file["genome_build"])
        self.assertIsNone(history_file["misc_info"])
        self.assertIsNone(history_file["misc_blurb"])
