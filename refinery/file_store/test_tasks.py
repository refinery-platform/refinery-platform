import uuid

from django.test import SimpleTestCase

import mock

from .tasks import UNKNOWN_FILE_SIZE, ProgressPercentage, get_file_size


class TestGetFileSize(SimpleTestCase):
    def setUp(self):
        self.test_size = 1234

    @mock.patch('os.path.getsize')
    def test_absolute_path_file_size(self, getsize_mock):
        getsize_mock.return_value = self.test_size
        self.assertEqual(get_file_size('/absolute/path'), self.test_size)

    @mock.patch('os.path.getsize')
    def test_absolute_path_unknown_file_size(self, getsize_mock):
        getsize_mock.side_effect = EnvironmentError()
        self.assertEqual(get_file_size('/absolute/path'), UNKNOWN_FILE_SIZE)


class TestProgressPercentage(SimpleTestCase):
    def setUp(self):
        self.test_size = 1000
        self.task_id = str(uuid.uuid4())

    @mock.patch('file_store.tasks.get_file_size')
    def test_set_file_size(self, get_file_size_mock):
        get_file_size_mock.return_value = self.test_size
        progress_monitor = ProgressPercentage('/absolute/path', self.task_id)
        self.assertEqual(progress_monitor._file_size, self.test_size)

    @mock.patch('celery.Task.update_state')
    @mock.patch('file_store.tasks.get_file_size')
    def test_file_size_update(self, get_file_size_mock, update_state_mock):
        get_file_size_mock.return_value = self.test_size
        progress_monitor = ProgressPercentage('/absolute/path', self.task_id)
        progress_monitor(100)
        update_state_mock.assert_called_with(self.task_id, state='PROGRESS',
                                             meta={'percent_done': '10',
                                                   'current': 100,
                                                   'total': self.test_size})
