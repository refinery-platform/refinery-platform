from rest_framework import serializers

from .models import FileStoreItem


class FileStoreItemSerializer(serializers.ModelSerializer):
    filetype = serializers.StringRelatedField()
    file_size = serializers.IntegerField(source='get_file_size')

    class Meta:
        model = FileStoreItem
