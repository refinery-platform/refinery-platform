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
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help


    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, base_url, api_key, description="", api_url="api", data_url="datasets", **options):
        instance = Instance.objects.create( base_url=base_url, api_key=api_key, data_url=data_url, api_url=api_url, description=description )
        
        if instance is not None:
            print "Instance \"" + base_url + " -- " + api_key + "\" created."
            logger.info( "Instance \"" + base_url + " -- " + api_key + "\" created." )
        else:
            print "Unable to create instance \"" + base_url + " -- " + api_key + "\"."
            logger.error( "Unable to create instance \"" + base_url + " -- " + api_key + "\"." )
            
        
                    
