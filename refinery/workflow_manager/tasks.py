'''
Created on Mar 31, 2012

@author: nils
'''

from celery.task import task
from galaxy_connector.galaxy_workflow import GalaxyWorkflow, GalaxyWorkflowInput
from galaxy_connector.models import Instance
from galaxy_connector.connection import Connection
from core.models import Workflow, WorkflowDataInput, WorkflowEngine
from django.contrib.auth.models import Group 
from galaxy_connector.galaxy_workflow import createBaseWorkflow, createStepsAnnot, createStepsCompact
    
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
        workflow_object.set_manager_group( workflow_engine.get_manager_group() )
                
        workflow_object.share( workflow_engine.get_manager_group().get_managed_group() )

        inputs = workflow.inputs
        
        for input in inputs:
            input_dict = {
                          'name': input.name,
                          'internal_id': input.identifier
                          }
            i = WorkflowDataInput(**input_dict)
            i.save()
            workflow_object.data_inputs.add(i)
    
@task()                 
def configure_workflow( workflow_uuid, ret_list, connection_galaxy=None ):
    """
    Takes a workflow_uuid and associated data input map to return an expanded workflow 
    from core.models.workflow and workflow_data_input_map    
    """
    #print "workflow.manager configure_workflow called"
    
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    # gets galaxy internal id for specified workflow
    workflow_galaxy_id = curr_workflow.internal_id
    
    # gets dictionary version of workflow
    workflow_dict = connection_galaxy.get_workflow_dict(workflow_galaxy_id)
    
    # number of times to repeat workflow expansion
    repeat_num = len(ret_list)
    
    # creating base workflow to replicate input workflow
    new_workflow = createBaseWorkflow( (workflow_dict["name"]) )
    
    # checking to see what kind of workflow exists: i.e. does it have  "annotation": "type=COMPACT",  in the workflow annotation field
    work_type = ((workflow_dict["annotation"]).split('='))
    if len(work_type) > 1:
        work_type = work_type[1].upper()
    
    # if workflow is tagged w/ type=COMPACT tag, 
    if work_type == 'COMPACT':
        print "workflow processing: COMPACT"
        new_workflow["steps"], history_download = createStepsCompact(ret_list, workflow_dict)
    else:
        print "workflow processing: EXPANSION"
        # Updating steps in imported workflow X number of times
        new_workflow["steps"], history_download = createStepsAnnot(ret_list, workflow_dict);
          
    return new_workflow, history_download

@task()
def get_workflow_inputs(workflow_uuid):
    """
    Returns unique workflow inputs i.e. {u'exp_file': None, u'input_file': None}
    """
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    
    # getting distinct workflow inputs
    workflow_data_inputs = curr_workflow.data_inputs.all()
    annot_inputs = {};
    for data_input in workflow_data_inputs:
        input_type = data_input.name
        annot_inputs[input_type] = None
    
    return annot_inputs
    