'''
Created on Mar 31, 2012

@author: nils
'''

from celery.task import task
from core.models import Workflow, WorkflowDataInput, WorkflowEngine, \
    WorkflowInputRelationships, TYPE_1_1
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from galaxy_connector.connection import Connection
from galaxy_connector.galaxy_workflow import GalaxyWorkflow, GalaxyWorkflowInput, \
    createBaseWorkflow, createStepsAnnot, createStepsCompact, getStepOptions
from galaxy_connector.models import Instance
import ast
import json
import logging
import pickle

# get module logger
logger = logging.getLogger(__name__)


GALAXY_WORKFLOW_ANNOTATION = 'annotation'
GALAXY_WORKFLOW_TYPE = 'refinery_type'
GALAXY_WORKFLOW_RELATIONSHIPS = 'refinery_relationships'
    
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
    
    # make existing workflows for this workflow engine inactive (deleting the workflows would remove provenance information
    # and also lead to the deletion of the corresponding analyses) 
    Workflow.objects.filter( workflow_engine=workflow_engine ).update( is_active=False ) 
    
    #for each workflow, create a core Workflow object and its associated WorkflowDataInput objects
    for workflow in workflows:
        logger.debug("Checking workflow for import: %s", workflow.name)
        
        workflow_dictionary = get_workflow_dictionary( connection, workflow.identifier )
        workflow_annotation = get_workflow_annotation( workflow_dictionary )
        
        if workflow_annotation is None: 
            continue
        
        workflow_type = get_workflow_type( workflow_annotation )
        workflow_relationships =  get_workflow_relationships( workflow_annotation )
        
        if workflow_type is not None: # if workflow is meant for refinery 
            logger.info( "Importing workflow into %s: %s" % (Site.objects.get_current().name, workflow.name) )
            
            workflow_object = Workflow.objects.create( name=workflow.name, internal_id=workflow.identifier, workflow_engine=workflow_engine, is_active=True, type=workflow_type, graph=json.dumps( workflow_dictionary ) )        
            workflow_object.set_manager_group( workflow_engine.get_manager_group() )
                    
            workflow_object.share( workflow_engine.get_manager_group().get_managed_group() )
    
            inputs = workflow.inputs
            
            # Adding workflowdatainputs i.e. inputs from workflow into database models
            for input in inputs:
                input_dict = {
                              'name': input.name,
                              'internal_id': input.identifier
                              }
                i = WorkflowDataInput(**input_dict)
                i.save()
                workflow_object.data_inputs.add(i)
                
                # if workflow has only 1 input, input a default input relationship type
                if (len(inputs) == 1):
                    opt_single = {
                                  'category':TYPE_1_1,
                                  'set1':input.name
                                  }
                    temp_relationship = WorkflowInputRelationships(**opt_single)
                    temp_relationship.save()
                    workflow_object.input_relationships.add(temp_relationship)
                
            # check to input NodeRelationshipType
            # noderelationship types defined for workflows with greater than 1 input
            # refinery_relationship=[{"category":"N-1", "set1":"input_file"}]
            if workflow_relationships is not None: 
                if (len(inputs) > 1):
                    for opt_r in workflow_relationships:
                        try:
                            temp_relationship = WorkflowInputRelationships(**opt_r)
                            temp_relationship.save()
                            workflow_object.input_relationships.add(temp_relationship)
        
                        except KeyError, e:
                            logger.error("refinery_relationship option error: %s" % e)
                            return
            else:
                # TODO: assign a default relationship if required
                pass
    
            
def configure_workflow( workflow, ret_list, connection_galaxy=None ):
    """
    Takes a workflow_uuid and associated data input map to return an expanded workflow 
    from core.models.workflow and workflow_data_input_map    
    """
    logger.debug("workflow.manager configure_workflow called")
    
    curr_workflow = workflow
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
        new_workflow["steps"], history_download, analysis_node_connections = createStepsCompact(ret_list, workflow_dict)
    else:
        logger.debug("workflow_manager.tasks.configure_workflow workflow processing: EXPANSION")
        # Updating steps in imported workflow X number of times
        new_workflow["steps"], history_download, analysis_node_connections = createStepsAnnot(ret_list, workflow_dict);
          
    return new_workflow, history_download, analysis_node_connections


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


def get_workflow_dictionary(connection, workflow_uuid):
    # gets dictionary version of workflow
    dictionary = connection.get_workflow_dict(workflow_uuid)    
    return dictionary


def get_workflow_annotation( dictionary ):
    if GALAXY_WORKFLOW_ANNOTATION not in dictionary:
        logger.info( 'No annotation ("' + GALAXY_WORKFLOW_ANNOTATION + '") found for workflow. Not a Refinery workflow.' )        
        return None
    
    try:
        annotation = ast.literal_eval( dictionary[GALAXY_WORKFLOW_ANNOTATION] )
    except:
        logger.warning( 'Unable to parse annotation field as Python dictionary. Not a Refinery workflow.' )
        return None
    
    return annotation
    

def get_workflow_type( annotation ):
    """
    Determine the workflow type. If the workflow annotation does not contain the "refinery_type" tag, the workflow will be ignored.
    
    :param annotation: Workflow annotation dictionary.
    :type annotation: A Python dictionary.    
    """        
    
    if GALAXY_WORKFLOW_TYPE not in annotation:
        logger.warning( '"' + GALAXY_WORKFLOW_TYPE + '" not declared in annotation dictionary. Assuming type "analysis".' )        
        return Workflow.ANALYSIS_TYPE
    
    # test if the "type" string in the annotation matches any of the defined types
    for choice in Workflow.TYPE_CHOICES: 
        if choice[0] == annotation[GALAXY_WORKFLOW_TYPE]:
            return choice[0]

    logger.warning( '"' + annotation[GALAXY_WORKFLOW_TYPE] + '" is not a defined workflow type, the workflow will be ignored.' )            
    return None


def get_workflow_relationships( annotation ):
    """
    Get the list of workflow input relationship. If the workflow annotation does not contain the "relationships" tag, None will be returned.
    
    :param annotation: Workflow annotation dictionary.
    :type annotation: A Python dictionary.    
    """        
    
    if 'refinery_relationships' not in annotation:
        logger.warning( '"refinery_relationships" not declared in annotation dictionary.' )        
        return None
        
    return annotation[GALAXY_WORKFLOW_RELATIONSHIPS]

    