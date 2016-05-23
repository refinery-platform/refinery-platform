from file_store.models import FileStoreItem
from rest_framework import serializers


class FileStoreItemSerializer(serializers.HyperlinkedModelSerializer):

    filetype = serializers.StringRelatedField()

    class Meta:
        model = FileStoreItem
