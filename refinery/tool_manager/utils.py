import json
import logging
import os
from django.contrib import admin
from django.db import transaction
from jsonschema import RefResolver, validate, ValidationError

from factory_boy.django_model_factories import (FileRelationshipFactory,
                                                InputFileFactory,
                                                ToolDefinitionFactory,
                                                OutputFileFactory)
from file_store.models import FileType

logger = logging.getLogger(__name__)


class AdminFieldPopulator(admin.ModelAdmin):
    """
    Wrapper around ModelAdmin that exposes all of a Model's fields in admin ui
    """
    def __init__(self, model, admin_site):
        super(AdminFieldPopulator, self).__init__(model, admin_site)
        self.list_display = [field.name for field in model._meta.fields]


class FileTypeValidationError(RuntimeError):
    """
    Custom exception class that accepts a `filetype` and `error` upon
    instantiation and builds a relevant error message
    """
    def __init__(self, filetype, error):
        error_message = (
            "Couldn't properly fetch FileType: {}.\n"
            "Valid FileTypes are {}.\n"
            " {}".format(
                filetype,
                [f.name for f in FileType.objects.all()],
                error)
        )

        super(FileTypeValidationError, self).__init__(error_message)


@transaction.atomic
def create_tool_definition_from_workflow(workflow_dictionary):
    """
    :param workflow_dictionary: dict of data that represents a Galaxy workflow
    """

    tool_definition = ToolDefinitionFactory(
        name=workflow_dictionary["name"],
        description=workflow_dictionary["annotation"]["description"],
        tool_type=workflow_dictionary["tool_type"],
        file_relationship=create_file_relationship_nesting(
            workflow_dictionary["annotation"])
    )

    for output_file in workflow_dictionary["annotation"]["output_files"]:
        try:
            filetype = FileType.objects.get(
                name=output_file["filetype"]["name"])
        except(FileType.DoesNotExist, FileType.MultipleObjectsReturned) as e:
            raise FileTypeValidationError(output_file["filetype"]["name"], e)
        else:
            tool_definition.output_files.add(
                OutputFileFactory(
                    name=output_file["name"],
                    description=output_file["description"],
                    filetype=filetype
                    )
                )

    # TODO: figure out Parameter/GalaxyParameter stuff


@transaction.atomic
def create_file_relationship_nesting(workflow_annotation,
                                     file_relationships=None):
    """
    :param workflow_annotation: dict to act recursively upon to build
    the proper FileRelationship structure

    :param file_relationships: Used to construct a populated list of
    fileRelationship objects upon recursive calls to
    create_file_relationship_nesting.
    Is necessary due to the fact that we cannot properly create the M2M
    relations between FileRelationships until we have created the
    "bottom-most" one.

    :return: The top-most FileRelationship object
    """

    # This if statement may seem unnecessary at first, but it is indeed needed.
    # One may think: "why not just have `file_relationships=[]` in the
    # method signature?" But this [utilizing mutable arguments] is a
    # common Python "gotcha". Especially in the context of recursive methods.
    # It's illustrated well here: http://bit.ly/21b5Axg
    if not file_relationships:
        file_relationships = []

    # If the file_relationship has a nested file_relationship,
    # create a FileRelationship object, and recursively call
    # create_file_relationship_nesting() with said nested dict
    if isinstance(workflow_annotation["file_relationship"], dict):
        file_relationship = FileRelationshipFactory(
            name=workflow_annotation["file_relationship"]["name"],
            value_type=workflow_annotation["file_relationship"]["value_type"])

        # Add FileRelationship obj to array that we'll pass to
        # subsequent recursive calls. This is where we will
        # temporarily store our FileRelationship objs until we reach
        # the bottom-most nesting.
        file_relationships.append(file_relationship)

        # NOTE: Recursive functions need to return themselves,
        # otherwise Python returns `None`
        return create_file_relationship_nesting(
            workflow_annotation["file_relationship"],
            file_relationships=file_relationships
        )
    else:
        # If we reach here, we have reached the bottom-most nested
        # file_relationship. Since we want to act upon the bottom-most
        # file_relationship's input_files, we can safely grab the
        # last element from our fr_store due to Python's nature of
        # ordering lists.
        bottom_file_relationship = file_relationships[-1]

        # Fetch, create, and associate InputFiles with the
        # bottom-most file_relationship
        if workflow_annotation["input_files"]:
            for input_file in workflow_annotation["input_files"]:
                input_file_instance = InputFileFactory(
                    name=input_file["name"],
                    description=input_file["description"]
                )
                allowed_filetypes = input_file["allowed_filetypes"]
                for allowed_filetype in allowed_filetypes:
                    try:
                        filetype_instance = FileType.objects.get(
                            name=allowed_filetype["name"]
                        )
                    except(FileType.DoesNotExist,
                           FileType.MultipleObjectsReturned) as e:
                        raise FileTypeValidationError(
                            allowed_filetype["name"], e
                        )
                    else:
                        input_file_instance.allowed_filetypes.add(
                            filetype_instance
                        )
                        bottom_file_relationship.input_files.add(
                            input_file_instance
                        )

        # Iterate through stored FileRelationship objects and
        # associate children w/ parents
        for index, file_relationship in enumerate(file_relationships):
            # Return the top-most FileRelationship if we reach
            # the last element in the list
            if index == len(file_relationships) - 1:
                return file_relationships[0]

            # Add FileRelationship's children using Django's M2M add()
            file_relationship.file_relationship.add(
                file_relationships[index + 1]
            )


def validate_workflow_annotation(workflow_dictionary):
    """
    Validate incoming annotation data to ensure ToolDefinitions are created
    properly.
    :param workflow_dictionary: dict containing Galaxy Workflow data
    """

    resolver = RefResolver("{}{}{}".format(
        'file://', os.path.abspath("tool_manager/schemas"), '/'
    ), None)
    with open("tool_manager/schemas/ToolDefinition.json", "r") as f:
        schema = json.loads(f.read())
        annotation_to_validate = workflow_dictionary["annotation"]
        annotation_to_validate["name"] = workflow_dictionary["name"]
        annotation_to_validate["tool_type"] = workflow_dictionary["tool_type"]
        try:
            validate(annotation_to_validate, schema, resolver=resolver)
        except ValidationError as e:
            raise RuntimeError(
                "Workflow not properly Annotated. Please read: "
                "http://bit.ly/2mKczka for more information on how to "
                "properly annotate your Galaxy-based workflows. {}".format(e))
