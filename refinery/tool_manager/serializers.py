from rest_framework import serializers
from rest_framework_recursive.fields import RecursiveField

from file_store.models import FileType
from .models import (FileRelationship, InputFile, OutputFile, Parameter,
                     ToolDefinition)


class FileTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileType
        exclude = ["id"]


class ParameterSerializer(serializers.ModelSerializer):
    galaxy_workflow_step = serializers.SerializerMethodField(
        method_name="_get_galaxy_workflow_step",
        required=False,
        allow_null=False
    )

    class Meta:
        model = Parameter
        exclude = ["id"]

    def _get_galaxy_workflow_step(self, obj):
        return obj.get_galaxy_workflow_step()

    def to_representation(self, obj):
        # get the original serialized objects representation
        ret = super(ParameterSerializer, self).to_representation(obj)

        # Remove the `galaxy_workflow_step` field from the api response if it
        # isn't available (Parameter objects for Visualization-based
        # ToolDefinitions won't have this field for example)
        if obj.get_galaxy_workflow_step() is None:
            ret.pop("galaxy_workflow_step")

        return ret


class InputFileSerializer(serializers.ModelSerializer):
    allowed_filetypes = FileTypeSerializer(many=True)

    class Meta:
        model = InputFile
        exclude = ["id"]


class FileRelationshipSerializer(serializers.ModelSerializer):
    # RecursiveField allows for the exposure of all self-referential nested
    # ManyToMany relations in the serialized response data
    file_relationship = RecursiveField(
        required=False,
        allow_null=True,
        many=True
    )
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
    parameters = ParameterSerializer(many=True, allow_null=True)

    class Meta:
        model = ToolDefinition
        exclude = ["id"]
