import logging

from django.http import Http404

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FileStoreItem
from .serializers import FileStoreItemSerializer

logger = logging.getLogger(__name__)


class FileStoreItems(APIView):
    """
    API endpoint that allows FileStoreItems to be viewed
    Returns filestore object

    ---
    #YAML

    GET:
        serializer: FileStoreItemSerializer
        omit_serializer: false

        parameters:
            - name: uuid
              description: FileStore uuid
              type: string
              paramType: path
              required: true
    ...
    """

    def get_object(self, uuid):
        try:
            return FileStoreItem.objects.get(uuid=uuid)
        except (FileStoreItem.DoesNotExist,
                FileStoreItem.MultipleObjectsReturned) as e:
            logger.error(e)
            raise Http404

    def get(self, request, uuid, format=None):
        file_store_item = self.get_object(uuid)
        serializer = FileStoreItemSerializer(file_store_item)
        return Response(serializer.data)
