from rest_framework import serializers

from file_store.models import FileStoreItem


class FileStoreItemSerializer(serializers.ModelSerializer):

    filetype = serializers.StringRelatedField()

    class Meta:
        model = FileStoreItem
