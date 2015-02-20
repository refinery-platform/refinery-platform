'''
Created on Feb 20, 2012

@author: nils
'''

from core.models import Analysis, AnalysisNodeConnection, AnalysisResult, \
    DataSet, DiskQuota, ExtendedGroup, InvestigationLink, NodePair, NodeRelationship, \
    NodeSet, Project, UserProfile, Workflow, WorkflowDataInput, WorkflowDataInputMap, \
    WorkflowEngine, WorkflowFilesDL, WorkflowInputRelationships, Download, ExternalToolStatus
from django.contrib import admin
from django.db import models
from django_extensions.admin import ForeignKeyAutocompleteAdmin
from guardian.admin import GuardedModelAdmin


class AnalysisNodeConnectionAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("node",)    

class ProjectAdmin(GuardedModelAdmin):
    pass

class WorkflowAdmin(GuardedModelAdmin):
    pass

class WorkflowEngineAdmin(GuardedModelAdmin):
    pass

class DataSetAdmin(GuardedModelAdmin):
    pass

class InvestigationLinkAdmin(GuardedModelAdmin):
    pass

class AnalysisAdmin(GuardedModelAdmin):
    pass

class DiskQuotaAdmin(GuardedModelAdmin):
    pass

class DownloadAdmin(GuardedModelAdmin,ForeignKeyAutocompleteAdmin):
    pass

class ExternalToolStatusAdmin(admin.ModelAdmin):
    readonly_fields = ('last_time_check', )

class DataSetAdmin(admin.ModelAdmin):
    readonly_fields = ('uuid',)

admin.site.register(UserProfile)
admin.site.register(ExtendedGroup)
admin.site.register(Project,ProjectAdmin)
admin.site.register(DataSet,DataSetAdmin)
admin.site.register(InvestigationLink,InvestigationLinkAdmin)
admin.site.register(Workflow,WorkflowAdmin)
admin.site.register(WorkflowEngine,WorkflowEngineAdmin)
admin.site.register(WorkflowDataInput)
admin.site.register(WorkflowDataInputMap)
admin.site.register(Analysis,AnalysisAdmin)
admin.site.register(Download,DownloadAdmin)
admin.site.register(ExternalToolStatus, ExternalToolStatusAdmin)
admin.site.register(AnalysisResult)
admin.site.register(AnalysisNodeConnection,AnalysisNodeConnectionAdmin)
admin.site.register(DiskQuota,DiskQuotaAdmin)
admin.site.register(NodePair)
admin.site.register(NodeRelationship)
admin.site.register(WorkflowInputRelationships)
admin.site.register(WorkflowFilesDL)
admin.site.register(NodeSet)