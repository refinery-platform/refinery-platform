import logging
from urlparse import urljoin

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver
from django.http import HttpResponseServerError
from django.shortcuts import redirect

from django_extensions.db.fields import UUIDField
from django_docker_engine.docker_utils import DockerContainerSpec
from docker.errors import APIError

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

    def __str__(self):
        return "{}: {} {}".format(self.tool_type, self.name, self.uuid)

    def get_container_name(self):
        """
        Fetch the container_name of a VisualizationDefinition
        :return: VisualizationDefinition.container_name if available,
        otherwise `None`
        """
        try:
            visualization_definition = self.get_visualization_definition()
        except (VisualizationDefinition.DoesNotExist,
                VisualizationDefinition.MultipleObjectsReturned):
            return None
        else:
            return visualization_definition.container_name

    def get_docker_image_name(self):
        """
        Fetch the docker_image_name of a VisualizationDefinition
        :return: VisualizationDefinition.docker_image_name if available,
        otherwise `None`
        """
        try:
            visualization_definition = self.get_visualization_definition()
        except (VisualizationDefinition.DoesNotExist,
                VisualizationDefinition.MultipleObjectsReturned):
            return None
        else:
            return visualization_definition.docker_image_name

    def get_relative_container_url(self):
        """
        Construct & return the relative url of our VisualizationDefinition's
        container
        """
        return urljoin(
            settings.DJANGO_REST_FRAMEWORK_API_ROOT,
            "docker/{}".format(
                self.get_container_name()
            )
        )

    def get_visualization_definition(self):
        """
        Fetch the VisualizationDefinition associated with a ToolDefinition
        :return: <VisualizationDefinition> if available
        """
        try:
            return VisualizationDefinition.objects.get(uuid=self.uuid)
        except (VisualizationDefinition.DoesNotExist,
                VisualizationDefinition.MultipleObjectsReturned) as e:
            logger.info(
                "Couldn't properly fetch VisualizationDefinition with UUID: "
                "{} {}".format(self.uuid, e)
            )
            raise


class VisualizationDefinition(ToolDefinition):
    """
    An Extension of the ToolDefinition model with fields particular to
    Visualization tools
    """
    docker_image_name = models.CharField(max_length=255)
    container_name = models.CharField(max_length=150)

    class Meta:
        verbose_name = "Visualization Definition"

    def __str__(self):
        return "{}: {} - {} {}".format(
            self.tool_type,
            self.name,
            self.docker_image_name,
            self.container_name
        )


@receiver(pre_delete, sender=ToolDefinition)
def delete_parameters_and_output_files(sender, instance, *args, **kwargs):
    """
    Delete related parameter and output_file objects upon ToolDefinition
    deletion
    """
    parameters = instance.parameters.all()
    for parameter in parameters:
        parameter.delete()

    output_files = instance.output_files.all()
    for output_file in output_files:
        output_file.delete()


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


class ToolLaunchConfiguration(models.Model):
    """
    A ToolLaunchConfiguration is an abstract representation of the
    information it will take to launch a Refinery Tool
    """
    file_relationships = models.TextField()
    parameters = models.TextField()
    tool_definition = models.ForeignKey(ToolDefinition)
    start_date = models.DateTimeField(auto_now_add=True)
    # TODO: status. OwnableResource??? ????

    class Meta:
        abstract = True

    def __str__(self):
        return "Tool Launch: {} - {}".format(
            self.tool_definition.name,
            self.start_date
        )

    def get_tool_type(self):
        return self.tool_definition.tool_type

    def parse_file_relationships_string(self):
        pass

    def populate_url_from_node_uuid(self):
        pass


class WorkflowToolLaunch(ToolLaunchConfiguration):
    def launch(self):
        pass


class VisualizationToolLaunch(ToolLaunchConfiguration):
    def launch(self):
        container = DockerContainerSpec(
            image_name=self.tool_definition.get_docker_image_name(),
            container_name=self.tool_definition.get_container_name(),
            labels={self.tool_definition.uuid: "visualization_uuid"},
            container_input_path="/var/www/data/input.json",
            input={"file_relationships": self.file_relationships}
        )

        try:
            container.run()
        except APIError as e:
            return HttpResponseServerError(content=e)
        else:
            return redirect(
                self.tool_definition.get_relative_container_url()
            )
