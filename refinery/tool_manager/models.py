import ast
import json
import logging
import re

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver
from django.http import JsonResponse

from bioblend.galaxy.dataset_collections import (CollectionDescription,
                                                 CollectionElement,
                                                 HistoryDatasetElement)
from django_docker_engine.docker_utils import (DockerClientWrapper,
                                               DockerContainerSpec)
from django_extensions.db.fields import UUIDField
from docker.errors import APIError

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import _tool_based_galaxy_file_import, run_analysis
from analysis_manager.utils import create_analysis, validate_analysis_config
from core.models import Analysis, DataSet, OwnableResource, Workflow
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
    # self-referential M2M below. See: http://bit.ly/2mpPQfT
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


class OutputFile(models.Model):
    """
    An Output file describes a file and allowed Refinery FileType(s) that we
    will associate with a tool as its expected output(s)
    """
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=500)
    filetype = models.ForeignKey(FileType)

    def __str__(self):
        return "{}: {} {}".format(self.name, self.filetype, self.uuid)


class ToolDefinition(models.Model):
    """
    A ToolDefinition is a generic representation of a tool that the
    RefineryPlatform can handle.

    More generally, any tools that we introduce to Refinery (Workflows,
    Visualizations, Other) will need to know about their expected inputs,
    outputs, and input file structuring.
    """

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
    output_files = models.ManyToManyField(OutputFile)
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

    output_files = instance.output_files.all()
    for output_file in output_files:
        output_file.delete()

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
        return "Tool: {} {} {}".format(
            self.get_tool_type(),
            self.get_tool_name(),
            self.uuid
        )

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

    def get_node_uuids(self):
        node_uuids = re.findall(
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            self.get_file_relationships()
        )
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
            "name": "Analysis: {}".format(self),
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
        node_uuids = self.get_node_uuids()

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


class WorkflowTool(Tool):
    """
    WorkflowTools are Tools that are specific to
    launching and monitoring Galaxy Workflows
    """
    COLLECTION_INFO = "collection_info"
    FILE_RELATIONSHIPS_GALAXY = "{}_galaxy".format(Tool.FILE_RELATIONSHIPS)
    FILE_RELATIONSHIPS_NESTING = "file_relationships_nesting"
    FORWARD = "forward"
    GALAXY_DATA = "galaxy_data"
    GALAXY_DATASET_HISTORY_ID = "galaxy_dataset_history_id"
    GALAXY_IMPORT_HISTORY_DICT = "import_history_dict"
    GALAXY_LIBRARY_DICT = "library_dict"
    GALAXY_WORKFLOW_INVOCATION_DATA = "galaxy_workflow_invocation_data"
    LIST = "list"
    PAIRED = "paired"
    REVERSE = "reverse"

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
            # These assertions are only temporary until further testing has
            # been done on this feature
            assert len(galaxy_element_data) == 1, \
                "Only one element should be present in: {}".format(
                    galaxy_element_data
                )
            assert type(galaxy_element_data[0]) == CollectionDescription, \
                "Element: {} should be of type: CollectionDescription".format(
                    galaxy_element_data[0]
                )
            return galaxy_element_data[0]

    def _create_collection_description(self, galaxy_element_list=None):
        """
        Creates an appropriate bioblend.galaxy.CollectionDescription
        instance based off of the structure of our WorkflowTool's
        file_relationships in a recursive manner.
        :return: <CollectionDescription>
        """
        file_relationship_nesting_list = (
            self._parse_file_relationships_nesting(
                *self.get_file_relationships_galaxy()  # Please note the `*`
                # unpacking operator used here
            )
        )

        if galaxy_element_list is None:
            galaxy_element_list = []

        # Toggle between the creation of `forward` and `reverse`
        # HistoryDatasetElements for `paired` CollectionElements
        reverse_read = False

        for nested_element in reversed(file_relationship_nesting_list):
            if isinstance(nested_element, dict):
                element_name = nested_element["refinery_file_uuid"]
                if self.galaxy_collection_type.split(":")[-1] == self.PAIRED:
                    if reverse_read:
                        element_name = self.REVERSE
                        reverse_read = False
                    else:
                        element_name = self.FORWARD
                        reverse_read = True

                galaxy_element_list.append(
                    HistoryDatasetElement(
                        name=element_name,
                        id=nested_element['galaxy_dataset_history_id']
                    )
                )
            elif isinstance(nested_element, list):
                list_collection_element = CollectionElement(
                    name=self.LIST,
                    type=self.LIST
                )
                list_collection_element.elements = []
                galaxy_element_list.append(list_collection_element)

            elif isinstance(nested_element, tuple):
                paired_collection_element = CollectionElement(
                    name=self.PAIRED,
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

    def create_galaxy_history(self):
        return self.galaxy_connection.histories.create_history(
            name="History for: {}".format(self)
        )

    def create_galaxy_library(self):
        return self.galaxy_connection.libraries.create_library(
            name="Library for: {}".format(self)
        )

    def create_workflow_inputs(self):
        return {
            '0': {
                'id': self.get_galaxy_dict()[self.COLLECTION_INFO]["id"],
                'src': 'hdca'
            }
        }

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
            nesting = self.get_file_relationships_galaxy()

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

    def get_file_relationships_galaxy(self):
        return ast.literal_eval(
            self.get_tool_launch_config(
            )[self.GALAXY_DATA][self.FILE_RELATIONSHIPS_GALAXY]
        )

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
                    self.get_galaxy_dict()[
                        self.GALAXY_IMPORT_HISTORY_DICT
                    ],
                    self.get_galaxy_dict()[self.GALAXY_LIBRARY_DICT],
                )
            ) for file_store_item_uuid in self.get_input_file_uuid_list()
            ]

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

    def invoke_workflow(self):
        """Invoke a Tool's workflow in Galaxy"""
        return self.galaxy_connection.workflows.invoke_workflow(
            self.tool_definition.workflow.internal_id,
            history_name="Workflow Run for {}".format(self.name),
            inputs=self.create_workflow_inputs()
        )

    def launch(self):
        """
        Launch a workflow-based Tool
        :returns:
            - <JsonResponse> w/ `tool_url` key corresponding to the url
            pointing to the Analysis' status page
        :raises: RuntimeError
        """

        analysis_config = self._get_analysis_config()
        validate_analysis_config(analysis_config)

        analysis = create_analysis(analysis_config)
        self.set_analysis(analysis.uuid)

        AnalysisStatus.objects.create(analysis=analysis)

        # Run the analysis task
        run_analysis.delay(analysis.uuid)

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

    def update_file_relationships_with_galaxy_history_data(
            self,
            galaxy_to_refinery_mapping
    ):
        """
        Replace a Tool's Node uuid in its `file_relationships` string with
        information about the file uploaded into a galaxy history that
        was fetched from said Node uuid and assign this data to a new
        key in the tool launch config: `file_relationships_galaxy`.
        No error handling here since this method is only called in an
        atomic transaction.
        """
        galaxy_dict = self.get_galaxy_dict()

        node = Node.objects.get(
            file_uuid=galaxy_to_refinery_mapping[Tool.REFINERY_FILE_UUID]
        )
        galaxy_dict[self.FILE_RELATIONSHIPS_GALAXY] = (
            galaxy_dict[self.FILE_RELATIONSHIPS_GALAXY].replace(
                node.uuid,
                "{}".format(json.dumps(galaxy_to_refinery_mapping))
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
