import sys
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError

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
        sys.stdout.write("Generating sample ToolDefinitions...\n")
        try:
            with transaction.atomic():
                make_tool_definitions()
        except IntegrityError as e:
            raise CommandError(e)
