import json
from optparse import make_option
import os
import sys

from django.core.management.base import BaseCommand, CommandError

import requests

from ...models import ToolDefinition
from ...utils import (ANNOTATION_ERROR_MESSAGE, create_tool_definition,
                      get_workflows, validate_tool_annotation,
                      validate_workflow_step_annotation)


class Command(BaseCommand):
    help = "Loads visualization tool definitions " + \
           "or generates workflow tool definitions"

    option_list = BaseCommand.option_list + (
        make_option(
            '--visualizations',
            # TODO: In Python 3, nargs='+' is supported
            action='append',
            dest='visualizations',
            help='Generate ToolDefinitions for visualizations, '
                 'either by filename, or from the registry'
        ),
        make_option(
            '--workflows',
            action='store_true',
            dest='workflows',
            help='Generate ToolDefinitions for properly annotated '
                 'Galaxy-based Workflows'
        ),
        make_option(
            '--force',
            action='store_true',
            dest='force',
            help='Overwrite ToolDefinitions with the same names instead of '
                 'skipping their creation'
        )
    )

    def __init__(self):
        super(Command, self).__init__()
        self.force = False

    def warn(self, message):
        self.stderr.write(
            self.style.WARNING(message)
        )

    def handle(self, *args, **options):
        """
        Creates ToolDefinitions based off of properly annotated Galaxy
        Workflows and Visualization Tools.
        """
        if args:
            raise CommandError(
                'Unrecognized arguments: ' + ' '.join(args)
            )
        visualizations = options["visualizations"]
        is_workflow_mode = options["workflows"]
        if not (visualizations or is_workflow_mode):
            raise CommandError(
                'Either --workflows or --visualizations is required'
            )

        self.force = options["force"]

        if self.force:
            self._confirmation_loop()
        if is_workflow_mode:
            self._generate_workflows()
        if visualizations:
            self._load_visualization_definitions(visualizations)

    @staticmethod
    def _ask_for_confirmation():
        return raw_input("Are you sure you want to `--force`? This will "
                         "delete any existing ToolDefinitions with the "
                         "same name as any new ones you're trying to "
                         "import: [y/n]: ")

    def _has_duplicates(self, tool_annotation):
        current_tool_definition_names = [
            t.name for t in ToolDefinition.objects.all()
        ]
        if tool_annotation["name"] in current_tool_definition_names:
            if self.force:
                self.warn("Forcing deletion of of `{}`".format(
                    tool_annotation["name"])
                )
                ToolDefinition.objects.get(
                    name=tool_annotation["name"]
                ).delete()
                return False
            else:
                self.warn(
                    "Skipping '{0}': It already exists. "
                    "Add '--force' to override.".format(
                        tool_annotation["name"]
                    )
                )
                return True

    def _confirmation_loop(self):
        result = self._ask_for_confirmation()
        while len(result) < 1 or result[0].lower() not in "yn":
            result = self._ask_for_confirmation()
        if result[0].lower() == "n":
            sys.exit(0)

    def _load_visualization_definitions(self, names, branch='master'):
        visualization_annotations = []
        for name in names:
            if os.path.exists(name):
                with open(name) as f:
                    annotation = json.loads(f.read())
            else:
                url = 'https://raw.githubusercontent.com/' + \
                    'refinery-platform/visualization-tools/' + \
                    branch + '/tool-annotations/' + name + '.json'
                response = requests.get(url)
                if response.status_code != 200:
                    raise CommandError(
                        '"{}" not a file and "{}" not a valid URL'.format(
                            name, url
                        )
                    )
                annotation = response.json()
            visualization_annotations.append(annotation)

        for visualization in visualization_annotations:
            if self._has_duplicates(visualization):
                continue

            visualization["tool_type"] = ToolDefinition.VISUALIZATION
            self._generate_tool_definition(visualization)

            self.warn(
                "Generated ToolDefinition for: Visualization: `{}`".format(
                    visualization["name"]
                )
            )

    def _generate_workflows(self):
        try:
            workflows = get_workflows()
        except RuntimeError as e:
            raise CommandError(e)

        for workflow_engine_uuid in workflows:
            for workflow in workflows[workflow_engine_uuid]:
                if self._has_duplicates(workflow):
                    continue

                workflow["galaxy_workflow_id"] = workflow["id"]
                workflow["tool_type"] = ToolDefinition.WORKFLOW
                if not isinstance(workflow["annotation"], dict):
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
                workflow["annotation"][ToolDefinition.PARAMETERS] = []
                workflow["annotation"][ToolDefinition.OUTPUT_FILES] = []

                # Workflows need to know about their associated
                # WorkflowEngines
                workflow["workflow_engine_uuid"] = workflow_engine_uuid

                workflow = self.parse_workflow_step_annotations(workflow)

                if not self._has_workflow_outputs(workflow):
                    raise CommandError(
                        "Workflow: {} does not have `workflow_outputs` "
                        "defined. Please follow the instructions here: "
                        "https://github.com/refinery-platform/"
                        "refinery-platform/wiki/"
                        "Annotating-&-Importing-Refinery-Tools"
                        "#exposing-galaxy-workflow-outputs-to-refinery "
                        "to expose Workflow outputs to Refinery".format(
                            workflow["name"]
                        )
                    )

                self._generate_tool_definition(workflow)

                self.warn(
                    "Generated ToolDefinition for Workflow: `{}`"
                    .format(workflow["name"])
                )

    @staticmethod
    def _has_workflow_outputs(workflow):
        """
        Assert that the given `workflow` has `workflow_outputs` properly
        defined
        :param workflow: dict containing a Galaxy Workflow's information
        :returns: Boolean
        """
        return bool(workflow["annotation"]["output_files"])

    @staticmethod
    def parse_workflow_step_annotations(workflow):
        """
        Iterate through the workflow's step's annotations and
        append to the `parameters` and `output_files` fields so they are
        included in the validation of this workflow's annotation data
        :param workflow: dict containing a workflow's information
        :return: `workflow` dict with updated annotation info for
        `parameters` and `output_files`
        """
        for step_index in workflow["steps"]:
            step = workflow["steps"][step_index]

            if not step["annotation"]:
                continue

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

            parameters = step_annotation.get(ToolDefinition.PARAMETERS)
            if parameters:
                for parameter in parameters:
                    # Check User-defined parameters in
                    # annotation data against the available
                    # parameters of the Workflow step's `tool_inputs`
                    if parameter["name"] not in step["tool_inputs"]:
                        raise CommandError(
                            "{} is not a valid parameter for {}. \n"
                            "Valid parameters are: {}".format(
                                parameter["name"],
                                step["tool_id"],
                                step["tool_inputs"]
                            )
                        )
                    else:
                        parameter["galaxy_workflow_step"] = int(step_index)
                        workflow["annotation"][
                            ToolDefinition.PARAMETERS
                        ].append(parameter)

            output_files = step_annotation.get(ToolDefinition.OUTPUT_FILES)
            if output_files:
                for output_file in output_files:
                    # Check User-defined output_files in annotation data
                    # against the available output_file  of the Workflow
                    # step's `tool_inputs`
                    valid_output_names = [
                        step["input_steps"][key]["step_output"]
                        for key in step["input_steps"].iterkeys()
                    ]
                    if output_file["name"] not in valid_output_names:
                        raise CommandError(
                            "`{}` is not a valid output file for {}. "
                            "Valid ouput_file  names are: {}".format(
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

    @staticmethod
    def _generate_tool_definition(annotation):
        try:
            validate_tool_annotation(annotation)
        except RuntimeError as e:
            raise CommandError(e)
        except Exception as e:
            raise CommandError(
                "Something unexpected happened: {}".format(e)
            )
        try:
            create_tool_definition(annotation)
        except Exception as e:
            raise CommandError(
                "Creation of ToolDefinition failed. Database "
                "rolled back to its state before this "
                "ToolDefinition's attempted creation: {}".format(e.message)
            )
