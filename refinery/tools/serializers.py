# Serializers define the API representation.
from django.forms.models import model_to_dict
from rest_framework import serializers
from .models import ToolDefinition, FileRelationship


class FileRelationshipSerializer(serializers.ModelSerializer):
    nested_elements = serializers.StringRelatedField(many=True)

    class Meta:
        model = FileRelationship
        fields = ('name', 'value_type', 'nested_elements')


class ToolDefinitionSerializer(serializers.HyperlinkedModelSerializer):
    parameters = serializers.SerializerMethodField('_get_parameters')
    input_files = serializers.SerializerMethodField('_get_input_files')
    output_files = serializers.SerializerMethodField('_get_output_files')
    file_relationships = FileRelationshipSerializer()

    def _get_parameters(self, obj):
        return [model_to_dict(instance) for instance in obj.get_parameters()]

    def _get_input_files(self, obj):
        return [model_to_dict(instance) for instance in obj.get_input_files()]

    def _get_output_files(self, obj):
        return [model_to_dict(instance) for instance in obj.get_output_files()]

    class Meta:
        model = ToolDefinition
        fields = (
            'uuid', 'name', 'description', 'tool_type',
            'file_relationships', 'parameters', 'input_files', 'output_files')
