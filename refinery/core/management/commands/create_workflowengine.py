'''
Created on Aug 20, 2013

@author: nils
'''

import logging

from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand, CommandError

from core.models import ExtendedGroup, WorkflowEngine
from galaxy_connector.models import Instance

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Creates a %s workflow engine with the specified Galaxy instance " \
           "and group." % Site.objects.get_current().name
    """
    Name: handle
    Description:
    main program; run the command
    """
    def add_arguments(self, parser):
        parser.add_argument('galaxy_instance_id', type=int)
        parser.add_argument('group_name')

    def handle(self, *args, **options):
        """This function creates a workflow engine and assigns it to the
        specified group
        """
        try:
            instance = Instance.objects.get(id=options["galaxy_instance_id"])
        except KeyError:
            raise CommandError("Please provide a Galaxy instance ID")
        except Instance.DoesNotExist:
            raise CommandError(
                "Unable to retrieve Galaxy instance with id '%s'" %
                options["galaxy_instance_id"]
            )
        # get *manager* group for indicated group
        try:
            group_name = options["group_name"]
        except KeyError:
            raise CommandError("Please provide a group name")
        try:
            manager_group = ExtendedGroup.objects.get(
                name=group_name).manager_group
        except ExtendedGroup.DoesNotExist:
            raise CommandError(
                "Unable to retrieve manager group for group with name %s." %
                group_name)
        workflow_engine = WorkflowEngine.objects.create(
            instance=instance, name=instance.description,
            summary=instance.base_url + " " + instance.api_key)
        workflow_engine.set_manager_group(manager_group)
        self.stdout.write("Created workflow engine '%s' for group '%s'" %
                          (workflow_engine.name, group_name))
