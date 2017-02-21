from django.core import serializers as s
from rest_framework import serializers
from rest_framework_recursive.fields import RecursiveField
from .models import ToolDefinition, FileRelationship


class FileRelationshipSerializer(serializers.ModelSerializer):
    nested_elements = RecursiveField(required=False, allow_null=True,
                                     many=True)
    input_files = serializers.SerializerMethodField('_get_input_files')

    def _get_input_files(self, obj):
        return s.serialize("json", obj.get_input_files(),
                           use_natural_foreign_keys=True)

    class Meta:
        model = FileRelationship
        fields = (
            'uuid', 'name', 'value_type', 'input_files', 'nested_elements')


class ToolDefinitionSerializer(serializers.HyperlinkedModelSerializer):
    parameters = serializers.SerializerMethodField('_get_parameters')
    output_files = serializers.SerializerMethodField('_get_output_files')
    file_relationships = FileRelationshipSerializer()

    def _get_output_files(self, obj):
        return s.serialize("json", obj.get_output_files())

    def _get_parameters(self, obj):
        return s.serialize("json", obj.get_parameters())

    class Meta:
        model = ToolDefinition
        fields = (
            'uuid', 'name', 'description', 'tool_type',
            'file_relationships', 'parameters', 'output_files')
