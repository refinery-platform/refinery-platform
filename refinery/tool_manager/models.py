import ast
import json
import logging
import re

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver
from django.http import JsonResponse

from django_docker_engine.docker_utils import (DockerClientWrapper,
                                               DockerContainerSpec)
from django_extensions.db.fields import UUIDField
from docker.errors import APIError

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import run_analysis
from analysis_manager.utils import create_analysis, validate_analysis_config
from core.models import Analysis, DataSet, OwnableResource, Workflow
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


class Tool(OwnableResource):
    """
    A Tool is a representation of the information it will take to launch a
    Refinery-based Tool
    """
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
        # Tools can't be created without the `node_uuid_list` existing so no
        # KeyError is being caught
        return self.get_tool_launch_config()["node_uuid_list"]

    def get_file_relationships(self):
        return ast.literal_eval(
            self.get_tool_launch_config()["file_relationships"]
        )

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

    def launch(self):
        if self.get_tool_type() == ToolDefinition.VISUALIZATION:
            return self._launch_visualization()

        if self.get_tool_type() == ToolDefinition.WORKFLOW:
            return self._launch_workflow()

    def _launch_visualization(self):
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
            input={"file_relationships": self.get_file_relationships()},
            extra_directories=self.tool_definition.get_extra_directories()
        )

        DockerClientWrapper().run(container)

        return JsonResponse(
            {"tool_url": self.get_relative_container_url()}
        )

    def _launch_workflow(self):
        """
        Launch a workflow-based Tool
        :returns:
            - <JsonResponse> w/ `tool_url` key corresponding to the url
            pointing to the Analysis' status page
        :raises: RuntimeError
        """
        if self.get_tool_type() != ToolDefinition.WORKFLOW:
            raise NotImplementedError(
                "Tool: {} is not of type: {}".format(
                    self, ToolDefinition.WORKFLOW
                )
            )

        analysis_config = {
            "custom_name": "Analysis: {}".format(self),
            "studyUuid": self.dataset.get_latest_study().uuid,
            "toolUuid": self.uuid,
            "user_id": self.get_owner().id,
            "workflowUuid": self.tool_definition.workflow.uuid
        }
        validate_analysis_config(analysis_config)

        analysis = create_analysis(analysis_config)
        self.set_analysis(analysis.uuid)
        AnalysisStatus.objects.create(analysis=analysis)

        # Run the analysis task
        run_analysis.delay(analysis.uuid)

        analysis_url = "/data_sets2/{}/#/analyses/".format(self.dataset.uuid)
        return JsonResponse({"tool_url": analysis_url})

    def set_tool_launch_config(self, tool_launch_config):
        self.tool_launch_configuration = json.dumps(tool_launch_config)
        self.save()

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

    def update_file_relationships_string(self):
        """
        Replace a Tool's Node uuids in its `file_relationships` string with
        their respective FileStoreItem's urls. No error handling here since
        this method is only called in an atomic transaction.
        """

        tool_launch_config = self.get_tool_launch_config()

        node_uuids = re.findall(
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            tool_launch_config["file_relationships"]
        )

        # Add list of Node UUIDs to our ToolLaunchConfig for later use
        tool_launch_config["node_uuid_list"] = node_uuids

        for uuid in node_uuids:
            file_url = get_file_url_from_node_uuid(uuid)
            tool_launch_config["file_relationships"] = (
                tool_launch_config["file_relationships"].replace(
                    uuid, "'{}'".format(file_url)
                )
            )
        self.set_tool_launch_config(tool_launch_config)


@receiver(pre_delete, sender=Tool)
def remove_tool_container(sender, instance, *args, **kwargs):
    """
    Remove the Docker container instance corresponding to a Tool's launch.
    """
    if instance.get_tool_type() == ToolDefinition.VISUALIZATION:
        try:
            DockerClientWrapper().purge_by_label(instance.uuid)
        except APIError as e:
            logger.error("Couldn't purge container for Tool with UUID: %s %s",
                         instance.uuid, e)
