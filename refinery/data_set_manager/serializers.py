from rest_framework import serializers

from .models import Assay, Attribute, AttributeOrder, FileStoreItem, Node


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
    attributes = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    file_import_status = serializers.SerializerMethodField()
    file_uuid = serializers.CharField(max_length=36,
                                      required=False,
                                      allow_null=True)
    file_url = serializers.SerializerMethodField()

    parents = serializers.SerializerMethodField()

    def get_attributes(self, node):
        attributes = node.attribute_set.all().filter(subtype='organism')
        # NOTE: For provenance graph it filters on organism, unsure the whys
        return AttributeSerializer(attributes, many=True).data

    def get_children(self, node):
        return node.get_children()

    def get_file_url(self, node):
        try:
            file_item = FileStoreItem.objects.get(uuid=node.file_uuid)
        except:
            return ''
        return file_item.get_datafile_url()

    def get_file_import_status(self, node):
        try:
            file_item = FileStoreItem.objects.get(uuid=node.file_uuid)
        except:
            return ''
        return file_item.get_import_status()

    def get_parents(self, node):
        return node.get_parents()

    class Meta:
        model = Node
