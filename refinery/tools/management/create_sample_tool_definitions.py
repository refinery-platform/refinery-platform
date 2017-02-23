import sys
from django.core.management.base import BaseCommand
from factory_boy.utils import make_tool_definitions


class Command(BaseCommand):
    help = "Creates sample Tool Definitions."
    """
    Name: handle
    Description:
    main program; run the command
    """
    def handle(self, **options):
        """Creates sample Tool Definitions utilizing
        factory_boy.utils.make_tool_definitions()
        """
        sys.stdout.write("Generating sample ToolDefinitions")
        make_tool_definitions()
