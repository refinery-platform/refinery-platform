import json
import sys

from bioblend.galaxy.client import ConnectionError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError

from core.models import WorkflowEngine
from ...utils import create_tool_definition_from_workflow, \
    validate_workflow_annotation, WorkflowAnnotationValidationError


class Command(BaseCommand):
    help = "Creates sample Tool Definitions."
    """
    Name: handle
    Description:
    main program; run the command
    """

    def handle(self, **options):
        """
        Creates ToolDefinitions based off of properly annotated galaxy
        workflows
        """
        sys.stdout.write("Generating ToolDefinitions...\n")
        workflow_engines = WorkflowEngine.objects.all()
        sys.stdout.write("{} workflow engines found.\n".format(
            workflow_engines.count()))

        for engine in workflow_engines:
            sys.stdout.write(
                "Generating ToolDefinitions from workflow engine {} ...\n"
                .format(engine.name))

            galaxy_connection = engine.instance.galaxy_connection()
            try:
                wf_list = galaxy_connection.workflows.get_workflows()
            except ConnectionError as e:
                raise CommandError(
                    "Unable to retrieve workflows from '{}'. "
                    "Skipping ToolDefinition generation: {}".format(
                        engine.instance.base_url, e)
                )

            # Validate workflow annotation data, and try to create a
            # ToolDefinition if validation passes.
            for workflow in wf_list:
                workflow_data = galaxy_connection.workflows.show_workflow(
                    workflow["id"])
                workflow_data["tool_type"] = "WORKFLOW"

                try:
                    workflow_data["annotation"] = json.loads(
                        workflow_data["annotation"]
                    )
                    validate_workflow_annotation(workflow_data)
                except ValueError as e:
                    raise CommandError(
                        "Workflow annotation is not valid JSON: {}".format(e))
                except WorkflowAnnotationValidationError as e:
                    raise CommandError(e)
                except Exception as e:
                    raise CommandError(
                        "Something unexpected happened: {}".format(e))
                else:
                    try:
                        create_tool_definition_from_workflow(workflow_data)
                    except IntegrityError as e:
                        raise CommandError(
                            "Creation of ToolDefinition failed. Database "
                            "rolled back to its state before this "
                            "ToolDefinition's attempted creation: {}".format(
                                e))
                    except Exception as e:
                        raise CommandError(
                            "Something unexpected happened: {}".format(e))
