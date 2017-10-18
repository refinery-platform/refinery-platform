import json
from optparse import make_option

from django.core.management.base import BaseCommand, CommandError

from ...models import ToolDefinition
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

    def handle(self, *args, **options):
        """
        Creates ToolDefinitions based off of properly annotated Galaxy
        Workflows and Visualization Tools.
        """
        force_delete = options["force"]

        if force_delete:
            result = self._ask_for_confirmation()
            while len(result) < 1 or result[0].lower() not in "yn":
                result = self._ask_for_confirmation()
            if result[0].lower() == "n":
                return

        if not options["visualizations"] and not options["workflows"]:
            self.generate_tool_definitions(force=force_delete)

        if options["visualizations"]:
            self.generate_tool_definitions(workflows=False,
                                           force=force_delete)
        if options["workflows"]:
            self.generate_tool_definitions(visualizations=False,
                                           force=force_delete)

    @staticmethod
    def _ask_for_confirmation():
        return raw_input("Are you sure you want to `--force`? This will "
                         "delete any existing ToolDefinitions with the "
                         "same name as any new ones you you're trying to "
                         "import: [y/n]: ")

    def generate_tool_definitions(self,
                                  visualizations=True,
                                  workflows=True,
                                  force=False):
        """
        Validate visualization annotation data, and try to create a
        ToolDefinition if our validation rules pass.
        """
        if visualizations:
            self.stdout.write(
                self.style.WARNING(
                    "Generating Visualization-based ToolDefinitions"
                )
            )

            visualization_annotations = get_visualization_annotations_list()

            for visualization in visualization_annotations:
                if visualization["name"] in [
                    t.name for t in ToolDefinition.objects.all()
                ]:
                    if force:
                        self.stdout.write(
                            self.style.NOTICE(
                                "Forcing deletion of of `{0}`".format(
                                    visualization["name"]
                                )
                            )
                        )
                        ToolDefinition.objects.get(
                            name=visualization["name"]
                        ).delete()
                    else:
                        self.stdout.write(
                            self.style.NOTICE(
                                "Skipping creation of `{0}` since "
                                "ToolDefinition with name: `{0}` "
                                "already exists.".format(
                                    visualization["name"]
                                )
                            )
                        )
                        continue

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
                    self.style.WARNING(
                        "Generated ToolDefinition for: "
                        "Visualization: `{}`".format(
                            visualization["name"]
                        )
                    )
                )
        if workflows:
            self.stdout.write(
                self.style.WARNING(
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
                        if force:
                            self.stdout.write(
                                self.style.NOTICE(
                                    "Forcing deletion of of `{0}`".format(
                                        workflow["name"]
                                    )
                                )
                            )
                            ToolDefinition.objects.get(
                                name=workflow["name"]
                            ).delete()
                        else:
                            self.stdout.write(
                                self.style.NOTICE(
                                    "Skipping creation of `{0}` since "
                                    "ToolDefinition with name: `{0}` already "
                                    "exists.".format(workflow["name"])
                                )
                            )
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
                        self.style.WARNING(
                            "Generated ToolDefinition for Workflow: `{}`"
                            .format(workflow["name"])
                        )
                    )

    def parse_workflow_step_annotations(self, workflow):
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
