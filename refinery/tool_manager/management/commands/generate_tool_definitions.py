import json
import sys

from bioblend.galaxy.client import ConnectionError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError

from core.models import WorkflowEngine
from ...utils import create_tool_definition_from_workflow, \
    validate_workflow_annotation


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

            gc = engine.instance.galaxy_connection()
            try:
                wf_list = gc.workflows.get_workflows()
            except ConnectionError as e:
                raise CommandError(
                    "Unable to retrieve workflows from '{}'. "
                    "Skipping ToolDefinition generation: {}".format(
                        engine.instance.base_url, e)
                )

            for workflow in wf_list:
                wf_dict = gc.workflows.show_workflow(workflow["id"])

                try:
                    wf_dict["annotation"] = json.loads(wf_dict["annotation"])
                except ValueError as e:
                    raise CommandError(
                        "Workflow annotation is not valid JSON: {}".format(e))

                # Validate workflow annotation data, and try to create a
                # ToolDefinition if validation passes.
                try:
                    with transaction.atomic():
                        validate_workflow_annotation(wf_dict)
                        create_tool_definition_from_workflow(wf_dict)
                except IntegrityError as e:
                    raise CommandError(
                        "Creation of ToolDefinition failed: {}".format(e))
                except Exception as e:
                    raise CommandError(
                        "Something unexpected happened: {}".format(e))
