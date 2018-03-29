import uuid

from rest_framework.test import APIRequestFactory, APITestCase

from .models import FileStoreItem
from .serializers import FileStoreItemSerializer
from .views import FileStoreItems


class FileStoreItemsAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        self.item = FileStoreItem.objects.create(
            source='http://example.org/test_file.dat'
        )
        self.view = FileStoreItems.as_view()
        self.url_root = '/api/v2/file_store_items/'

    def test_get_ok_response_with_valid_uuid(self):
        request = self.factory.get(self.url_root + self.item.uuid + '/')
        response = self.view(request, self.item.uuid)
        self.assertEqual(response.status_code, 200)

    def test_get_data_with_valid_uuid(self):
        expected_response = FileStoreItemSerializer(self.item)
        request = self.factory.get(self.url_root + self.item.uuid + '/')
        response = self.view(request, self.item.uuid)
        response_keys = response.data.keys()
        for field in response_keys:
            self.assertEqual(response.data[field],
                             expected_response.data[field])

    def test_get_not_found_response_with_nonexistent_uuid(self):
        non_existent_uuid = str(uuid.uuid4())
        request = self.factory.get(self.url_root + non_existent_uuid + '/')
        response = self.view(request, non_existent_uuid)
        self.assertEqual(response.status_code, 404)
