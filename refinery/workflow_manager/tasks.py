'''
Created on Mar 31, 2012

@author: nils
'''

from celery.task import task
from galaxy_connector.galaxy_workflow import GalaxyWorkflow, GalaxyWorkflowInput
from galaxy_connector.models import Instance
from galaxy_connector.connection import Connection
from core.models import Workflow, WorkflowDataInput, WorkflowEngine, WorkflowInputRelationships
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from galaxy_connector.galaxy_workflow import createBaseWorkflow, createStepsAnnot, createStepsCompact, getStepOptions
import ast
import logging


# get module logger
logger = logging.getLogger(__name__)
    
@task()
def get_workflows( workflow_engine ):
    
    workflows = []
    
    # obtain a connection to galaxy using the instance information
    try:
        connection = Connection( workflow_engine.instance.base_url, workflow_engine.instance.data_url, workflow_engine.instance.api_url, workflow_engine.instance.api_key )
        #get all workflows
        workflows = connection.get_complete_workflows()
    except:
        logger.exception( "Unable to connect to " + workflow_engine.instance.base_url )
        return
            
    
    # delete old references to workflows associated with this workflow engine
    Workflow.objects.filter( workflow_engine=workflow_engine ).delete() 
    
    #for each workflow, create a core Workflow object and its associated WorkflowDataInput objects
    for workflow in workflows:
        #logger.debug("Checking workflow for import: %s", workflow.name)
        is_refinery, opt_refinery = check_workflow(connection, workflow.identifier)
        if is_refinery: # if workflow is meant for refinery 
            logger.debug("Importing workflow into %s: %s" % (Site.objects.get_current().name, workflow.name))
            
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
        
            # check to input NodeRelationshipType
            for opt_r in opt_refinery:
                #logger.debug("opt_r")
                #logger.debug(opt_r)
                try:
                    temp_relationship = WorkflowInputRelationships(**opt_r)
                    temp_relationship.save()
                    workflow_object.input_relationships.add(temp_relationship)

                except KeyError, e:
                    logger.error("refinery_relationship option error: %s" % e)
                    return
            
def configure_workflow( workflow_uuid, ret_list, connection_galaxy=None ):
    """
    Takes a workflow_uuid and associated data input map to return an expanded workflow 
    from core.models.workflow and workflow_data_input_map    
    """
    logger.debug("workflow.manager configure_workflow called")
    
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
    work_type = getStepOptions(workflow_dict["annotation"])
    COMPACT_WORKFLOW = False
    
    for k,v in work_type.iteritems():
        if k.upper() == 'TYPE':
            try:
                if v[0].upper() == 'COMPACT':
                    COMPACT_WORKFLOW = True
            except:
                logger.exception( "Malformed Workflow tag, cannot parse: %s" % (work_type) )
                return
        
    # if workflow is tagged w/ type=COMPACT tag, 
    if COMPACT_WORKFLOW:
        logger.debug("workflow_manager.tasks.configure_workflow workflow processing: COMPACT")
        new_workflow["steps"], history_download = createStepsCompact(ret_list, workflow_dict)
    else:
        logger.debug("workflow_manager.tasks.configure_workflow workflow processing: EXPANSION")
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

def check_workflow(connection, workflow_uuid):
    """
    Checks to see if a galaxy workflow is meant for input into refinery. Assumes annotation tag in workflow 
    specifically checking for "refinery_workflow=True"  
    Returns True of false depending on the workflow tag
    
    :param connection: connection to active galaxy instance
    :type connection: galaxy_connector.Connection Model object 
    :param workflow_uuid: uuid for a specific workflow in galaxy
    :type workflow_uuid: string 
    """
    
    # gets dictionary version of workflow
    workflow_dict = connection.get_workflow_dict(workflow_uuid)
    
    # converting annotation tags to dictionary 
    annotation_tag = getStepOptions(workflow_dict["annotation"])
    
    keep_workflow = False
    opt_workflow = None
    
    for k,v in annotation_tag.iteritems(): 
        if k.lower() == str('refinery_workflow').lower():
            try:
                if len(v) > 0:
                    tag_value = v[0]
                    if tag_value == True:
                        keep_workflow = True
                    elif tag_value.lower() == 'true':
                        keep_workflow = True      
            except:
                logger.exception( "Galaxy workflow: Base tag for determining to keep a workflow is malformed: " +  annotation_tag)
                return
        
        # reading in refinery_relationships options from workflow annotation
        elif k.lower() == str('refinery_relationship').lower():
            try:
                opt_workflow = ast.literal_eval(v[0])
            except:
                logger.exception("Galaxy workflow: refinery_relationship option string is malformed")
                return
                        
    #logger.debug("check_workflow")
    #logger.debug(keep_workflow)
    return keep_workflow, opt_workflow
    