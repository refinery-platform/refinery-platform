'''
Created on Oct 3, 2012

@author: nils
'''
import logging
from optparse import make_option

from django.core.management.base import BaseCommand, CommandError

from galaxy_connector.models import Instance


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    args = "<base_url> <api_key>"
    help = "Creates a new Galaxy instance."

    option_list = BaseCommand.option_list + (
        make_option('--file_name',
                    action='store',
                    type='string'
                    ),
        make_option('--description',
                    action='store',
                    type='string',
                    default=""
                    ),
        make_option('--api_url',
                    action='store',
                    type='string',
                    default="api"
                    ),
        make_option('--data_url',
                    action='store',
                    type='string',
                    default="datasets"
                    ),
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
