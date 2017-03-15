import json
import logging
from django.contrib import admin
from jsonschema import validate, ValidationError

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


class WorkflowAnnotationValidationError(Exception):
    """Custom exception class that accepts a `message` upon instantiation"""
    def __init__(self, message):
        super(WorkflowAnnotationValidationError, self).__init__(message)


def create_tool_definition_from_workflow(workflow_dictionary):
    """
    :param workflow_dictionary: dict of data that represents a Galaxy workflow
    """

    file_relationship = create_file_relationship_nesting(
        workflow_dictionary["annotation"])

    tool_definition = ToolDefinitionFactory(
        name=workflow_dictionary["name"],
        description=workflow_dictionary["annotation"]["description"],
        tool_type="WORKFLOW",
        file_relationship=file_relationship
    )

    for output_file in workflow_dictionary["annotation"]["output_files"]:
        tool_definition.output_files.add(
            OutputFileFactory(
                name=output_file["name"],
                description=output_file["description"],
                filetype=FileType.objects.get(
                    name=output_file["filetype"]["name"]
                )
            )
        )

    # TODO: figure out Parameter/GalaxyParameter stuff


def create_file_relationship_nesting(workflow_annotation,
                                     file_relationships=None):
    """
    :param workflow_annotation: dict to act recursively upon to build
    the proper FileRelationship structure

    :param file_relationships: initially `None`, but becomes a populated list
    upon recursive calls to create_file_relationship_nesting. Allows for temp.
    storage of FileRelationship objs created in this method.
    Is necessary due to the fact that we cannot properly create the M2M
    relations between FileRelationships until we have created the
    "bottom-most" one.

    :return: The top-most FileRelationship object
    """

    if not file_relationships:
        file_relationships = []

    for key, value in workflow_annotation.iteritems():
        if key == "file_relationship":
            # If the file_relationship has a nested file_relationship,
            # create a FileRelationship object, and recursively call
            # create_file_relationship_nesting() with said nested dict
            if isinstance(value, dict):
                file_relationship = FileRelationshipFactory(
                    name=workflow_annotation[key]["name"],
                    value_type=workflow_annotation[key]["value_type"])

                # Add FileRelationship obj to array that we'll pass to
                # subsequent recursive calls. This is where we will
                # temporarily store our FileRelationship objs until we reach
                # the bottom-most nesting.
                file_relationships.append(file_relationship)
                # NOTE: Recursive functions need to return themselves,
                # otherwise Python returns `None`
                return create_file_relationship_nesting(
                    value, file_relationships=file_relationships)
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
                            description=input_file["description"])

                        allowed_filetypes = input_file["allowed_filetypes"]

                        for key in allowed_filetypes:
                            # NOTE: we are not handling the usual .get()
                            # exceptions here due to the transaction
                            # management wrapping
                            # create_tool_definition_from_workflow()
                            file_type = FileType.objects.get(name=key["name"])

                            input_file_instance.allowed_filetypes.add(
                                file_type)
                            bottom_file_relationship.input_files.add(
                                input_file_instance)

                # Iterate through stored FileRelationship objects and
                # associate their children
                for index, file_relationship in enumerate(file_relationships):
                    try:
                        file_relationship.file_relationship.add(
                            file_relationships[index + 1]
                        )
                    except IndexError:
                        # Return the top-most FileRelationship if we reach
                        # the last element in the list
                        return file_relationships[0]


def validate_workflow_annotation(workflow_annotation):
    """
    Validate incoming annotation data to ensure ToolDefinitions are created
    properly.
    :param workflow_annotation: dict containing Galaxy Workflow annotation data
    :return: Boolean: True if validation passes.
    """

    with open("tool_manager/schemas/tool_definition.json", "r") as f:
        schema = json.loads(f.read())
        annotation_to_validate = workflow_annotation["annotation"]
        annotation_to_validate["name"] = workflow_annotation["name"]
        annotation_to_validate["tool_type"] = workflow_annotation["tool_type"]
        try:
            validate(annotation_to_validate, schema)
        except ValidationError as e:
            raise WorkflowAnnotationValidationError(
                "Workflow not properly Annotated. Please read: "
                "http://bit.ly/2mKczka for more information on how to "
                "properly annotate your Galaxy-based workflows. {}".format(e))
        except Exception as e:
            raise WorkflowAnnotationValidationError("Something unexpected "
                                                    "happend: {}".format(e))
        else:
            return True
