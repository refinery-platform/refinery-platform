from __future__ import absolute_import

import logging

from django.core.management.base import BaseCommand, CommandError

from ...models import Instance

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Creates a new Galaxy instance."

    def add_arguments(self, parser):
        parser.add_argument('base_url')
        parser.add_argument('api_key')
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
            base_url = options['base_url']
        except IndexError:
            raise CommandError("Please provide a base URL for Galaxy instance")
        try:
            api_key = options['api_key']
        except IndexError:
            raise CommandError("Please provide an API key")
        instance_count = Instance.objects.filter(
            base_url__exact=base_url
        ).count()

        if instance_count > 0:
            aready_exists_message = "Instance with URL '{}' already " \
                                 "exists".format(base_url)
            self.stdout.write(aready_exists_message)
            logger.info(aready_exists_message)
            return

        instance = Instance.objects.create(base_url=base_url,
                                           api_key=api_key,
                                           data_url=options['data_url'],
                                           api_url=options['api_url'],
                                           description=options['description'])
        if instance is not None:
            creation_message = "Instance '{} -- {}' created".format(
                base_url,
                api_key
            )
            self.stdout.write(creation_message)
            logger.info(creation_message)
        else:
            error_message = "Unable to create instance '{} -- {}'".format(
                base_url,
                api_key
            )
            self.stdout.write(error_message)
            logger.error(error_message)
