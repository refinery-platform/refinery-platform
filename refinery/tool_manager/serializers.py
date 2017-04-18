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
    container_name = serializers.SerializerMethodField(
        method_name="_get_container_name",
        required=False,
        allow_null=False
    )
    container_input_path = serializers.SerializerMethodField(
        method_name="_get_container_input_path",
        required=False,
        allow_null=False
    )
    docker_image_name = serializers.SerializerMethodField(
        method_name="_get_docker_image_name",
        required=False,
        allow_null=False
    )
    galaxy_workflow_id = serializers.SerializerMethodField(
        method_name="_get_galaxy_workflow_id",
        required=False,
        allow_null=False
    )

    parameters = ParameterSerializer(many=True, allow_null=True)

    def _get_container_name(self, obj):
        return obj.get_container_name()

    def _get_container_input_path(self, obj):
        return obj.get_container_input_path()

    def _get_docker_image_name(self, obj):
        return obj.get_docker_image_name()

    def _get_galaxy_workflow_id(self, obj):
        return obj.get_galaxy_workflow_id()

    def to_representation(self, obj):
        # get the original serialized objects representation
        ret = super(ToolDefinitionSerializer, self).to_representation(obj)

        # Remove some fields if we aren't dealing with an Extension of the
        # ToolDefinition model
        if obj.get_container_name() is None:
            ret.pop("container_name")

        if obj.get_container_input_path() is None:
            ret.pop("container_input_path")

        if obj.get_docker_image_name() is None:
            ret.pop("docker_image_name")

        if obj.get_galaxy_workflow_id() is None:
            ret.pop("galaxy_workflow_id")

        return ret

    class Meta:
        model = ToolDefinition
        exclude = ["id"]
