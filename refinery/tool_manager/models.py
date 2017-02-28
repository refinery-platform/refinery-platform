from django.db import models
from django_extensions.db.fields import UUIDField


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
    name = models.TextField(max_length=100, blank=False,
                            null=False)
    description = models.TextField(max_length=500, blank=False,
                                   null=False)
    is_editable = models.BooleanField(default=False)
    value_type = models.CharField(choices=VALUE_TYPES, max_length=25,
                                  blank=False, null=False)
    default_value = models.TextField(max_length=100, blank=False, null=False)
    # ID of Galaxy tool that the parameter belongs to
    galaxy_tool_id = models.TextField(max_length=300, blank=False, null=False)
    galaxy_tool_parameter = models.TextField(
        max_length=100, blank=False, null=False)

    def __str__(self):
        return "{}: {} - {}".format(self.value_type, self.name, self.uuid)


class GalaxyParameter(Parameter):
    """
    Child of Parameter with fields specific to Galaxy tool parameter
    """
    # ID of Galaxy tool that the parameter belongs to
    galaxy_tool_id = models.TextField(max_length=300)
    galaxy_tool_parameter = models.TextField(max_length=100)


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
    name = models.TextField(max_length=100, blank=False,
                            null=False)
    value_type = models.CharField(
        max_length=100, choices=RELATIONSHIP_TYPES, blank=False, null=False)
    file_relationship = models.ManyToManyField("self", symmetrical=False,
                                               null=True, blank=True)
    # NOTE: `symmetrical=False` is not very common. It's necessary for the
    # self-referential M2M below. See: http://bit.ly/2mpPQfT
    file_relationship = models.ManyToManyField(
        "self", symmetrical=False, null=True, blank=True)

    input_files = models.ManyToManyField("InputFile")

    def __str__(self):
        return "{}: {} {}".format(self.value_type, self.name, self.uuid)


class InputFile(models.Model):
    """
    An Input file describes a file and allowed Refinery FileType(s) that we
    will associate with a tool as its expected input(s)
    """
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100, blank=False, null=False)
    description = models.TextField(max_length=500, blank=False, null=False)
    allowed_filetypes = models.ManyToManyField("file_store.FileType")

    def __str__(self):
        return "{}: {} {}".format(self.name, [f.name for f in
                                              self.allowed_filetypes.all()],
                                  self.uuid)


class OutputFile(models.Model):
    """
    An Output file describes a file and allowed Refinery FileType(s) that we
    will associate with a tool as its expected output(s)
    """
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100, blank=False, null=False)
    description = models.TextField(max_length=500, blank=False, null=False)
    filetype = models.ForeignKey("file_store.FileType")

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
    name = models.TextField(unique=True, max_length=100, blank=False,
                            null=False)
    description = models.TextField(unique=True, max_length=500, blank=False,
                                   null=False)
    tool_type = models.CharField(max_length=100, choices=TOOL_TYPES,
                                 blank=False, null=False)
    file_relationship = models.ForeignKey("FileRelationship")
    output_files = models.ManyToManyField("OutputFile")
    parameters = models.ManyToManyField("Parameter")

    def __str__(self):
        return "{}: {} {}".format(self.tool_type, self.name, self.uuid)
