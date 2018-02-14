from __future__ import absolute_import

import logging

from django.core.management.base import BaseCommand, CommandError

from ...models import Instance

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    args = "<base_url> <api_key>"
    help = "Creates a new Galaxy instance."

    def add_arguments(self, parser):
        parser.add_argument(
            '--file_name',
            action='store'
        )
        parser.add_argument(
            '--description',
            action='store',
            default=""
        )
        parser.add_argument(
            '--api_url',
            action='store',
            default="api"
        )
        parser.add_argument(
            '--data_url',
            action='store',
            default="datasets"
        )

    """
    Name: handle
    Description:
    main program; creates a new Galaxy instance.
    At least a base url and an API key are required.
    """
    def handle(self, *args, **options):
        try:
            base_url = args[0]
        except IndexError:
            raise CommandError("Please provide a base URL for Galaxy instance")
        try:
            api_key = args[1]
        except IndexError:
            raise CommandError("Please provide an API key")
        instance_count = Instance.objects.filter(
            base_url__exact=base_url).count()
        if instance_count > 0:
            self.stdout.write("Instance with URL '%s' already exists" %
                              base_url)
            logger.error("Instance with URL '%s' already exists", base_url)
            return
        instance = Instance.objects.create(base_url=base_url,
                                           api_key=api_key,
                                           data_url=options['data_url'],
                                           api_url=options['api_url'],
                                           description=options['description'])
        if instance is not None:
            self.stdout.write("Instance '%s -- %s' created" %
                              base_url, api_key)
            logger.info("Instance '%s -- %s' created", base_url, api_key)
        else:
            self.stdout.write("Unable to create instance '%s -- %s'" %
                              base_url, api_key)
            logger.error("Unable to create instance '%s -- %s'",
                         base_url, api_key)
