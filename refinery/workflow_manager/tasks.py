'''
Created on Mar 31, 2012

@author: nils
'''

from celery.task import task
from galaxy_connector.galaxy_workflow import GalaxyWorkflow, GalaxyWorkflowInput
from galaxy_connector.models import Instance
from galaxy_connector.connection import Connection
from core.models import Workflow, WorkflowDataInput
from guardian.shortcuts import assign
from django.contrib.auth.models import Group 
    
@task()
def get_workflows( workflow_engine ):
    
    workflows = []
    
    # obtain a connection to galaxy using the instance information
    try:
        connection = Connection( workflow_engine.instance.base_url, workflow_engine.instance.data_url, workflow_engine.instance.api_url, workflow_engine.instance.api_key )
        #get all workflows
        workflows = connection.get_complete_workflows()
    except:
        print "Unable to connect to " + workflow_engine.instance.base_url
        return
            
    
    # delete old references to workflows associated with this workflow engine
    Workflow.objects.filter( workflow_engine=workflow_engine ).delete() 
    
    #for each workflow, create a core Workflow object and its associated WorkflowDataInput objects
    for workflow in workflows:
        workflow_object = Workflow.objects.create( name=workflow.name, internal_id=workflow.identifier, workflow_engine=workflow_engine )        
        # TODO: fix these assignments!!!
        group_object = Group.objects.get( name__exact="Public" )
        assign( "read_workflow", group_object, workflow_object )
        assign( "change_workflow", group_object, workflow_object )

        inputs = workflow.inputs
        
        for input in inputs:
            input_dict = {
                          'name': input.name,
                          'internal_id': input.identifier
                          }
            i = WorkflowDataInput(**input_dict)
            i.save()
            workflow_object.data_inputs.add(i)
    
            
def configure_workflow( workflow_uuid, workflow_data_input_map, instance=None, connection_galaxy=None ):
    """
    
    """
    return