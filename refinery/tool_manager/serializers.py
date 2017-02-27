from rest_framework import serializers
from rest_framework_recursive.fields import RecursiveField

from file_store.models import FileType
from .models import ToolDefinition, FileRelationship, OutputFile, InputFile, \
    Parameter


class FileTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileType
        exclude = ["id"]


class ParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parameter
        exclude = ["id"]


class InputFileSerializer(serializers.ModelSerializer):
    allowed_filetypes = FileTypeSerializer(many=True)

    class Meta:
        model = InputFile
        exclude = ["id"]


class FileRelationshipSerializer(serializers.ModelSerializer):
    # RecursiveField allows for the exposure of all self-referential nested
    # ManyToMany relations in the serialized response data
    nested_elements = RecursiveField(required=False, allow_null=True,
                                     many=True)
    input_files = InputFileSerializer(many=True)

    class Meta:
        model = FileRelationship
        exclude = ["id"]


class OutputFileSerializer(serializers.ModelSerializer):
    filetype = FileTypeSerializer()

    class Meta:
        model = OutputFile
        exclude = ["id"]


class ToolDefinitionSerializer(serializers.ModelSerializer):
    file_relationship = FileRelationshipSerializer()
    output_files = OutputFileSerializer(many=True)
    parameters = ParameterSerializer(many=True)

    class Meta:
        model = ToolDefinition
        exclude = ["id"]
