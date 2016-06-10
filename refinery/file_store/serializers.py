from rest_framework import serializers

from .models import FileStoreItem


class FileStoreItemSerializer(serializers.ModelSerializer):

    filetype = serializers.StringRelatedField()

    class Meta:
        model = FileStoreItem
