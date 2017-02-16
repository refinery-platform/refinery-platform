from django.contrib import admin

from .models import FileRelationship, InputFile, ToolDefinition, OutputFile,\
    Parameter


class FileRelationshipAdmin(admin.ModelAdmin):
    pass


class InputFileAdmin(admin.ModelAdmin):
    pass


class AuthorAdmin(admin.ModelAdmin):
    pass


class ToolDefinitionAdmin(admin.ModelAdmin):
    pass


class OutputFileAdmin(admin.ModelAdmin):
    pass


class ParameterAdmin(admin.ModelAdmin):
    pass


admin.site.register(FileRelationship, FileRelationshipAdmin)
admin.site.register(InputFile, InputFileAdmin)
admin.site.register(ToolDefinition, ToolDefinitionAdmin)
admin.site.register(OutputFile, OutputFileAdmin)
admin.site.register(Parameter, ParameterAdmin)
