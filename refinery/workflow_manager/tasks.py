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
GALAXY_WORKFLOW_STEPS = 'steps'

GALAXY_TOOL_OUTPUTS = 'outputs'
GALAXY_TOOL_ANNOTATION = 'annotation'
GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS = [('name',str)] # [(field, type), ...]
GALAXY_TOOL_ANNOTATION_OPTIONAL_FIELDS = [('type',str), ('description',str)]
    
@task()
def get_workflows( workflow_engine ):
    
    workflows = []
    issues = []
    
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
        logger.info("Importing workflow %s ...", workflow.name)
        workflow_dictionary = get_workflow_dictionary( connection, workflow.identifier )
        workflow_issues = import_workflow( workflow, workflow_engine, workflow_dictionary )
        
        if len( workflow_issues ) > 0:
            issues.append( '\nUnable to import workflow "' + workflow.name + '" due to the following issues:' )
            issues = issues + workflow_issues
            
    return issues
                
        
        
def import_workflow( workflow, workflow_engine, workflow_dictionary ):
    
    issues = []
            
    workflow_annotation = get_workflow_annotation( workflow_dictionary )
    
    if workflow_annotation is None:
        issues.append( "Workflow annotation not found." ) 
        return issues
    
    workflow_type = get_workflow_type( workflow_annotation )
    workflow_relationships =  get_workflow_relationships( workflow_annotation )
    
    if workflow_type is None:
        issues.append( "Workflow type not found." ) 
        return issues
    
    if workflow_type is not None: # if workflow is meant for refinery
        
        #  check workflow steps for correct annotations and skip import if problems are detected
        step_issues = check_steps( workflow_dictionary )
        
        if step_issues is None: # no error in parsing but no outputs defined
            issues.append( "Workflow does not declare outputs." )
            return issues
        
        if len( step_issues ) > 0:
            # store issues to return to calling function?
            issues = issues + step_issues
            return issues
                    
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
    return issues
    
            
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


def get_workflow_annotation( workflow_dictionary ):
    if GALAXY_WORKFLOW_ANNOTATION not in workflow_dictionary:
        logger.info( 'No annotation ("' + GALAXY_WORKFLOW_ANNOTATION + '") found for workflow. Not a Refinery workflow.' )        
        return None
    
    try:
        annotation = ast.literal_eval( workflow_dictionary[GALAXY_WORKFLOW_ANNOTATION] )
    except:
        logger.warning( 'Unable to parse annotation field as Python dictionary. Not a Refinery workflow.' )
        return None
    
    return annotation


def get_workflow_steps( workflow_dictionary ):
    
    steps = [] 
    
    if GALAXY_WORKFLOW_STEPS not in workflow_dictionary.keys():
        logger.warning( 'Workflow does not contain any steps. Not a Refinery workflow.' )
        return None
        
    for index, step_definition in workflow_dictionary[GALAXY_WORKFLOW_STEPS].iteritems():            
        steps.append(step_definition)
        
    return steps


def get_step_annotation( step_definition ):
    
    annotation = None
    
    # no annotation field
    if GALAXY_TOOL_ANNOTATION not in step_definition:
        return None

    # empty annotation field
    if len( step_definition[GALAXY_TOOL_ANNOTATION].strip() ) == 0:
        return None;
            
    try:                                
        annotation = ast.literal_eval( step_definition[GALAXY_TOOL_ANNOTATION] )    
    except:
        logger.warning( 'Annotation not empty and unable to parse annotation field as Python dictionary in step "' + step_definition['name'] + '" (' + str(step_definition['id']) + '). Not a Refinery workflow.' )
        return None
            
    return annotation


def get_step_outputs( step_definition ):
        
    # no output field
    if GALAXY_TOOL_OUTPUTS not in step_definition:
        return None

    # empty output field
    if len( step_definition[GALAXY_TOOL_OUTPUTS] ) == 0:
        return None;
                        
    return step_definition[GALAXY_TOOL_OUTPUTS]


def check_step_annotation_syntax( annotation ):
    """
    Check if step annotation contains all required fields and only required or optional fields (syntactic correctness).
    
    Returns a list of issues or a list of length 0 if the annotation is syntactically correct.     
    """     
    issues = []
    
    # iterate over output files in annotation dictionary    
    for output_file_name, output_file_settings in annotation.iteritems():
        
        # test if output file name is a string
        if not isinstance( output_file_name, str ):
            issues.append( 'Output file "' + str( output_file_name ) + '" is not of expected type "' + str.__name__ + '".' )
        
        # test if all required fields are present and have the correct type 
        for field in GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS:
            if field[0] not in output_file_settings.keys():
                issues.append( 'In annotation of output file "' + str( output_file_name ) + ' required field "' + field[0] + '" is missing.'  )
 
        # test if all fields have the correct type 
        for field in GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS + GALAXY_TOOL_ANNOTATION_OPTIONAL_FIELDS:
            if field[0] in output_file_settings.keys():
                if not isinstance( output_file_settings[field[0]], field[1] ):
                    issues.append( 'In annotation of output file "' + str( output_file_name ) + '" field "' + field[0] + '" is of type "' + type( output_file_settings[field[0]] ).__name__ + '" but type "' + field[1].__name__ + '" is expected.' )

        # test if there are undefined fields (i.e. fields that are neither required nor optional) 
        for field in output_file_settings.keys():
            if field in GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS + GALAXY_TOOL_ANNOTATION_OPTIONAL_FIELDS:
                if not isinstance( output_file_settings[field[0]], field[1] ):
                    issues.append( 'In annotation of output file "' + str( output_file_name ) + ' field "' + field + '" is neither a required nor an optional field.' )
    
    return issues


def check_step_annotation_semantics( annotation, step_outputs ):
        
    issues = []

    # iterate over output files in annotation dictionary    
    for output_file_name, output_file_settings in annotation.iteritems():
        # find output file name in outputs of tool
        output_declared = False
        
        for output in step_outputs:
            if output["name"] == output_file_name:
                output_declared = True
                break
        
        if not output_declared:
            issues.append( 'Output file "' + str( output_file_name ) + '" is defined in the tool annotation but is not a declared output of the tool.' )
    
    return issues 
    
    

def check_step( step_definition ):
    """
    Check correctness of this step:
    1. syntactic correctness of annotations, i.e. are all required fields included and of the correct type, etc.
    2. semantic correctness of annotations, i.e. do the defined output file names in the annotation match actual tool outputs
    
    Returns a list of issues. a list of length 0 if the step is correctly defined or None if there is no annotation or output for the step.     
    """
    issues = []
    
    annotation = get_step_annotation( step_definition )
    
    if annotation is None:
        return None
    else:        
        outputs = get_step_outputs( step_definition )
        if outputs is None:
            return None
        else:
            issues = issues + check_step_annotation_syntax( annotation )
            issues = issues + check_step_annotation_semantics( annotation, outputs )
    
    return issues


def check_steps( workflow_dictionary ):
    steps = get_workflow_steps( workflow_dictionary )
    
    correct_step_found = False
    incorrect_step_found = False
    issues = []
    
    for step_definition in steps:        
        step_issues = check_step( step_definition )    
        if step_issues is not None:
            if len( step_issues ) == 0:
                correct_step_found = True
            else:
                incorrect_step_found = True
                issues.append( 'Workflow step "' + step_definition['name'] + '" contains at least one incorrectly declared output.' )
                issues = issues + step_issues
            
    if incorrect_step_found:
        logger.warning( 'Workflow "' + workflow_dictionary['name'] + '" contains incorrectly declared outputs for at least one step and will be ignored: ' + "\n".join( issues ) )
        return issues        
    if not correct_step_found:
        logger.warning( 'Workflow "' + workflow_dictionary['name'] + '" does not declare outputs and will be ignored.' )
        return None
    
    return issues 
        

def get_workflow_type( annotation ):
    """
    Determine the workflow type. If the workflow annotation does not contain the "refinery_type" tag, the workflow will be ignored.
    
    :param annotation: Workflow annotation dictionary.
    :type annotation: A Python dictionary.    
    """        
    
    if GALAXY_WORKFLOW_TYPE not in annotation:
        return None
    
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
        return None
        
    return annotation[GALAXY_WORKFLOW_RELATIONSHIPS]

    