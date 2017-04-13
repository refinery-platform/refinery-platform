import json
from optparse import make_option
import sys

from django.core.management.base import BaseCommand, CommandError

from ...models import ToolDefinition
from ...utils import (
    ANNOTATION_ERROR_MESSAGE,
    create_tool_definition,
    get_visualization_annotations_list,
    get_workflow_list,
    validate_tool_annotation,
    validate_workflow_step_annotation)


class Command(BaseCommand):
    help = "Creates sample Tool Definitions."
    """
    Name: handle
    Description:
    main program; run the command
    """

    option_list = BaseCommand.option_list + (
        make_option(
            '--visualizations',
            action='store_true',
            dest='visualizations',
            help='Generate ToolDefinitions for properly annotated '
                 'Visualization tools'
        ),
        make_option(
            '--workflows',
            action='store_true',
            dest='workflows',
            help='Generate ToolDefinitions for properly annotated '
                 'Galaxy-based Workflows'
        )
    )

    def handle(self, *args, **options):
        """
        Creates ToolDefinitions based off of properly annotated Galaxy
        Workflows and Visualization Tools.
        """

        if options["visualizations"]:
            generate_visualization_tool_definitions()

        if options["workflows"]:
            generate_workflow_tool_definitions()


def generate_visualization_tool_definitions():
    """
    Validate visualization annotation data, and try to create a
    ToolDefinition if our validation rules pass.
    """
    sys.stdout.write("Generating Visualization-based ToolDefinitions")

    visualization_annotations = get_visualization_annotations_list()

    for visualization in visualization_annotations:
        visualization["tool_type"] = ToolDefinition.VISUALIZATION
        try:
            validate_tool_annotation(visualization)
        except RuntimeError as e:
            raise CommandError(e)
        except Exception as e:
            raise CommandError(
                "Something unexpected happened: {}".format(e)
            )
        try:
            create_tool_definition(visualization)
        except Exception as e:
            raise CommandError(
                "Creation of ToolDefinition failed. Database "
                "rolled back to its state before this "
                "ToolDefinition's attempted creation: {}".format(e)
            )

        sys.stdout.write(
            "Generated ToolDefinition for Visualization:{}".format(
                visualization["name"]
            )
        )


def generate_workflow_tool_definitions():
    """
    Fetch all Galaxy-based workflows, Validate workflow annotation data,
    and try to create ToolDefinitions if our validation rules pass.
    """
    sys.stdout.write("Generating Galaxy Workflow-based ToolDefinitions")

    try:
        workflow_list = get_workflow_list()
    except RuntimeError as e:
        raise CommandError(e)

    for workflow in workflow_list:
        workflow["tool_type"] = ToolDefinition.WORKFLOW
        try:
            workflow["annotation"] = json.loads(
                workflow["annotation"]
            )
        except ValueError as e:
            raise CommandError(
                "Workflow: {}'s annotation is not "
                "valid JSON: {}".format(workflow["name"], e)
            )

        # Include `parameters` and `output_files` as keys in our
        # workflow annotation
        workflow["annotation"]["parameters"] = []
        workflow["annotation"]["output_files"] = []

        # Iterate through the workflow's step's annotations and
        # append to the `parameters` and `output_files` lists from
        # above so they are included in the validation of this
        # workflow's annotation data
        for step_index in workflow["steps"]:
            step = workflow["steps"][step_index]

            if step["annotation"]:
                try:
                    step_annotation = json.loads(step["annotation"])
                except ValueError as e:
                    raise CommandError(
                        "Workflow: {}'s Step: {}'s annotation data"
                        " is not valid JSON: {}".format(
                            workflow["name"],
                            step_index,
                            e
                        )
                    )
                try:
                    validate_workflow_step_annotation(
                        step_annotation
                    )
                except RuntimeError as e:
                    raise CommandError(
                        "{} {}".format(ANNOTATION_ERROR_MESSAGE, e)
                    )
                try:
                    parameters = step_annotation["parameters"]
                except KeyError:
                    # `parameters` aren't required for each workflow step
                    pass
                else:
                    for parameter in parameters:
                        # Check User-defined parameters in
                        # annotation data against the available
                        # parameters of the Workflow step's
                        # `tool_inputs`
                        if parameter["name"] not in step["tool_inputs"]:
                            raise CommandError(
                                "{} is not a valid parameter for {}".format(
                                    parameter["name"],
                                    step["tool_id"]
                                )
                            )
                        else:
                            parameter["galaxy_workflow_step"] = int(
                                step_index
                            )
                            workflow["annotation"]["parameters"].append(
                                parameter
                            )
                try:
                    output_files = step_annotation["output_files"]
                except KeyError:
                    # `output_files` aren't required for each workflow step
                    pass
                else:
                    for output_file in output_files:
                        # Check User-defined output_files in
                        # annotation data against the available
                        # output_file  of the Workflow step's
                        # `tool_inputs`
                        valid_output_names = []
                        for key in step["input_steps"].iterkeys():
                            valid_output_names.append(
                                step["input_steps"][key]["step_output"]
                            )
                        if output_file["name"] not in valid_output_names:
                            raise CommandError(
                                "`{}` is not a valid output file for {}. "
                                "Valid ouput_file names are: {}".format(
                                    output_file["name"],
                                    step["tool_id"],
                                    valid_output_names
                                )
                            )
                        else:
                            workflow["annotation"]["output_files"].append(
                                output_file
                            )
        try:
            validate_tool_annotation(workflow)
        except RuntimeError as e:
            raise CommandError(e)
        except Exception as e:
            raise CommandError(
                "Something unexpected happened: {}".format(e)
            )
        try:
            create_tool_definition(workflow)
        except Exception as e:
            raise CommandError(
                "Creation of ToolDefinition failed. Database "
                "rolled back to its state before this "
                "ToolDefinition's attempted creation: {}".format(e)
            )

        sys.stdout.write("Generated ToolDefinition for: {}".format(
            workflow["name"]
        ))
