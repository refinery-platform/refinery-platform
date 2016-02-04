import yaml

from rest_framework import serializers
from data_set_manager.models import AttributeOrder
from data_set_manager.models import Assay


class AssaySerializer(serializers.Serializer):

    uuid = serializers.CharField()
    study = serializers.CharField()
    measurement = serializers.CharField()
    measurement_accession = serializers.CharField()
    measurement_source = serializers.CharField()
    technology = serializers.CharField()
    technology_accession = serializers.CharField()
    technology_source = serializers.CharField()
    platform = serializers.CharField()
    file_name = serializers.CharField()


class AttributeOrderSerializer(serializers.Serializer):

    study = serializers.CharField(required=False, allow_blank=True)
    assay = serializers.CharField(required=True)
    solr_field = serializers.CharField()
    rank = serializers.CharField()
    is_exposed = serializers.BooleanField()
    is_facet = serializers.BooleanField()
    is_active = serializers.BooleanField()
    is_internal = serializers.BooleanField()
    id = serializers.IntegerField()

    def update(self, instance, validated_data):
        """
        Update and return an existing `AttributeOrder` instance, given the
        validated data.
        """
        instance.rank = validated_data.get('rank', instance.rank)
        instance.is_exposed = validated_data.get('is_exposed',
                                                 instance.is_exposed)
        instance.is_facet = validated_data.get('is_facet', instance.is_facet)
        instance.is_active = validated_data.get('is_active',
                                                instance.is_active)
        instance.save()
        return instance
