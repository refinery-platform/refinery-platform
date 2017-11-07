import json
from optparse import make_option
import sys

from django.core.management.base import BaseCommand, CommandError

from ...models import ToolDefinition, WorkflowTool
from ...utils import (ANNOTATION_ERROR_MESSAGE, create_tool_definition,
                      get_visualization_annotations_list, get_workflows,
                      validate_tool_annotation,
                      validate_workflow_step_annotation)


class Command(BaseCommand):
    help = "Creates Tool Definitions."
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

    def handle(self, *args, **options):
        """
        Creates ToolDefinitions based off of properly annotated Galaxy
        Workflows and Visualization Tools.
        """
        self.force = options["force"]

        if self.force:
            self._confirmation_loop()

        if not options["visualizations"] and not options["workflows"]:
            self.generate_tool_definitions(workflows=True, visualizations=True)

        if options["visualizations"]:
            self.generate_tool_definitions(visualizations=True)

        if options["workflows"]:
            self.generate_tool_definitions(workflows=True)

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
                self.stdout.write(
                    self.style.NOTICE("Forcing deletion of of `{}`".format(
                            tool_annotation["name"]))
                )
                ToolDefinition.objects.get(
                    name=tool_annotation["name"]
                ).delete()
                return False
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        "Skipping creation of `{0}` since "
                        "ToolDefinition with name: `{0}` "
                        "already exists.".format(tool_annotation["name"])
                    )
                )
                return True

    def _confirmation_loop(self):
        result = self._ask_for_confirmation()
        while len(result) < 1 or result[0].lower() not in "yn":
            result = self._ask_for_confirmation()
        if result[0].lower() == "n":
            sys.exit(0)

    def generate_tool_definitions(self, visualizations=False, workflows=False):
        """Generate ToolDefinitions if our validation rules pass.
        :param workflows: <Boolean> Whether to generate Workflow-based
        ToolDefinitions or not
        :param visualizations: <Boolean> Whether to generate
        Visualization-based  ToolDefinitions or not
        """
        self.stdout.write(self.style.WARNING("Generating ToolDefinitions"))

        if visualizations:
            self._generate_visualizations()
        if workflows:
            self._generate_workflows()

    def _generate_visualizations(self):
        visualization_annotations = get_visualization_annotations_list()

        for visualization in visualization_annotations:
            if self._has_duplicates(visualization):
                continue

            visualization["tool_type"] = ToolDefinition.VISUALIZATION
            self._generate_tool_definition(visualization)

            self.stdout.write(
                self.style.WARNING(
                    "Generated ToolDefinition for: Visualization: `{}`".format(
                        visualization["name"]
                    )
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

                # Include `parameters` key in our workflow annotation
                workflow["annotation"][ToolDefinition.PARAMETERS] = []

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

                self.stdout.write(
                    self.style.WARNING(
                        "Generated ToolDefinition for Workflow: `{}`"
                        .format(workflow["name"])
                    )
                )

    @staticmethod
    def _has_workflow_outputs(workflow):
        """
        Assert that the given `workflow` has `workflow_outputs` properly
        defined
        :param workflow: dict containing a Galaxy Workflow's information
        :raises: CommandError
        :returns: Boolean
        """
        # assume that there are no defined `workflow_outputs` until we can
        # assert otherwise
        workflow_outputs = False

        workflow_steps = workflow["graph"]["steps"]
        for step_index in workflow_steps:
            step_has_workflow_outputs = False

            if workflow_steps[step_index].get(WorkflowTool.WORKFLOW_OUTPUTS):
                step_has_workflow_outputs = True

            if step_index == "0":
                if not step_has_workflow_outputs:
                    raise CommandError(
                        "You've encountered a known error when trying to "
                        "import a Galaxy Workflow from a .ga file that "
                        "utilizes asterisked `workflow_outputs`. "
                        "Please follow the instructions here: "
                        "https://github.com/refinery-platform/"
                        "refinery-platform/wiki/"
                        "Troubleshooting#generate-tooldefinitions "
                        "to resolve this error."
                    )
                # The 0th step's workflow_output isn't User-defined and
                # shouldn't be considered  when setting
                # `self.has_workflow_outputs`
                continue
            if step_has_workflow_outputs:
                workflow_outputs = True
        return workflow_outputs

    @staticmethod
    def parse_workflow_step_annotations(workflow):
        """
        Iterate through the workflow's step's annotations and
        append to the `parameters` field so they are
        included in the validation of this workflow's annotation data
        :param workflow: dict containing a workflow's information
        :return: `workflow` dict with updated annotation info for `parameters`
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
                    parameters = step_annotation[ToolDefinition.PARAMETERS]
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
                "ToolDefinition's attempted creation: {}".format(e)
            )
