import json
from optparse import make_option

from django.core.management.base import BaseCommand, CommandError

from ...models import ToolDefinition
from ...utils import (
    ANNOTATION_ERROR_MESSAGE,
    create_tool_definition,
    get_visualization_annotations_list,
    get_workflows,
    validate_tool_annotation,
    validate_workflow_step_annotation
)


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

        if not options["visualizations"] and not options["workflows"]:
            self.generate_visualization_tool_definitions()
            self.generate_workflow_tool_definitions()

        if options["visualizations"]:
            self.generate_visualization_tool_definitions()

        if options["workflows"]:
            self.generate_workflow_tool_definitions()

    def generate_visualization_tool_definitions(self):
        """
        Validate visualization annotation data, and try to create a
        ToolDefinition if our validation rules pass.
        """
        self.stdout.write(
            self.style.NOTICE(
                "Generating Visualization-based ToolDefinitions"
            )
        )

        visualization_annotations = get_visualization_annotations_list()

        for visualization in visualization_annotations:
            if visualization["name"] in [
                t.name for t in ToolDefinition.objects.all()
            ]:
                self.stdout.write(
                    self.style.NOTICE(
                        "Skipping creation of `{0}` since ToolDefinition with "
                        "name: `{0}` already exists.".format(
                            visualization["name"]
                        )
                    )
                )
            else:
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

                self.stdout.write(
                    self.style.NOTICE(
                        "Generated ToolDefinition for: "
                        "Visualization: `{}`".format(
                            visualization["name"]
                        )
                    )
                )

    def generate_workflow_tool_definitions(self):
        """
        Fetch all Galaxy-based workflows, Validate workflow annotation data,
        and try to create ToolDefinitions if our validation rules pass.
        """
        self.stdout.write(
            self.style.NOTICE(
                "Generating Galaxy Workflow-based ToolDefinitions"
            )
        )

        try:
            workflows = get_workflows()
        except RuntimeError as e:
            raise CommandError(e)

        for workflow_engine_uuid in workflows:
            for workflow in workflows[workflow_engine_uuid]:
                if workflow["name"] in [
                    t.name for t in ToolDefinition.objects.all()
                ]:
                    self.stdout.write(
                        self.style.NOTICE(
                            "Skipping creation of `{0}` since "
                            "ToolDefinition with name: `{0}` already exists."
                            .format(workflow["name"])
                        )
                    )
                else:
                    workflow["galaxy_workflow_id"] = workflow["id"]
                    workflow["tool_type"] = ToolDefinition.WORKFLOW
                    try:
                        workflow["annotation"] = json.loads(
                            workflow["annotation"]
                        )
                    except ValueError as e:
                        raise CommandError(
                            "Workflow: `{}`'s annotation is not "
                            "valid JSON: {}".format(workflow["name"], e)
                        )

                    # Include `parameters` and `output_files` as keys in our
                    # workflow annotation
                    workflow["annotation"]["parameters"] = []
                    workflow["annotation"]["output_files"] = []

                    # Workflows need to know about their associated
                    # WorkflowEngines
                    workflow["workflow_engine_uuid"] = workflow_engine_uuid

                    workflow = self.parse_workflow_step_annotations(workflow)
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

                    self.stdout.write(
                        self.style.NOTICE(
                            "Generated ToolDefinition for Workflow: `{}`"
                            .format(
                                workflow["name"]
                            )
                        )
                    )

    def parse_workflow_step_annotations(self, workflow):
        """
        Iterate through the workflow's step's annotations and
        append to the `parameters` and `output_files` fields so they are
        included in the validation of this workflow's annotation data
        :param workflow: dict containing a workflow's information
        :return: `workflow` dict with updated annotation info for `parameters`
        and `output_files`
        """
        for step_index in workflow["steps"]:
            step = workflow["steps"][step_index]

            if step["annotation"]:
                try:
                    step_annotation = json.loads(step["annotation"])
                except ValueError as e:
                    raise CommandError(
                        "Workflow: `{}`'s Step: {}'s annotation data"
                        " is not valid JSON: {}".format(
                            workflow["name"],
                            step_index,
                            e
                        )
                    )
                try:
                    validate_workflow_step_annotation(step_annotation)
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
                        # parameters of the Workflow step's `tool_inputs`
                        if parameter["name"] not in step["tool_inputs"]:
                            raise CommandError(
                                "{} is not a valid parameter for {}".format(
                                    parameter["name"],
                                    step["tool_id"]
                                )
                            )
                        else:
                            parameter["galaxy_workflow_step"] = int(step_index)
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
                        # output_file  of the Workflow step's `tool_inputs`
                        valid_output_names = []
                        for key in step["input_steps"].iterkeys():
                            valid_output_names.append(
                                step["input_steps"][key]["step_output"]
                            )
                        if output_file["name"] not in valid_output_names:
                            raise CommandError(
                                "`{}` is not a valid output "
                                "file for {}. Valid ouput_file "
                                "names are: {}".format(
                                    output_file["name"],
                                    step["tool_id"],
                                    valid_output_names
                                )
                            )
                        else:
                            workflow["annotation"]["output_files"].append(
                                output_file
                            )
        return workflow
