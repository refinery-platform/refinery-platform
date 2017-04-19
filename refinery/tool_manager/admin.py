from django.contrib import admin
from guardian.admin import GuardedModelAdmin

from .models import (FileRelationship, GalaxyParameter, InputFile,
                     OutputFile, Parameter, ToolDefinition, Tool)

from .utils import AdminFieldPopulator


class FileRelationshipAdmin(AdminFieldPopulator):
    pass


class InputFileAdmin(AdminFieldPopulator):
    pass


class ToolDefinitionAdmin(AdminFieldPopulator):
    pass


class OutputFileAdmin(AdminFieldPopulator):
    pass


class ParameterAdmin(AdminFieldPopulator):
    pass


class GalaxyParameterAdmin(AdminFieldPopulator):
    pass


class ToolAdmin(AdminFieldPopulator, GuardedModelAdmin):
    pass

admin.site.register(FileRelationship, FileRelationshipAdmin)
admin.site.register(InputFile, InputFileAdmin)
admin.site.register(ToolDefinition, ToolDefinitionAdmin)
admin.site.register(OutputFile, OutputFileAdmin)
admin.site.register(Parameter, ParameterAdmin)
admin.site.register(GalaxyParameter, GalaxyParameterAdmin)
admin.site.register(Tool, ToolAdmin)
