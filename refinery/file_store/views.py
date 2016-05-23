from file_store.models import FileStoreItem
from file_store.serializers import FileStoreItemSerializer
from rest_framework import viewsets


class FileStoreItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows FileStoreItems to be viewed
    """
    queryset = FileStoreItem.objects.all()
    serializer_class = FileStoreItemSerializer
