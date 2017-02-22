from django.db import models
from django_extensions.db.fields import UUIDField


class Parameter(models.Model):
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

    def __unicode__(self):
        return "{}: {} - {} - {}".format(
            self.galaxy_tool_id,
            self.galaxy_tool_parameter,
            self.value_type, self.name)


class FileRelationship(models.Model):
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
    nested_elements = models.ManyToManyField("self", symmetrical=False,
                                             null=True, blank=True)
    input_files = models.ManyToManyField("InputFile")

    def __unicode__(self):
        return "{}: {}".format(
            self.value_type,
            self.name)


class InputFile(models.Model):
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100, blank=False, null=False)
    description = models.TextField(max_length=500, blank=False, null=False)
    allowed_filetypes = models.ManyToManyField("file_store.FileType")

    def __unicode__(self):
        return "{}: {}".format(
            self.name,
            [f.name for f in self.allowed_filetypes.all()])


class OutputFile(models.Model):
    uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(max_length=100, blank=False, null=False)
    description = models.TextField(max_length=500, blank=False, null=False)
    filetype = models.ForeignKey("file_store.FileType")

    def __unicode__(self):
        return "{}: {}".format(
            self.name,
            self.filetype)


class ToolDefinition(models.Model):
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

    def __unicode__(self):
        return "{}: {} {}".format(self.tool_type, self.name, self.uuid)
