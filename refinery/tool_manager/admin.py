from django.contrib import admin

from .models import (FileRelationship, GalaxyParameter, InputFile,
                     OutputFile, Parameter, ToolDefinition, ToolLaunch,
                     VisualizationDefinition, VisualizationToolLaunch,
                     WorkflowDefinition, WorkflowToolLaunch)

from .utils import AdminFieldPopulator


class FileRelationshipAdmin(AdminFieldPopulator):
    pass


class InputFileAdmin(AdminFieldPopulator):
    pass


class VisualizationDefinitionInline(admin.StackedInline):
    model = VisualizationDefinition


class WorkflowDefinitionInline(admin.StackedInline):
    model = WorkflowDefinition


class ToolDefinitionAdmin(AdminFieldPopulator):
    inlines = [
        VisualizationDefinitionInline,
        WorkflowDefinitionInline
    ]


class OutputFileAdmin(AdminFieldPopulator):
    pass


class ParameterAdmin(AdminFieldPopulator):
    pass


class GalaxyParameterAdmin(AdminFieldPopulator):
    pass


class VisualizationToolLaunchInline(admin.StackedInline):
    model = VisualizationToolLaunch


class WorkflowToolLaunchInline(admin.StackedInline):
    model = WorkflowToolLaunch


class ToolLaunchAdmin(AdminFieldPopulator):
    inlines = [
        VisualizationToolLaunchInline,
        WorkflowToolLaunchInline
    ]

admin.site.register(FileRelationship, FileRelationshipAdmin)
admin.site.register(InputFile, InputFileAdmin)
admin.site.register(ToolDefinition, ToolDefinitionAdmin)
admin.site.register(OutputFile, OutputFileAdmin)
admin.site.register(Parameter, ParameterAdmin)
admin.site.register(GalaxyParameter, GalaxyParameterAdmin)
admin.site.register(ToolLaunch, ToolLaunchAdmin)
