import ast
import json
import logging
import re
import uuid

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver
from django.http import JsonResponse

import bioblend
from bioblend.galaxy.dataset_collections import (CollectionDescription,
                                                 CollectionElement,
                                                 HistoryDatasetElement)
from constants import UUID_RE
from django_docker_engine.docker_utils import (DockerClientWrapper,
                                               DockerContainerSpec)
from django_extensions.db.fields import UUIDField
from docker.errors import APIError

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import (_tool_based_galaxy_file_import,
                                    get_taskset_result, run_analysis)
from analysis_manager.utils import create_analysis, validate_analysis_config
from core.models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                         AnalysisNodeConnection, DataSet, OwnableResource,
                         Workflow, WorkflowFilesDL)
from data_set_manager.models import Node
from data_set_manager.utils import get_file_url_from_node_uuid
from file_store.models import FileType

logger = logging.getLogger(__name__)


class Parameter(models.Model):
    """
    A Parameter is a representation of a tool parameter that will
    potentially be exposed and configurable upon a tool's
    configuration/launching step.
    """

    INTEGER = "INTEGER"
    STRING = "STRING"
    BOOLEAN = "BOOLEAN"
    FLOAT = "FLOAT"
    GENOME_BUILD = "GENOME_BUILD"
    ATTRIBUTE = "ATTRIBUTE"
    FILE = "FILE"

    STRING_TYPES = [FILE, ATTRIBUTE, GENOME_BUILD, STRING]

    VALUE_TYPES = (
        (INTEGER, "int"),
        (STRING, "str"),
        (BOOLEAN, "bool"),
        (FLOAT, "float"),
        (GENOME_BUILD, "genome build"),
        (ATTRIBUTE, "attribute"),
        (FILE, "file")
    )
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=500)
    is_user_adjustable = models.BooleanField(default=True)
    value_type = models.CharField(choices=VALUE_TYPES, max_length=25)
    default_value = models.TextField(max_length=100)

    def __str__(self):
        return "{}: {} - {}".format(self.value_type, self.name, self.uuid)

    def get_galaxy_workflow_step(self):
        try:
            return GalaxyParameter.objects.get(
                uuid=self.uuid
            ).galaxy_workflow_step
        except (GalaxyParameter.DoesNotExist,
                GalaxyParameter.MultipleObjectsReturned):
            return None

    def cast_param_value_to_proper_type(self, parameter_value):
        """Parameter values from the Tool Launch Configuration are all
        strings, but the invocation of Galaxy workflows expects these values
        to be of a certain type."""
        if self.value_type in self.STRING_TYPES:
            return str(parameter_value)
        elif self.value_type == self.BOOLEAN:
            return bool(parameter_value)
        elif self.value_type == self.INTEGER:
            return int(parameter_value)
        elif self.value_type == self.FLOAT:
            return float(parameter_value)
        else:
            return parameter_value


class GalaxyParameter(Parameter):
    """
    Extension of Parameter model with fields specific to Galaxy tool parameters
    """
    galaxy_workflow_step = models.IntegerField()


class FileRelationship(models.Model):
    """
    A File Relationship describes the structuring of files that is expected
    from a given tool.

    Note that a FileRelationship has a self-referential M2M which
    allows us to construct complex nestings. (useful for Galaxy WFs)
    """
    PAIR = "PAIR"
    LIST = "LIST"
    RELATIONSHIP_TYPES = (
        (PAIR, "pair"),
        (LIST, "list")
    )
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100)
    value_type = models.CharField(max_length=100, choices=RELATIONSHIP_TYPES)

    # NOTE: `symmetrical=False` is not very common. It's necessary for the
    # self-referential M2M below.
    # See: https://docs.djangoproject.com/en/1.7/ref/models/fields/#django
    # .db.models.ManyToManyField.symmetrical
    file_relationship = models.ManyToManyField(
        "self", symmetrical=False, null=True, blank=True)

    input_files = models.ManyToManyField("InputFile")

    def __str__(self):
        return "{}: {} - {}".format(self.value_type, self.name, self.uuid)


class InputFile(models.Model):
    """
    An Input file describes a file and allowed Refinery FileType(s) that we
    will associate with a tool as its expected input(s)
    """
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=500)
    allowed_filetypes = models.ManyToManyField(FileType)

    def __str__(self):
        return "{}: {} {}".format(
            self.name, [f.name for f in self.allowed_filetypes.all()],
            self.uuid)


class ToolDefinition(models.Model):
    """
    A ToolDefinition is a generic representation of a tool that the
    RefineryPlatform can handle.

    More generally, any tools that we introduce to Refinery (Workflows,
    Visualizations, Other) will need to know about their expected inputs,
    outputs, and input file structuring.
    """

    PARAMETERS = "parameters"
    WORKFLOW = 'WORKFLOW'
    VISUALIZATION = 'VISUALIZATION'
    TOOL_TYPES = (
        (WORKFLOW, 'Workflow'),
        (VISUALIZATION, 'Visualization')
    )

    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(unique=True, max_length=100)
    description = models.TextField(max_length=500)
    tool_type = models.CharField(max_length=100, choices=TOOL_TYPES)
    file_relationship = models.ForeignKey(FileRelationship)
    parameters = models.ManyToManyField(Parameter)
    image_name = models.CharField(max_length=255, blank=True)
    container_input_path = models.CharField(
        max_length=500,
        blank=True
    )
    annotation = models.TextField()
    workflow = models.ForeignKey(Workflow, null=True)

    def __str__(self):
        return "{}: {} {}".format(self.tool_type, self.name, self.uuid)

    def get_annotation(self):
        """
        Deserialize and fetch a ToolDefinition's annotation data that was
        used to create it.
        :return: a dict containing ToolDefinition annotation data
        """
        return json.loads(self.annotation)

    def get_extra_directories(self):
        """
        Fetch `extra_directories` from Visualization-based ToolDefinitions's
        annotation data.

        :return: a Visualization-based ToolDefinitions's `extra_directories`
        information
        :raises: KeyError, NotImplementedError
        """
        if self.tool_type == ToolDefinition.VISUALIZATION:
            try:
                return self.get_annotation()["extra_directories"]
            except KeyError:
                logger.error("ToolDefinition: %s's annotation is missing its "
                             "`extra_directories` key.", self.name)
                raise
        else:
            raise NotImplementedError(
                "Workflow-based tools don't utilize `extra_directories`"
            )


@receiver(pre_delete, sender=ToolDefinition)
def delete_associated_objects(sender, instance, *args, **kwargs):
    """
    Delete related parameter and output_file objects upon ToolDefinition
    deletion.

    Set any associated Workflows to an inactive state
    """
    parameters = instance.parameters.all()
    for parameter in parameters:
        parameter.delete()

    # Set any associated Workflows to be inactive
    # this will remove the Workflow entries from the UI, but won't delete
    # any Analyses that were run from said Workflows
    workflow = instance.workflow
    if workflow:
        workflow.is_active = False
        workflow.save()


@receiver(post_delete, sender=ToolDefinition)
def delete_file_relationship(sender, instance, *args, **kwargs):
    """
    Delete related (topmost) FileRelationship object after ToolDefinition
    deletion.
    """
    instance.file_relationship.delete()


@receiver(pre_delete, sender=FileRelationship)
def delete_input_files_and_file_relationships(sender, instance, *args,
                                              **kwargs):
    """
    Delete all related nested file_relationships in a recursive manner.

    Due to the nature of the `pre_delete` signal, this approach will delete
    the bottom-most FileRelationship object first which is desired.
    """
    input_files = instance.input_files.all()
    for input_file in input_files:
        input_file.delete()

    file_relationships = instance.file_relationship.all()
    for file_relationship in file_relationships:
        file_relationship.delete()


class ToolManager(models.Manager):
    def get_query_set(self):
        return VisualizationTool.objects.all() | WorkflowTool.objects.all()


class Tool(OwnableResource):
    """
    A Tool is a representation of the information it will take to launch
    and monitor a ToolDefinition
    """
    FILE_UUID_LIST = "file_uuid_list"
    FILE_RELATIONSHIPS = "file_relationships"
    FILE_RELATIONSHIPS_URLS = "{}_urls".format(FILE_RELATIONSHIPS)
    LAUNCH_WARNING = "Subclasses must implement `launch` method"
    REFINERY_FILE_UUID = "refinery_file_uuid"
    TOOL_LAUNCH_CONFIGURATION = "tool_launch_configuration"
    TOOL_URL = "tool_url"

    dataset = models.ForeignKey(DataSet)
    analysis = models.OneToOneField(Analysis, blank=True, null=True)
    container_name = models.CharField(
        max_length=250,
        unique=True,
        null=True
    )
    tool_launch_configuration = models.TextField()
    tool_definition = models.ForeignKey(ToolDefinition)

    class Meta:
        verbose_name = "tool"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )

    def __str__(self):
        return "Tool: {}".format(self.get_tool_name())

    def get_input_file_uuid_list(self):
        # Tools can't be created without the `file_uuid_list` existing so no
        # KeyError is being caught
        return self.get_tool_launch_config()[self.FILE_UUID_LIST]

    def get_file_relationships(self):
        return self.get_tool_launch_config()[self.FILE_RELATIONSHIPS]

    def get_file_relationships_urls(self):
        return ast.literal_eval(
            self.get_tool_launch_config()[self.FILE_RELATIONSHIPS_URLS]
        )

    def get_input_node_uuids(self):
        node_uuids = re.findall(UUID_RE, self.get_file_relationships())
        return node_uuids

    def get_relative_container_url(self):
        """
        Construct & return the relative url of our Tool's container
        """
        return "/{}/{}".format(
            settings.DJANGO_DOCKER_ENGINE_BASE_URL,
            self.container_name
        )

    def get_tool_launch_config(self):
        return json.loads(self.tool_launch_configuration)

    def get_tool_name(self):
        return self.tool_definition.name

    def get_tool_type(self):
        return self.tool_definition.tool_type

    def _get_analysis_config(self):
        """
        Construct  and return an Analysis Configuration dict to be validated.

        NOTE: there is no exception handling here since everything
        underneath Tool.launch() is inside of an atomic transaction.
        :return: analysis_config dict
        """
        return {
            "name": "{}".format(self),
            "studyUuid": self.dataset.get_latest_study().uuid,
            "toolUuid": self.uuid,
            "user_id": self.get_owner().id,
            "workflowUuid": self.tool_definition.workflow.uuid
        }

    def launch(self):
        raise NotImplementedError(Tool.LAUNCH_WARNING)

    def set_tool_launch_config(self, tool_launch_config):
        self.tool_launch_configuration = json.dumps(tool_launch_config)
        self.save()

    def update_file_relationships_with_urls(self):
        """
        Replace a Tool's Node uuids in its `file_relationships` string with
        their respective FileStoreItem's urls and assign this data to a new
        key in the tool launch config: `file_relationships_urls`.
        No error handling here since this method is only called in an atomic
        transaction.
        """

        tool_launch_config = self.get_tool_launch_config()
        node_uuids = self.get_input_node_uuids()

        # Add list of FileStoreItem UUIDs to our ToolLaunchConfig for later use
        tool_launch_config[self.FILE_UUID_LIST] = []

        # Copy `file_relationships` contents into `file_relationships_urls`
        tool_launch_config[self.FILE_RELATIONSHIPS_URLS] = (
            self.get_file_relationships()
        )
        for node_uuid in node_uuids:
            node = Node.objects.get(uuid=node_uuid)

            # Append file_uuid to list of FileStoreItem UUIDs
            tool_launch_config[self.FILE_UUID_LIST].append(node.file_uuid)

            file_url = get_file_url_from_node_uuid(node_uuid)
            tool_launch_config[self.FILE_RELATIONSHIPS_URLS] = (
                tool_launch_config[self.FILE_RELATIONSHIPS_URLS].replace(
                    node_uuid, "'{}'".format(file_url)
                )
            )
        self.set_tool_launch_config(tool_launch_config)


class VisualizationTool(Tool):
    """
    VisualizationTools are Tools that are specific to
    launching and monitoring Dockerized visualizations
    """

    class Meta:
        verbose_name = "visualizationtool"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )

    def launch(self):
        """
        Launch a visualization-based Tool
        :returns:
            - <JsonResponse> w/ `tool_url` key corresponding to the
        launched container's url
            - <HttpResponseBadRequest>, <HttpServerError>
        """
        container = DockerContainerSpec(
            image_name=self.tool_definition.image_name,
            container_name=self.container_name,
            labels={self.uuid: ToolDefinition.VISUALIZATION},
            container_input_path=(
                self.tool_definition.container_input_path
            ),
            input={
                self.FILE_RELATIONSHIPS: self.get_file_relationships_urls()
            },
            extra_directories=self.tool_definition.get_extra_directories()
        )

        DockerClientWrapper().run(container)

        return JsonResponse({Tool.TOOL_URL: self.get_relative_container_url()})


def handle_bioblend_exceptions(func):
    """Decorator to be used on functions that make calls using bioblend
       Set our Analysis to a FAILURE_STATE if we hit a bioblend ConnectionError
    """
    def func_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except bioblend.ConnectionError as e:
            error_message = (
                "Error while interacting with bioblend: {}".format(e)
            )
            logger.error(error_message)
            args[0].analysis.cancel()
            return
    return func_wrapper


class WorkflowTool(Tool):
    """
    WorkflowTools are Tools that are specific to
    launching and monitoring Galaxy Workflows
    """
    ANALYSIS_GROUP = "analysis_group"
    COLLECTION_INFO = "collection_info"
    DATA_INPUT = "data_input"
    DATA_COLLECTION_INPUT = "data_collection_input"
    FILE_RELATIONSHIPS_GALAXY = "{}_galaxy".format(Tool.FILE_RELATIONSHIPS)
    FILE_RELATIONSHIPS_NESTING = "file_relationships_nesting"
    FORWARD = "forward"
    GALAXY_DATA = "galaxy_data"
    GALAXY_DATASET_HISTORY_ID = "galaxy_dataset_history_id"
    GALAXY_IMPORT_HISTORY_DICT = "import_history_dict"
    GALAXY_INPUT_TYPES = [DATA_INPUT, DATA_COLLECTION_INPUT]
    GALAXY_LIBRARY_DICT = "library_dict"
    GALAXY_WORKFLOW_INVOCATION_DATA = "galaxy_workflow_invocation_data"
    GALAXY_TO_REFINERY_MAPPING_LIST = "galaxy_to_refinery_mapping_list"
    HISTORY_DATASET_COLLECTION_ASSOCIATION = "hdca"
    INPUT_DATASET = "Input Dataset"
    INPUT_DATASET_COLLECTION = "{} Collection".format(INPUT_DATASET)
    LIST = "list"
    PAIRED = "paired"
    REVERSE = "reverse"
    TOOL_ID = "tool_id"

    class Meta:
        verbose_name = "workflowtool"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )

    @property
    def galaxy_connection(self):
        return self.analysis.galaxy_connection()

    @property
    def galaxy_collection_type(self, nesting_string=""):
        """
        Get the string representation of the Galaxy Dataset Collection type
        from a WorkflowTool's nested file_relationships.
        :param nesting_string: Placeholder string for recursive iterations to
        append to.
        :return: <String> in the following form: ^((list|paired):*)+[^:]+$
        """
        flattened_nesting = self._flatten_file_relationships_nesting()
        for index, file_relationship in enumerate(flattened_nesting):
            if isinstance(file_relationship, list):
                nesting_string += "{}:".format(WorkflowTool.LIST)
            if isinstance(file_relationship, tuple):
                nesting_string += "{}:".format(WorkflowTool.PAIRED)
        return nesting_string[:-1]

    @property
    def galaxy_import_history_id(self):
        return self.get_galaxy_dict()[self.GALAXY_IMPORT_HISTORY_DICT]["id"]

    @property
    def galaxy_workflow_history_id(self):
        return self.analysis.history_id

    def _associate_collection_elements(self, galaxy_element_data):
        """
        Handles the association of Galaxy objects with their parent elements
        :param galaxy_element_data: list of bioblend objects to associate
        with each other
        :return: <CollectionDescription>
        """
        if not len(galaxy_element_data) == 1:
            for index, galaxy_element in enumerate(galaxy_element_data):
                if type(galaxy_element) == CollectionDescription:
                    for prev_galaxy_element in galaxy_element_data[:index]:
                        if (type(prev_galaxy_element) ==
                                HistoryDatasetElement or
                                type(prev_galaxy_element) ==
                                CollectionElement):
                            galaxy_element.add(prev_galaxy_element)
                            galaxy_element_data.remove(prev_galaxy_element)
                            return self._associate_collection_elements(
                                galaxy_element_data
                            )
                if type(galaxy_element) == CollectionElement:
                    for prev_galaxy_element in galaxy_element_data[:index]:
                        if type(prev_galaxy_element) == HistoryDatasetElement:
                            galaxy_element.add(prev_galaxy_element)
                            galaxy_element_data.remove(prev_galaxy_element)
                            return self._associate_collection_elements(
                                galaxy_element_data
                            )
                        if (type(prev_galaxy_element) == CollectionElement and
                                prev_galaxy_element.type !=
                                galaxy_element.type):
                            galaxy_element.add(prev_galaxy_element)
                            galaxy_element_data.remove(prev_galaxy_element)
                            return self._associate_collection_elements(
                                galaxy_element_data
                            )
        else:
            assert len(galaxy_element_data) == 1, \
                "Only one element should be present in: {}".format(
                    galaxy_element_data
                )
            assert type(galaxy_element_data[0]) == CollectionDescription, \
                "Element: {} should be of type: CollectionDescription".format(
                    galaxy_element_data[0]
                )
            return galaxy_element_data[0]

    def _create_analysis(self):
        """Create the Analysis instance for our WorkflowTool's launch()"""
        analysis_config = self._get_analysis_config()
        validate_analysis_config(analysis_config)

        analysis = create_analysis(analysis_config)
        self.set_analysis(analysis.uuid)

        workflow_dict = self._get_workflow_dict()
        self.analysis.workflow_copy = workflow_dict
        self.analysis.workflow_steps_num = len(workflow_dict["steps"].keys())
        self.analysis.save()

        AnalysisStatus.objects.create(analysis=analysis)
        return analysis

    def create_analysis_input_node_connections(self):
        """
        Create the AnalysisNodeConnection objects corresponding to the input
        Nodes of a WorkflowTool launch.
        """
        for node in self._get_input_nodes():
            file_store_item = node.get_file_store_item()

            AnalysisNodeConnection.objects.create(
                analysis=self.analysis,
                node=node,
                direction=INPUT_CONNECTION,
                name=file_store_item.datafile.name,
                step=0,
                filename=self._get_analysis_node_connection_input_filename(),
                is_refinery_file=file_store_item.is_local()
            )

    def create_analysis_output_node_connections(self):
        """
        Create the AnalysisNodeConnection objects corresponding to the output
        Nodes (Derived Data) of a WorkflowTool launch.
        """
        for galaxy_dataset in self._get_galaxy_history_dataset_list():
            AnalysisNodeConnection.objects.create(
                analysis=self.analysis,
                direction=OUTPUT_CONNECTION,
                name=galaxy_dataset["name"],
                subanalysis=self._get_analysis_group_number(galaxy_dataset),
                step=self._get_workflow_step(galaxy_dataset),
                filename=galaxy_dataset["name"],
                filetype=galaxy_dataset["file_ext"],
                is_refinery_file=True
            )

    def _create_collection_description(self):
        """
        Creates an appropriate bioblend.galaxy.CollectionDescription
        instance based off of the structure of our WorkflowTool's
        file_relationships.
        :return: bioblend.galaxy.CollectionDescription instance
        """
        file_relationship_nesting_list = (
            self._parse_file_relationships_nesting(
                # Please note the `*` unpacking operator used here
                *self.get_galaxy_file_relationships()
            )
        )
        analysis_group = 0
        galaxy_element_list = []
        workflow_is_collection_based = self._has_dataset_collection_input()

        # Toggle between the creation of `forward` and `reverse`
        # HistoryDatasetElements for `paired` CollectionElements
        reverse_read = False

        for nested_element in reversed(file_relationship_nesting_list):
            if isinstance(nested_element, dict):
                nested_element[self.ANALYSIS_GROUP] = analysis_group
                self._update_galaxy_to_refinery_file_mapping_list(
                    nested_element
                )

                element_name = nested_element[self.REFINERY_FILE_UUID]
                if self.galaxy_collection_type.split(":")[-1] == self.PAIRED:
                    if reverse_read:
                        element_name = self.REVERSE
                        reverse_read = False
                    else:
                        element_name = self.FORWARD
                        reverse_read = True
                else:
                    if not workflow_is_collection_based:
                        analysis_group += 1

                galaxy_element_list.append(
                    HistoryDatasetElement(
                        name=element_name,
                        id=nested_element[self.GALAXY_DATASET_HISTORY_ID]
                    )
                )
            elif isinstance(nested_element, list):
                if workflow_is_collection_based:
                    analysis_group += 1

                list_collection_element = CollectionElement(
                    name="{} collection {}".format(self.LIST, uuid.uuid4()),
                    type=self.LIST
                )
                list_collection_element.elements = []
                galaxy_element_list.append(list_collection_element)

            elif isinstance(nested_element, tuple):
                analysis_group += 1

                paired_collection_element = CollectionElement(
                    name="{} collection {}".format(self.PAIRED, uuid.uuid4()),
                    type=self.PAIRED
                )
                paired_collection_element.elements = []
                galaxy_element_list.append(paired_collection_element)

        collection_description = CollectionDescription(
            name="{} - {}".format(self.name, self.galaxy_collection_type),
            type=self.galaxy_collection_type
        )
        collection_description.elements = []
        galaxy_element_list.append(collection_description)

        return self._associate_collection_elements(galaxy_element_list)

    @handle_bioblend_exceptions
    def create_dataset_collection(self):
        """
        Creates a Galaxy DatasetCollection based off of the collection
        description returned by:
        `WorkflowTool._create_collection_description()`
        """
        collection_info = (
            self.galaxy_connection.histories.create_dataset_collection(
                history_id=self.galaxy_import_history_id,
                collection_description=self._create_collection_description()
            )
        )
        self.update_galaxy_data(self.COLLECTION_INFO, collection_info)

    @handle_bioblend_exceptions
    def create_galaxy_history(self):
        return self.galaxy_connection.histories.create_history(
            name="History for: {}".format(self)
        )

    @handle_bioblend_exceptions
    def create_galaxy_library(self):
        return self.galaxy_connection.libraries.create_library(
            name="Library for: {}".format(self)
        )

    def _create_workflow_inputs_dict(self):
        """
        Create and return the inputs dict expected from bioblend. See here:
        http://bioblend.readthedocs.io/en/latest/api_docs/galaxy/all.html
        #bioblend.galaxy.workflows.WorkflowClient.invoke_workflow
        for details on its structure.
        """
        return {
            '0': {
                'id': self.get_galaxy_dict()[self.COLLECTION_INFO]["id"],
                'src': self.HISTORY_DATASET_COLLECTION_ASSOCIATION
            }
        }

    def _create_workflow_parameters_dict(self):
        """
        Create and return the params dict expected from bioblend. See here:
        http://bioblend.readthedocs.io/en/latest/api_docs/galaxy/all.html
        #bioblend.galaxy.workflows.WorkflowClient.invoke_workflow
        for details on its structure.
        """
        params_dict = {}
        workflow_parameters = self._get_workflow_parameters()

        for galaxy_parameter_uuid in workflow_parameters:
            galaxy_parameter = GalaxyParameter.objects.get(
                uuid=galaxy_parameter_uuid
            )
            workflow_step = galaxy_parameter.galaxy_workflow_step

            if params_dict.get(workflow_step) is None:
                params_dict[workflow_step] = self._get_tool_inputs_dict(
                    workflow_step
                )

            params_dict[workflow_step][galaxy_parameter.name] = (
                galaxy_parameter.cast_param_value_to_proper_type(
                    workflow_parameters[galaxy_parameter_uuid]
                )
            )
        return params_dict

    def create_workflow_file_downloads(self):
        """
        Create the proper WorkflowFilesDL objects from the list of Galaxy
        Datasets in our Galaxy Workflow invocation's History and add them to
        the M2M relation in our WorkflowTool's Analysis.
        """
        for galaxy_dataset in self._get_galaxy_history_dataset_list():
            self.analysis.workflow_dl_files.add(
                WorkflowFilesDL.objects.create(
                    step_id=self._get_workflow_step(galaxy_dataset),
                    filename=self._get_galaxy_dataset_filename(galaxy_dataset)
                )
            )

        self.analysis.save()

    def _flatten_file_relationships_nesting(self, nesting=None,
                                            structure=None):
        """
        Gets the `LIST`/`PAIR` structure of our file_relationships,
        but flattened into a list.
        :param nesting: Nested list/tuple file_relationships data structure
        from our tool launch config
        :param structure: list to store each level of nesting in
        :return: list containing a flattened representation of the nested
        list/tuple structure of a Tool's file_relationships
        """

        if nesting is None:
            nesting = self.get_galaxy_file_relationships()

        if structure is None:
            structure = []

        if isinstance(nesting, list):
            structure.append(nesting)
        if isinstance(nesting, tuple):
            structure.append(nesting)
        if isinstance(nesting, dict):
            return structure
        return self._flatten_file_relationships_nesting(
            nesting[0],
            structure=structure
        )

    def _get_analysis_group_number(self, galaxy_dataset_dict):
        """
        Fetch the Analysis Group Number (subanalysis) corresponding to the
        derived Galaxy Dataset from our Galaxy Workflow invocation.

        :param galaxy_dataset_dict: dict containing information about a
        Galaxy Dataset
        :return: <int> corresponding to said Galaxy Dataset's analysis group
        """
        refinery_input_file_id = self._get_refinery_input_file_id(
            galaxy_dataset_dict
        )
        refinery_to_galaxy_file_mappings = self._get_galaxy_file_mapping_list()

        matching_refinery_to_galaxy_file_mappings = [
            refinery_to_galaxy_file_map
            for refinery_to_galaxy_file_map in refinery_to_galaxy_file_mappings
            if refinery_input_file_id == refinery_to_galaxy_file_map[
                self.GALAXY_DATASET_HISTORY_ID
            ]
        ]
        assert len(matching_refinery_to_galaxy_file_mappings) == 1, (
            "`matching_refinery_to_galaxy_file_mappings` should only "
            "contain a single element."
        )
        analysis_group_number = (
            matching_refinery_to_galaxy_file_mappings[0][self.ANALYSIS_GROUP]
        )
        return analysis_group_number

    def _get_analysis_node_connection_input_filename(self):
        return (
            self.INPUT_DATASET_COLLECTION if
            self._has_dataset_collection_input()
            else self.INPUT_DATASET
        )

    @staticmethod
    def _get_galaxy_dataset_filename(galaxy_dataset_dict):
        return "{}.{}".format(
            galaxy_dataset_dict["name"],
            galaxy_dataset_dict["file_ext"]
        )

    def _get_galaxy_file_mapping_list(self):
        return self.get_galaxy_dict()[self.GALAXY_TO_REFINERY_MAPPING_LIST]

    def get_galaxy_file_relationships(self):
        return ast.literal_eval(
            self.get_tool_launch_config(
            )[self.GALAXY_DATA][self.FILE_RELATIONSHIPS_GALAXY]
        )

    @handle_bioblend_exceptions
    def _get_galaxy_history_dataset_list(self):
        """
        Retrieve a list of Galaxy Datasets from the Galaxy History of our
        Galaxy Workflow invocation.
        """
        dataset_list = self.galaxy_connection.histories.show_matching_datasets(
            self.galaxy_workflow_history_id
        )
        non_purged_datasets = [
            dataset for dataset in dataset_list if not dataset["purged"]
        ]
        return non_purged_datasets

    def get_galaxy_dict(self):
        """
        Fetch the dict in a Tool's `tool_launch_config` under the
        `WorkflowTool.GALAXY_DATA` key
        """
        return self.get_tool_launch_config()[self.GALAXY_DATA]

    def get_galaxy_import_tasks(self):
        """
        Create and return a list of _tool_based_galaxy_file_import() tasks
        """
        return [
            _tool_based_galaxy_file_import.subtask(
                (
                    self.analysis.uuid,
                    file_store_item_uuid,
                    self.get_galaxy_dict()[self.GALAXY_IMPORT_HISTORY_DICT],
                    self.get_galaxy_dict()[self.GALAXY_LIBRARY_DICT],
                )
            ) for file_store_item_uuid in self.get_input_file_uuid_list()
            ]

    @handle_bioblend_exceptions
    def _get_galaxy_dataset_provenance(self, galaxy_dataset_dict):
        return self.galaxy_connection.histories.show_dataset_provenance(
            self.galaxy_workflow_history_id,
            galaxy_dataset_dict["id"],
            follow=True
        )

    @handle_bioblend_exceptions
    def _get_galaxy_workflow_invocation(self):
        """
        Fetch our Galaxy Workflow's invocation data.
        """
        return self.galaxy_connection.workflows.show_invocation(
            self.galaxy_workflow_history_id,
            self.get_galaxy_dict()[self.GALAXY_WORKFLOW_INVOCATION_DATA]["id"]
        )

    def _get_input_nodes(self):
        """
        Return a list of Node objects corresponding to the Node UUIDs we
        receive from the front-end when a WorkflowTool is launched.

        NOTE: There is no exception handling here since this method is
        within the scope of an atomic transaction.
        """
        return [
            Node.objects.get(uuid=uuid) for uuid in self.get_input_node_uuids()
            ]

    @handle_bioblend_exceptions
    def _get_refinery_input_file_id(self, galaxy_dataset_dict):
        """
        Retrieve the Galaxy Dataset id corresponding to the Refinery file
        that a Derived Dataset ultimately came from.
        This is done through a combination of WorkflowTools keeping track of
        which FileStoreItems correspond to which Datasets in our
        Galaxy History
        (see WorkflowTool._update_galaxy_to_refinery_file_mapping_list),
        and utilizing `bioblend.galaxy.histories.show_dataset_provenance` in a
        recursive manner to trace back to where any derived data came from.
        :param galaxy_dataset_dict: dict containing information about a
        Galaxy Dataset
        :return: id of the Galaxy Dataset corresponding to our
        `galaxy_dataset_dict`s Refinery input file
        """
        job_inputs = self.galaxy_connection.jobs.show_job(
            self._get_galaxy_dataset_provenance(galaxy_dataset_dict)["job_id"]
        )["inputs"]

        for key in job_inputs.keys():
            galaxy_dataset = job_inputs[key]
            galaxy_dataset_provenance = self._get_galaxy_dataset_provenance(
                galaxy_dataset
            )
            # If we reach a point where the tool in the provenance is an
            # `upload` tool, we can tell which Refinery FileStoreItem our
            # derived dataset came from
            if "upload" in galaxy_dataset_provenance[self.TOOL_ID]:
                return galaxy_dataset["id"]
            else:
                # Recursive call
                return self._get_refinery_input_file_id(galaxy_dataset)

    @handle_bioblend_exceptions
    def _get_tool_data(self, workflow_step):
        return self.galaxy_connection.tools.show_tool(
            self.galaxy_connection.workflows.show_workflow(
                self.get_workflow_internal_id()
            )["steps"][workflow_step][self.TOOL_ID],
            io_details=True
        )

    def _get_tool_inputs_dict(self, workflow_step):
        """
        Retrieve the valid input parameters for the Galaxy tool in our current
        Galaxy Workflow that corresponds to the given `workflow_step`
        """
        tool_data = self._get_tool_data(str(workflow_step))

        # we don't want to retrieve information about data inputs here
        tool_data_inputs = [
            param for param in tool_data["inputs"]
            if param["type"] not in ["data", "data_collection"]
        ]
        # The information from bioblend is returned as unicode strings,
        # but we need to cast to the proper types to invoke the workflow
        # with edited parameters
        cast_to_type = {
            "text": str,
            "integer": int,
            "float": float,
            "boolean": bool
        }
        tool_inputs_dict = {}
        for input_dict in tool_data_inputs:
            try:
                proper_parameter_value = (
                    cast_to_type[input_dict["type"]](input_dict["value"])
                )
            except KeyError as e:
                logger.error(e)
                proper_parameter_value = input_dict["value"]

            tool_inputs_dict[input_dict["name"]] = proper_parameter_value
        return tool_inputs_dict

    @handle_bioblend_exceptions
    def _get_workflow_dict(self):
        return self.galaxy_connection.workflows.export_workflow_dict(
            self.get_workflow_internal_id()
        )

    def get_workflow_internal_id(self):
        return self.tool_definition.workflow.internal_id

    def _get_workflow_parameters(self):
        return self.get_tool_launch_config()[ToolDefinition.PARAMETERS]

    def _get_workflow_step(self, galaxy_dataset_dict):
        workflow_steps = [
            step["order_index"]
            for step in self._get_galaxy_workflow_invocation()["steps"]
            if step["job_id"] == galaxy_dataset_dict["creating_job"]
        ]
        assert len(workflow_steps) == 1, (
            "There should always be one corresponding workflow step, "
            "but there are {}".format(len(workflow_steps))
        )
        return workflow_steps[0]

    def _has_dataset_collection_input(self):
        """
        Determine whether our Workflow's input step has a Galaxy Dataset
        Collection as input or not.
        :returns: Boolean
        """
        workflow_input_type = self._get_workflow_dict()["steps"]["0"]["type"]
        return workflow_input_type == self.DATA_COLLECTION_INPUT

    @handle_bioblend_exceptions
    def import_library_dataset_to_history(self, history_id,
                                          library_dataset_id):
        """
        Import a Galaxy DataSet from a Data Library into a History
        :param history_id: UUID string of the Galaxy History to interact with
        :param library_dataset_id: UUID string of the Galaxy Library DataSet
         to interact with
        """
        return self.galaxy_connection.histories.upload_dataset_from_library(
            history_id,
            library_dataset_id
        )

    @handle_bioblend_exceptions
    def invoke_workflow(self):
        """Invoke a WorflowTool's Galaxy Workflow"""
        return self.galaxy_connection.workflows.invoke_workflow(
            self.get_workflow_internal_id(),
            history_name="Workflow Run for {} {}".format(self.name, self.uuid),
            inputs=self._create_workflow_inputs_dict(),
            params=self._create_workflow_parameters_dict()
        )

    def launch(self):
        """
        Launch a workflow-based Tool
        :returns:
            - <JsonResponse> w/ `tool_url` key corresponding to the url
            pointing to the Analysis' status page
        :raises: RuntimeError
        """
        analysis = self._create_analysis()
        self.create_analysis_input_node_connections()

        # TODO: Might hit race condition if Analysis isn't created in 5 seconds
        run_analysis.apply_async((analysis.uuid,), countdown=5)

        return JsonResponse(
            {
                Tool.TOOL_URL: "/data_sets/{}/#/analyses/".format(
                    self.dataset.uuid
                )
            }
        )

    def _parse_file_relationships_nesting(self, *args, **kwargs):
        """
        Create and return a list containing each level of nesting from our
        `file_relationships` structure
        """
        if not kwargs.get(self.FILE_RELATIONSHIPS_NESTING):
            kwargs[self.FILE_RELATIONSHIPS_NESTING] = []

        file_relationships_nesting = kwargs[self.FILE_RELATIONSHIPS_NESTING]
        for arg in args:
            if isinstance(arg, dict):
                file_relationships_nesting.append(arg)
                continue
            elif isinstance(arg, tuple):
                file_relationships_nesting.append(arg)
                self._parse_file_relationships_nesting(*list(arg), **kwargs)
            else:
                file_relationships_nesting.append(arg)
                self._parse_file_relationships_nesting(*arg, **kwargs)

        return file_relationships_nesting

    def set_analysis(self, analysis_uuid):
        """
        :param analysis_uuid: UUID of Analysis instance to associate with
        the Tool
        :raises: RuntimeError
        """
        try:
            self.analysis = Analysis.objects.get(uuid=analysis_uuid)
        except(Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as e:
            raise RuntimeError(e)
        else:
            self.save()

    def update_file_relationships_with_galaxy_history_data(self):
        """
        Replace a Tool's Node uuid in its `file_relationships` string with
        information about the file uploaded into a galaxy history that
        was fetched from said Node uuid and assign this data to a new
        key in the tool launch config: `file_relationships_galaxy`.
        No error handling here since this method is only called in an
        atomic transaction.
        """
        analysis_status = AnalysisStatus.objects.get(analysis=self.analysis)
        galaxy_dict = self.get_galaxy_dict()

        galaxy_to_refinery_mapping_list = get_taskset_result(
            analysis_status.galaxy_import_task_group_id
        ).join()

        for galaxy_to_refinery_dict in galaxy_to_refinery_mapping_list:
            node = Node.objects.get(
                uuid__in=self.get_input_node_uuids(),
                file_uuid=galaxy_to_refinery_dict[Tool.REFINERY_FILE_UUID]
            )
            galaxy_dict[self.FILE_RELATIONSHIPS_GALAXY] = (
                # Note the `1` in the replace call below. We only want to
                # replace the first occurrence of Node UUIDs in case a workflow
                # is launched with the same Node multiple times
                galaxy_dict[self.FILE_RELATIONSHIPS_GALAXY].replace(
                    node.uuid, json.dumps(galaxy_to_refinery_dict), 1
                )
            )
        tool_launch_config = self.get_tool_launch_config()
        tool_launch_config[self.GALAXY_DATA] = galaxy_dict
        self.set_tool_launch_config(tool_launch_config)

    def update_galaxy_data(self, key, value):
        """
        Update a WorkflowTool's tool_launch_config dict under
        `WorkflowTool.GALAXY_DATA` with a new key/value pair
        """
        tool_launch_config = self.get_tool_launch_config()
        tool_launch_config[self.GALAXY_DATA][key] = value
        self.set_tool_launch_config(tool_launch_config)

    def _update_galaxy_to_refinery_file_mapping_list(
            self, galaxy_to_refinery_mapping_dict):
        """
        Update Tool Launch Config information with a
        `galaxy_to_refinery_mapping_dict`.
        This allows us to keep track of Datasets in our Galaxy history
        and which Refinery FileStoreItems they correspond to.
        """
        galaxy_to_refinery_mapping_list = self._get_galaxy_file_mapping_list()
        galaxy_to_refinery_mapping_list.append(galaxy_to_refinery_mapping_dict)
        self.update_galaxy_data(
            self.GALAXY_TO_REFINERY_MAPPING_LIST,
            galaxy_to_refinery_mapping_list
        )

    @handle_bioblend_exceptions
    def upload_datafile_to_library_from_url(self, library_id, datafile_url):
        """
        Upload file from Refinery into a Galaxy Data Library form a
        specified url
        :param library_id: UUID string of the Galaxy Library to interact with
        :param datafile_url: <String> Full url pointing to a Refinery
        FileStoreItem datafile's source.
        """
        return self.galaxy_connection.libraries.upload_file_from_url(
            library_id,
            datafile_url
        )


@receiver(pre_delete, sender=VisualizationTool)
def remove_tool_container(sender, instance, *args, **kwargs):
    """
    Remove the Docker container instance corresponding to a
    VisualizationTool's launch.
    """
    try:
        DockerClientWrapper().purge_by_label(instance.uuid)
    except APIError as e:
        logger.error("Couldn't purge container for Tool with UUID: %s %s",
                     instance.uuid, e)
