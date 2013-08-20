'''
Created on Aug 20, 2013

@author: nils
'''

from core.models import ExtendedGroup, WorkflowEngine
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand
from galaxy_connector.models import Instance
import logging


# get module logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Creates a %s workflow engine with the specified Galaxy instance and group." % (Site.objects.get_current().name)

    """
    Name: handle
    Description:
    main program; run the command
    """   
    def handle(self, galaxy_instance_id, group_name, **options):
        '''This function creates a workflow engine and assigns it to the specified group.

        '''
        
        # get instance based on galaxy id
        try:
            instance = Instance.objects.get( id=galaxy_instance_id )
        except:
            print "Unable to retrieve Galaxy instance with id %d." % (galaxy_instance_id)
            return             
        
        # get *manager* group for indicated group
        try:
            manager_group = ExtendedGroup.objects.get( name=group_name ).manager_group
        except:
            print "Unable to retrieve manager group for group with name %s." % (group_name)
            return 

        workflow_engine = WorkflowEngine.objects.create( instance=instance, name=instance.description, summary=instance.base_url + " " + instance.api_key )        
        workflow_engine.set_manager_group( manager_group )        
        
        print "Created workflow engine %s for group %s." % (workflow_engine.name, group_name)         
