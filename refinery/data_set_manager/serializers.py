from rest_framework import serializers

from .models import AttributeOrder
from .models import Assay


class AssaySerializer(serializers.ModelSerializer):

    class Meta:
        model = Assay
        fields = (
            'uuid', 'study', 'measurement', 'measurement_accession',
            'measurement_source', 'technology', 'technology_accession',
            'technology_source', 'platform', 'file_name')
        depth = 1


class AttributeOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttributeOrder
        fields = (
            'assay', 'study', 'solr_field', 'rank',
            'is_exposed', 'is_facet', 'is_active',
            'is_internal', 'id')
        depth = 1

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
