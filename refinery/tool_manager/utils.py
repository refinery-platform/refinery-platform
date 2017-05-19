import ast
import glob
import json
import logging
import os

from django.conf import settings
from django.contrib import admin
from django.db import transaction

from bioblend.galaxy.client import ConnectionError
from jsonschema import RefResolver, validate, ValidationError

from core.models import WorkflowEngine
from factory_boy.django_model_factories import (FileRelationshipFactory,
                                                GalaxyParameterFactory,
                                                InputFileFactory,
                                                OutputFileFactory,
                                                ParameterFactory,
                                                ToolDefinitionFactory,
                                                ToolFactory)

from file_store.models import FileType
from .models import ToolDefinition

logger = logging.getLogger(__name__)
ANNOTATION_ERROR_MESSAGE = (
    "Tool not properly annotated. Please read: http://bit.ly/2nalk6w for "
    "examples and more information on how to properly annotate your tools."
)


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
            "{}".format(
                filetype,
                [f.name for f in FileType.objects.all()],
                error
            )
        )

        super(FileTypeValidationError, self).__init__(error_message)


@transaction.atomic
def create_tool_definition(annotation_data):
    """
    :param annotation_data: dict of data that represents a ToolDefinition
    :returns: The created ToolDefinition object
    """
    tool_type = annotation_data["tool_type"]
    annotation = annotation_data["annotation"]

    if tool_type == ToolDefinition.WORKFLOW:

        # NOTE: Since we are within a `transaction` we aren't handline the
        # usual `DoesNotExist` & `MultipleObjectsReturned` exceptions because
        # we want them to propagate up the stack
        workflow_engine = WorkflowEngine.objects.get(
            uuid=annotation_data["workflow_engine_uuid"]
        )

        tool_definition = ToolDefinitionFactory(
            name=annotation_data["name"],
            description=annotation["description"],
            tool_type=tool_type,
            file_relationship=create_file_relationship_nesting(annotation),
            galaxy_workflow_id=annotation_data["galaxy_workflow_id"],
            workflow_engine=workflow_engine
        )
    elif tool_type == ToolDefinition.VISUALIZATION:
        tool_definition = ToolDefinitionFactory(
            name=annotation_data["name"],
            description=annotation["description"],
            tool_type=tool_type,
            file_relationship=create_file_relationship_nesting(
                annotation
            ),
            image_name=annotation["image_name"],
            container_input_path=annotation["container_input_path"]
        )

    create_and_associate_output_files(
        tool_definition,
        annotation["output_files"]
    )
    create_and_associate_parameters(
        tool_definition,
        annotation["parameters"]
    )

    return tool_definition


@transaction.atomic
def create_tool(tool_launch_configuration, user_instance):
    """
   :param tool_launch_configuration: dict of data that represents a Tool
   :param user_instance: User object that made the request to create said Tool
   :returns: The created Tool object
   """
    # NOTE: that the usual exceptions for the get() aren't handled because
    # we're in the scope of an atomic transaction
    tool_definition = ToolDefinition.objects.get(
        uuid=tool_launch_configuration["tool_definition_uuid"]
    )
    tool = ToolFactory(
        name="{}-launch".format(tool_definition.name),
        tool_definition=tool_definition,
        file_relationships=tool_launch_configuration["file_relationships"]
    )
    try:
        tool.parameters = tool_launch_configuration["parameters"]
    except KeyError:
        # parameters are not required for Tools to launch properly
        pass

    if tool.get_tool_type() == ToolDefinition.VISUALIZATION:
        try:
            tool.output_files = tool_launch_configuration["output_files"]
        except KeyError:
            # output_files aren't required for Vis Tools
            pass

        # Create a unique container name that adheres to docker's specs
        tool.container_name = "{}-{}".format(
            tool.name.replace(" ", ""),
            tool.uuid
        )

    if tool.get_tool_type() == ToolDefinition.WORKFLOW:
        try:
            tool.output_files = tool_launch_configuration["output_files"]
        except KeyError:
            raise RuntimeError(
                "`output_files` are required for Workflow Tools"
            )

    tool.set_owner(user_instance)
    tool.update_file_relationships_string()

    # Assert that the data structure being sent over is able to be evaluated
    #  as a Pythonic Data structure
    try:
        nesting = ast.literal_eval(tool.file_relationships)
    except (SyntaxError, ValueError):
        raise RuntimeError(
            "ToolLaunchConfiguration's `file_relationships` could not be "
            "evaluated as a Pythonic Data Structure: {}".format(
                tool.file_relationships
            )
        )
    else:
        parse_file_relationship_nesting(nesting)

    tool.save()
    return tool


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

    # If the file_relationship has a populated nested file_relationship,
    # create a FileRelationship object, and recursively call
    # create_file_relationship_nesting() with said nested dict
    if (isinstance(workflow_annotation["file_relationship"], dict) and
            workflow_annotation["file_relationship"]):
        file_relationship = FileRelationshipFactory(
            name=workflow_annotation["file_relationship"]["name"],
            value_type=workflow_annotation["file_relationship"]["value_type"]
        )

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
        # last element from our `file_relationships` due to Python's nature of
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


# `resolver` allows JSON Schema to find the JSON pointers we define in our
# schemas
resolver = RefResolver("{}{}{}".format(
    'file://', os.path.abspath("tool_manager/schemas"), '/'
), None)


def create_and_associate_output_files(tool_definition, output_files):
    for output_file in output_files:
        try:
            filetype = FileType.objects.get(
                name=output_file["filetype"]["name"]
            )
        except (FileType.DoesNotExist,
                FileType.MultipleObjectsReturned) as e:
            raise FileTypeValidationError(
                output_file["filetype"]["name"],
                e
            )
        else:
            tool_definition.output_files.add(
                OutputFileFactory(
                    name=output_file["name"],
                    description=output_file["description"],
                    filetype=filetype
                )
            )


def create_and_associate_parameters(tool_definition, parameters):
    for parameter in parameters:
        if tool_definition.tool_type == ToolDefinition.WORKFLOW:
            tool_definition.parameters.add(
                GalaxyParameterFactory(
                    name=parameter["name"],
                    description=parameter["description"],
                    value_type=parameter["value_type"],
                    default_value=parameter["default_value"],
                    galaxy_workflow_step=parameter["galaxy_workflow_step"]
                )
            )
        if tool_definition.tool_type == ToolDefinition.VISUALIZATION:
            tool_definition.parameters.add(
                ParameterFactory(
                    name=parameter["name"],
                    description=parameter["description"],
                    value_type=parameter["value_type"],
                    default_value=parameter["default_value"],
                )
            )


def validate_tool_annotation(annotation_dictionary):
    """
    Validate incoming annotation data to ensure ToolDefinitions are created
    properly.
    :param annotation_dictionary: dict containing Tool annotation data
    """

    with open("tool_manager/schemas/ToolDefinition.json") as f:
        schema = json.loads(f.read())
    annotation_to_validate = annotation_dictionary["annotation"]
    annotation_to_validate["name"] = annotation_dictionary["name"]
    annotation_to_validate["tool_type"] = annotation_dictionary["tool_type"]
    try:
        validate(annotation_to_validate, schema, resolver=resolver)
    except ValidationError as e:
        raise RuntimeError(
            "{}{}".format(ANNOTATION_ERROR_MESSAGE, e)
        )


def validate_workflow_step_annotation(workflow_step_dictionary):
    """
    Validate incoming annotation data to ensure Workflow's Steps are annotated
    properly.
    :param workflow_step_dictionary: dict containing a Galaxy Workflow step's
    data
    """
    with open("tool_manager/schemas/WorkflowStep.json") as f:
        schema = json.loads(f.read())
    try:
        validate(workflow_step_dictionary, schema, resolver=resolver)
    except ValidationError as e:
        raise RuntimeError(
            "{}{}".format(ANNOTATION_ERROR_MESSAGE, e)
        )


def validate_tool_launch_configuration(tool_launch_config):
    """
    Validate incoming Tool Launch Configurations
    :param tool_launch_config: json data containing a ToolLaunchConfiguration
    """
    with open("tool_manager/schemas/ToolLaunchConfig.json") as f:
        schema = json.loads(f.read())
    try:
        validate(tool_launch_config, schema, resolver=resolver)
    except ValidationError as e:
        raise RuntimeError(
            "Tool launch configuration is not properly configured: {}".format(
                e
            )
        )


def get_workflows():
    """
    Generate a dict mapping available WorkflowEngine UUIDs to a list
    of their available workflows.
    :return: dict with keys == WorkflowEngine.uuid's and values == list of
    workflows available to said engine
    """
    workflow_dict = {}
    workflow_engines = WorkflowEngine.objects.all()

    logger.debug("%s workflow engines found.", workflow_engines.count())

    for workflow_engine in workflow_engines:
        # Set keys of `workflow_data` to WorkflowEngine UUIDs to denote
        # where workflows came from.
        workflow_dict[workflow_engine.uuid] = []

        logger.debug(
            "Fetching workflows from workflow engine %s",
            workflow_engine.name
        )
        galaxy_connection = workflow_engine.instance.galaxy_connection()
        try:
            workflows = galaxy_connection.workflows.get_workflows()
        except ConnectionError as e:
            raise RuntimeError(
                "Unable to retrieve workflows from '{}' {}".format(
                    workflow_engine.instance.base_url, e
                )
            )
        else:
            for workflow in workflows:
                workflow_data = galaxy_connection.workflows.show_workflow(
                    workflow["id"]
                )
                workflow_dict[workflow_engine.uuid].append(workflow_data)

    return workflow_dict


def get_visualization_annotations_list():
    """
    Generate a list of available visualization annotations from all currently
    available JSON representations of Vis Tools underneath the
    Refinery VISUALIZATION_ANNOTATION_BASE_PATH
    :return: list of visualization dicts
    """
    visualization_annotations = []
    for annotation_file in glob.glob(
        "{}/*.json".format(settings.VISUALIZATION_ANNOTATION_BASE_PATH)
    ):
        with open(annotation_file) as f:
            visualization_annotations.append(json.loads(f.read()))

    return visualization_annotations


def parse_file_relationship_nesting(nested_structure, nesting_dict=None,
                                    nesting_level=0):
    """
    Recursive method to ensure that a ToolLaunchConfiguration's
    `file_relationships` string is a proper representation of a LIST/PAIR
    structure
    :raises: RuntimeError if an inappropriately configured `file_relationships`
     string is detected
    """
    nesting_info = {
        "types": set(),
        "contents": []
    }

    if nesting_dict is None:
        nesting_dict = {
            nesting_level: nesting_info
        }
    try:
        nesting_dict[nesting_level]
    except KeyError:
        nesting_dict[nesting_level] = nesting_info

    nesting_types = nesting_dict[nesting_level]["types"]
    nesting_contents = nesting_dict[nesting_level]["contents"]

    for item in nested_structure:
        nesting_types.add(type(item))
        nesting_contents.append(item)

    if len(nesting_types) != 1:
        raise RuntimeError(
            "LIST/PAIR structure is not balanced {}".format(nesting_contents)
        )
    if nesting_types == {str}:
        # If we reach a nesting level with all `str` we can return
        return

    if nesting_types not in [{list}, {tuple}]:
        raise RuntimeError(
            "The `file_relationships` defined didn't yield a valid "
            "LIST/PAIR nesting. {}".format(nesting_contents)
        )

    nesting_level += 1
    for item in nested_structure:
        parse_file_relationship_nesting(
            item, nesting_dict=nesting_dict, nesting_level=nesting_level
        )
