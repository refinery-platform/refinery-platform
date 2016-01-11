from file_store.models import FileStoreItem
from rest_framework import serializers


class FileStoreItemSerializer(serializers.HyperlinkedModelSerializer):

    uuid = serializers.UUIDField()

    class Meta:
        model = FileStoreItem
        fields = ('id', 'uuid', 'created', 'updated')
