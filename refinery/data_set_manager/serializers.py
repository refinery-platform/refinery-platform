from rest_framework import serializers

from .models import Assay, Attribute, AttributeOrder, Node


class AssaySerializer(serializers.ModelSerializer):

    class Meta:
        model = Assay
        fields = (
            'uuid', 'study', 'measurement', 'measurement_accession',
            'measurement_source', 'technology', 'technology_accession',
            'technology_source', 'platform', 'file_name')


class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute


class AttributeOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttributeOrder
        fields = (
            'assay', 'study', 'solr_field', 'rank',
            'is_exposed', 'is_facet', 'is_active',
            'is_internal', 'id')

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


class NodeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    file_uuid = serializers.CharField(max_length=36,
                                      required=False,
                                      allow_null=True)
    parents = serializers.SerializerMethodField()

    def get_children(self, node):
        return node.get_children()

    def get_parents(self, node):
        return node.get_parents()

    class Meta:
        model = Node
