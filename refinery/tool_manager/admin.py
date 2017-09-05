from django.contrib import admin

from guardian.admin import GuardedModelAdmin

from .models import (FileRelationship, GalaxyParameter, InputFile, Parameter,
                     Tool, ToolDefinition)
from .utils import AdminFieldPopulator


class FileRelationshipAdmin(AdminFieldPopulator):
    pass


class InputFileAdmin(AdminFieldPopulator):
    pass


class ToolDefinitionAdmin(AdminFieldPopulator):
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
admin.site.register(Parameter, ParameterAdmin)
admin.site.register(GalaxyParameter, GalaxyParameterAdmin)
admin.site.register(Tool, ToolAdmin)
