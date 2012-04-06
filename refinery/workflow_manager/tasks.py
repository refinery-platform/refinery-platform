'''
Created on Mar 31, 2012

@author: nils
'''

from celery.task import task
from galaxy_connector.galaxy_workflow import GalaxyWorkflow, GalaxyWorkflowInput
from galaxy_connector.models import Instance
from galaxy_connector.connection import Connection
from core.models import Workflow, WorkflowDataInput
    
@task()
def get_workflows( workflow_engine ):
    
    # Delete old references to workflows associated with this workflow engine
    Workflow.objects.filter( workflow_engine=workflow_engine ).delete() 
    
    # obtain a connection to galaxy using the instance information
    connection = Connection( workflow_engine.instance.base_url, workflow_engine.instance.data_url, workflow_engine.instance.api_url, workflow_engine.instance.api_key )

    #get all workflows
    workflows = connection.get_complete_workflows()

    #for each workflow, create a core Workflow object and its associated WorkflowDataInput objects
    for workflow in workflows:
        workflow_dict = {
                         'name': workflow.name,
                         'internal_id': workflow.identifier,
                         'workflow_engine': workflow_engine,
                         }
        w = Workflow(**workflow_dict)
        try:
            w.save()
            inputs = workflow.inputs
            for input in inputs:
                input_dict = {
                              'name': input.name,
                              'internal_id': input.identifier
                              }
                i = WorkflowDataInput(**input_dict)
                i.save()
                w.data_inputs.add(i)
        except:
            pass
            #connection.rollback()
    
            
def configure_workflow( workflow_uuid, workflow_data_input_map, instance=None, connection_galaxy=None ):
    """
    
    """
    return