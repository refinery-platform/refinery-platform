'''
Created on Oct 3, 2012

@author: nils
'''
from django.core.management.base import BaseCommand
from galaxy_connector.models import Instance
import logging

# get module logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Creates a new Galaxy instance."

    """
    Name: handle
    Description:
        main program; creates a new Galaxy instance. At least a base url and an API key are required.
    """   
    def handle(self, base_url, api_key, description="", api_url="api", data_url="datasets", **options):
        instance_count = Instance.objects.filter(base_url__exact=base_url).count()

        if instance_count > 0:
            print "Instance with URL '" + base_url + "' already exists."
            logger.error("Instance with URL '" + base_url + "' already exists.")
            return

        instance = Instance.objects.create( base_url=base_url, api_key=api_key, data_url=data_url, api_url=api_url, description=description )
        
        if instance is not None:
            print "Instance \"" + base_url + " -- " + api_key + "\" created."
            logger.info( "Instance \"" + base_url + " -- " + api_key + "\" created." )
        else:
            print "Unable to create instance \"" + base_url + " -- " + api_key + "\"."
            logger.error( "Unable to create instance \"" + base_url + " -- " + api_key + "\"." )
            
        
                    
