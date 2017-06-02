'''
Created on Mar 31, 2012

@author: nils
'''

import ast
import json
import logging

from bioblend import galaxy
from celery.task import task

from core.models import (Workflow, WorkflowDataInput,
                         WorkflowInputRelationships, TYPE_1_1,
                         TYPE_REPLICATE, NR_TYPES)


logger = logging.getLogger(__name__)

GALAXY_WORKFLOW_ANNOTATION = 'annotation'
GALAXY_WORKFLOW_TYPE = 'refinery_type'
GALAXY_WORKFLOW_RELATIONSHIPS = 'refinery_relationships'
GALAXY_WORKFLOW_STEPS = 'steps'

GALAXY_TOOL_OUTPUTS = 'outputs'
# only set in input nodes (this is different from input_connections, i.e.
# incoming edges)
GALAXY_TOOL_INPUTS = 'inputs'
GALAXY_TOOL_ANNOTATION = 'annotation'
GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS = [
    ('name', str)]  # [(field, type), ...]
GALAXY_TOOL_ANNOTATION_OPTIONAL_FIELDS = [('type', str), ('description', str)]

GALAXY_INPUT_RELATIONSHIP_REQUIRED_FIELDS = [
    ('category', str), ('set1', str), ('set2', str)]  # [(field, type), ...]
GALAXY_INPUT_RELATIONSHIP_OPTIONAL_FIELDS = []  # [(field, type), ...]
GALAXY_INPUT_RELATIONSHIP_CATEGORIES = [category[0] for category in NR_TYPES]


class GalaxyWorkflow(object):
    def __init__(self, name, identifier):
        self.name = name
        self.identifier = identifier
        self.inputs = []

    def __unicode__(self):
        return self.name + " (" + self.identifier + "): " + str(
            len(self.inputs)) + " inputs"

    def add_input(self, workflow_input):
        self.inputs.append(workflow_input)


class GalaxyWorkflowInput(object):
    def __init__(self, name, identifier):
        self.name = name
        self.identifier = identifier

    def __unicode__(self):
        return self.name + " (" + self.identifier + ")"


@task()
def get_workflows(workflow_engine):
    """Retrieve workflows from Galaxy and import into Refinery"""
    workflow_list = []
    issues = []
    connection = workflow_engine.instance.galaxy_connection()

    try:
        workflow_list = connection.workflows.get_workflows()
    except galaxy.client.ConnectionError as exc:
        logger.error("Unable to retrieve workflows from '%s' - skipping - %s",
                     workflow_engine.instance.base_url, exc)
    else:
        # deactivate existing workflows for this workflow engine: deleting
        # workflows would lead to loss of the provenance information
        Workflow.objects.filter(
            workflow_engine=workflow_engine).update(is_active=False)

    for workflow_entry in workflow_list:
        workflow_object = GalaxyWorkflow(workflow_entry['name'],
                                         workflow_entry['id'])
        workflow_inputs = connection.workflows.show_workflow(
            workflow_object.identifier)['inputs']
        for input_identifier, input_description in workflow_inputs.items():
            workflow_input = GalaxyWorkflowInput(input_description['label'],
                                                 input_identifier)
            workflow_object.add_input(workflow_input)
        logger.info("Importing workflow %s ...", workflow_object.name)
        try:
            workflow_dictionary = connection.workflows.export_workflow_json(
                workflow_object.identifier)
        except galaxy.client.ConnectionError as exc:
            logger.error("Unable to retrieve workflow '%s' from '%s'"
                         " - skipping ... (%s)", workflow_object.identifier,
                         workflow_engine.instance.base_url, exc)
        else:
            workflow_issues = import_workflow(
                workflow_object, workflow_engine, workflow_dictionary)
            if workflow_issues:
                issues.append("Unable to import workflow '{}' due to the "
                              "following issues:".format(workflow_object.name))
                issues += workflow_issues

    return issues


def import_workflow(workflow, workflow_engine, workflow_dictionary):
    """Create a Workflow object and its associated WorkflowDataInput objects"""
    issues = []

    workflow_annotation = get_workflow_annotation(workflow_dictionary)
    if not workflow_annotation:
        issues.append("Workflow annotation not found")
        return issues

    workflow_type = get_workflow_type(workflow_annotation)
    if not workflow_type:
        issues.append("Workflow type not found")
        return issues

    if not workflow.inputs:
        issues.append("Workflow does not define inputs")
        return issues

    # single input workflows don't define input relationships
    input_relationships = get_input_relationships(workflow_annotation)

    # extract names of workflow input (if input step defines more than one
    # input only the first one will be used)
    workflow_input_names = []
    for workflow_input in workflow.inputs:
        workflow_input_names.append(workflow_input.name)

    # check workflow inputs for correct annotations
    workflow_input_issues = check_workflow_inputs(workflow_input_names)
    workflow_input_relationship_issues = check_workflow_input_relationships(
        workflow.inputs, input_relationships, workflow_input_names)
    if workflow_input_issues or workflow_input_relationship_issues:
        issues += workflow_input_issues + workflow_input_relationship_issues
        return issues

    # check workflow steps for correct annotations and skip import if problems
    # are detected
    try:
        workflow_step_issues = check_steps(workflow_dictionary)
    except RuntimeError:
        # no error in parsing but no outputs defined
        issues.append("Workflow does not declare outputs")
        return issues
    if workflow_step_issues:
        issues += workflow_step_issues
        return issues

    # import workflow
    workflow_object = Workflow.objects.create(
        name=workflow.name, internal_id=workflow.identifier,
        workflow_engine=workflow_engine, is_active=True,
        type=workflow_type, graph=json.dumps(workflow_dictionary)
    )
    workflow_object.set_manager_group(workflow_engine.get_manager_group())
    workflow_object.share(
        workflow_engine.get_manager_group().get_managed_group())
    # Adding workflowdatainputs i.e. inputs from workflow into database models
    for workflow_input in workflow.inputs:
        workflow_data_input = WorkflowDataInput.objects.create(
            name=workflow_input.name, internal_id=workflow_input.identifier
        )
        workflow_object.data_inputs.add(workflow_data_input)
        # if workflow has only 1 input, input a default input relationship type
        if len(workflow.inputs) == 1:
            workflow_input_relationship = \
                WorkflowInputRelationships.objects.create(
                    category=TYPE_1_1, set1=workflow_input.name
                )
            workflow_object.input_relationships.add(
                workflow_input_relationship
            )
    # check to input NodeRelationshipType
    # noderelationship types defined for workflows with greater than 1 input
    # refinery_relationship=[{"category":"N-1", "set1":"input_file"}]
    if input_relationships and len(workflow.inputs) > 1:
        for relationship in input_relationships:
            try:
                workflow_input_relationship = \
                    WorkflowInputRelationships.objects.create(**relationship)
                workflow_object.input_relationships.add(
                    workflow_input_relationship
                )
            except KeyError as exc:
                logger.error(exc)
                issues.append(
                    "Input relationship option error: {}".format(exc)
                )
    return issues


def get_workflow_annotation(workflow_dictionary):
    if GALAXY_WORKFLOW_ANNOTATION not in workflow_dictionary:
        logger.info("No annotation ('%s') found for workflow. "
                    "Not a Refinery workflow.",
                    GALAXY_WORKFLOW_ANNOTATION)
        return None
    try:
        annotation = ast.literal_eval(
            workflow_dictionary[GALAXY_WORKFLOW_ANNOTATION])
    except:
        logger.warning("Unable to parse annotation field as Python dictionary."
                       " Not a Refinery workflow.")
        return None
    return annotation


def get_workflow_steps(workflow_dictionary):
    steps = []
    if GALAXY_WORKFLOW_STEPS not in workflow_dictionary.keys():
        logger.warning(
            'Workflow does not contain any steps. Not a Refinery workflow.')
        return None

    for index, step_definition in workflow_dictionary[
            GALAXY_WORKFLOW_STEPS].iteritems():
        steps.append(step_definition)

    return steps


def get_step_annotation(step_definition):
    annotation = None
    # no annotation field
    if GALAXY_TOOL_ANNOTATION not in step_definition:
        return None
    # empty annotation field
    if len(step_definition[GALAXY_TOOL_ANNOTATION].strip()) == 0:
        return None

    try:
        annotation = ast.literal_eval(step_definition[GALAXY_TOOL_ANNOTATION])
    except:
        logger.warning("Annotation not empty and unable to parse annotation "
                       "field as Python dictionary in step '%s' (%s). "
                       "Not a Refinery workflow.",
                       step_definition['name'], str(step_definition['id']))
        return None

    return annotation


def get_step_outputs(step_definition):
    # no output field
    if GALAXY_TOOL_OUTPUTS not in step_definition:
        return None
    # empty output field
    if len(step_definition[GALAXY_TOOL_OUTPUTS]) == 0:
        return None
    return step_definition[GALAXY_TOOL_OUTPUTS]


def check_step_annotation_syntax(annotation):
    """Check if step annotation contains all required fields and only required
    or optional fields (syntactic correctness).
    Returns a list of issues or a list of length 0 if the annotation is
    syntactically correct.
    """
    issues = []
    # iterate over output files in annotation dictionary
    for output_file_name, output_file_settings in annotation.iteritems():
        # test if output file name is a string
        if not isinstance(output_file_name, str):
            issues.append('Output file "' + str(output_file_name) +
                          '" is not of expected type "' + str.__name__ + '".')
        # test if all required fields are present and have the correct type
        for field in GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS:
            if field[0] not in output_file_settings.keys():
                issues.append(
                    'In annotation of output file "' + str(output_file_name) +
                    ' required field "' + field[0] + '" is missing.')
        # test if all fields have the correct type
        for field in GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS + \
                GALAXY_TOOL_ANNOTATION_OPTIONAL_FIELDS:
            if field[0] in output_file_settings.keys():
                if not isinstance(output_file_settings[field[0]], field[1]):
                    issues.append(
                        'In annotation of output file "' +
                        str(output_file_name) + '" field "' + field[0] +
                        '" is of type "' + type(
                            output_file_settings[field[0]]).__name__ +
                        '" but type "' + field[1].__name__ + '" is expected.')
        # test if there are undefined fields
        # (i.e. fields that are neither required nor optional)
        for field in output_file_settings.keys():
            if field in GALAXY_TOOL_ANNOTATION_REQUIRED_FIELDS + \
                    GALAXY_TOOL_ANNOTATION_OPTIONAL_FIELDS:
                if not isinstance(output_file_settings[field[0]], field[1]):
                    issues.append(
                        'In annotation of output file "' +
                        str(output_file_name) + ' field "' + field +
                        '" is neither a required nor an optional field.')

    return issues


def check_step_annotation_semantics(annotation, step_outputs):
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
            issues.append(
                'Output file "' + str(output_file_name) +
                '" is defined in the tool annotation but is not a declared '
                'output of the tool.')
    return issues


def check_step(step_definition):
    """Check correctness of this step:
    1. syntactic correctness of annotations, i.e. are all required fields
    included and of the correct type, etc.
    2. semantic correctness of annotations, i.e. do the defined output file
    names in the annotation match actual tool outputs
    Returns a list of issues. a list of length 0 if the step is correctly
    defined or None if there is no annotation or output for the step.
    """
    issues = []
    annotation = get_step_annotation(step_definition)
    if annotation is None:
        return None
    else:
        outputs = get_step_outputs(step_definition)
        if outputs is None:
            return None
        else:
            issues += check_step_annotation_syntax(annotation)
            issues += check_step_annotation_semantics(annotation, outputs)
    return issues


def check_steps(workflow_dictionary):
    steps = get_workflow_steps(workflow_dictionary)
    if steps is None:
        raise RuntimeError
    correct_step_found = False
    incorrect_step_found = False
    issues = []

    for step_definition in steps:
        step_issues = check_step(step_definition)
        if step_issues is not None:
            if len(step_issues) == 0:
                correct_step_found = True
            else:
                incorrect_step_found = True
                issues.append("Workflow step {} contains at least one "
                              "incorrectly declared output"
                              .format(step_definition['name']))
                issues += step_issues

    if incorrect_step_found:
        logger.warning("Workflow %s contains incorrectly declared outputs for "
                       "at least one step and will be ignored: %s",
                       workflow_dictionary['name'], ", ".join(issues))
        return issues
    if not correct_step_found:
        logger.warning("Workflow %s does not declare outputs and will be "
                       "ignored", workflow_dictionary['name'])
        raise RuntimeError

    return issues


def get_workflow_type(workflow_annotation):
    """Determine the workflow type.
    If the workflow annotation does not contain the "refinery_type" tag,
    the workflow will be ignored.
    :param workflow_annotation: Workflow annotation dictionary.
    :type workflow_annotation: A Python dictionary.
    """
    if GALAXY_WORKFLOW_TYPE not in workflow_annotation:
        return None
    # test if the "type" string in the annotation matches any of the defined
    # types
    for choice in Workflow.TYPE_CHOICES:
        if choice[0] == workflow_annotation[GALAXY_WORKFLOW_TYPE]:
            return choice[0]

    logger.warning(
        "'%s' is not a defined workflow type, the workflow will be ignored.",
        workflow_annotation[GALAXY_WORKFLOW_TYPE])
    return None


def get_input_relationships(workflow_annotation):
    """Get the list of workflow input relationship.
    If the workflow annotation does not contain the "relationships" tag,
    None will be returned.
    :param workflow_annotation: Workflow annotation dictionary.
    :type workflow_annotation: A Python dictionary.
    """
    if 'refinery_relationships' not in workflow_annotation:
        return None
    return workflow_annotation[GALAXY_WORKFLOW_RELATIONSHIPS]


def check_workflow_inputs(workflow_input_names):
    """Check if workflow input names are unique"""
    # TODO: check if workflow input names match workflow annotation
    issues = []
    unique_workflow_input_names = {}
    map(unique_workflow_input_names.__setitem__, workflow_input_names, [])
    if len(unique_workflow_input_names.keys()) < len(workflow_input_names):
        issues.append('Workflow input names are not unique: ' +
                      ', '.join(workflow_input_names))
    return issues


def check_workflow_input_relationships(
        input_steps, input_relationships, workflow_input_names):
    issues = []

    # if workflow defines more than one input relationship if there is
    # only one input
    if len(input_steps) == 1:
        if input_relationships is not None and len(input_relationships) > 1:
            issues.append("Workflow has only one input but more than one "
                          "input relationship is defined.")

    # test input relationships
    if input_relationships is not None:
        input_relationship_issues = []
        for input_relationship in input_relationships:
            category = None
            set1 = None
            set2 = None
            # TEST: test if only declared fields are being used as keys
            found_key_set = set(input_relationship.keys())
            allowed_key_set = set(
                [field[0] for field in
                 GALAXY_INPUT_RELATIONSHIP_OPTIONAL_FIELDS] +
                [field[0] for field in
                 GALAXY_INPUT_RELATIONSHIP_REQUIRED_FIELDS])
            undefined_keys = list(
                found_key_set.symmetric_difference(allowed_key_set))

            if len(undefined_keys) > 0:
                input_relationship_issues.append(
                    'Input relationship contains undefined keys: ' +
                    ', '.join(undefined_keys) + '.')

            # TEST: test if category is defined and referring to a declared
            # input relationship category
            if 'category' in input_relationship.keys():
                category = input_relationship['category']
                if category not in GALAXY_INPUT_RELATIONSHIP_CATEGORIES:
                    input_relationship_issues.append(
                        'Undefined category "' + category +
                        '". Allowed categories are ' +
                        ", ".join(GALAXY_INPUT_RELATIONSHIP_CATEGORIES) + ".")
                    category = None
            else:
                input_relationship_issues.append(
                    'Input relationship does not define a category.')

            # TEST: test if input relationship is "replicate" if workflow has
            # only one input
            if len(input_steps) == 1:
                if category is not TYPE_REPLICATE:
                    input_relationship_issues.append(
                        'Workflow has only one input but input relationship '
                        'is not of category "' + TYPE_REPLICATE + '".')
                    # TEST: test if set1 is defined
            if 'set1' in input_relationship.keys():
                set1 = input_relationship['set1']
            else:
                input_relationship_issues.append(
                    'Input relationship does not define required field "set1"')

            # TEST: test if set2 is defined and if defined, test if it is
            # required for the given category
            if 'set2' in input_relationship.keys():
                set2 = input_relationship['set2']
                if category == TYPE_REPLICATE:
                    input_relationship_issues.append(
                        'Input relationship category is "' + TYPE_REPLICATE +
                        '", but relationship does define field "set2".')
            else:
                if category != TYPE_REPLICATE:
                    input_relationship_issues.append(
                        'Input relationship category is not "' +
                        TYPE_REPLICATE +
                        '" and relationship does not define required field '
                        '"set2".')
            # TEST: test if set1 is referring to existing inputs of the
            # workflow
            if set1 is not None and set1 not in workflow_input_names:
                input_relationship_issues.append(
                    '"set1" refers to undefined input "' + set1 +
                    '" but needs to refer to a defined input: ' +
                    ', '.join(workflow_input_names))
            # TEST: test if set2 is referring to existing inputs of the
            # workflow
            if set2 is not None and set2 not in workflow_input_names:
                input_relationship_issues.append(
                    '"set2" refers to undefined input "' + set2 +
                    '" but needs to refer to a defined input: ' +
                    ', '.join(workflow_input_names))
            # TEST: test if set1 and set2 are referring to the same input
            if set1 == set2:
                input_relationship_issues.append(
                    '"set1" and "set2" are both referring to input "' + set1 +
                    '" but need to be referring to different inputs.')
            if len(input_relationship_issues) > 0:
                issues.append(
                    'Input relationship "' + str(input_relationship) +
                    "' is defined incorrectly:")
                issues = issues + input_relationship_issues
    return issues
