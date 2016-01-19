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
    assay = serializers.CharField()
    solr_field = serializers.CharField()
    rank = serializers.CharField()
    is_exposed = serializers.BooleanField()
    is_facet = serializers.BooleanField()
    is_active = serializers.BooleanField()
    is_internal = serializers.BooleanField()

    def create(self, validated_data):
        """
        Create and return a new `AttributeOrder` instance, given the validated
        data.
        """
        return AttributeOrder.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """
        Update and return an existing `AttributeOrder` instance, given the
        validated data.
        """
        instance.study = validated_data.get('study', instance.study)
        instance.assay = validated_data.get('assay', instance.assay)
        instance.solr_field = validated_data.get('solr_field',
                                                 instance.solr_field)
        instance.rank = validated_data.get('rank', instance.rank)
        instance.is_exposed = validated_data.get('is_exposed',
                                                 instance.is_exposed)
        instance.is_facet = validated_data.get('is_facet', instance.is_facet)
        instance.is_active = validated_data.get('is_active',
                                                instance.is_active)
        instance.is_internal = validated_data.get('is_internal',
                                                  instance.is_internal)
        instance.save()
        return instance
