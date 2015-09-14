'''
Created on Feb 20, 2012

@author: nils
'''

from django.contrib import admin

from django_extensions.admin import ForeignKeyAutocompleteAdmin
from guardian.admin import GuardedModelAdmin

from core.models import (
    Analysis, AnalysisNodeConnection, AnalysisResult, DataSet, DiskQuota,
    ExtendedGroup, InvestigationLink, NodePair, NodeRelationship, NodeSet,
    Project, UserProfile, Workflow, WorkflowDataInput, WorkflowDataInputMap,
    WorkflowEngine, WorkflowFilesDL, WorkflowInputRelationships, Download,
    Invitation
)


class AnalysisNodeConnectionAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("node",)


class ProjectAdmin(GuardedModelAdmin):
    pass


class WorkflowAdmin(GuardedModelAdmin):
    pass


class WorkflowEngineAdmin(GuardedModelAdmin):
    pass


class DataSetAdmin(GuardedModelAdmin):
    readonly_fields = ('uuid',)
    list_display = ['id', '__unicode__', 'get_owner_username', 'file_size', 'file_count', 'accession', 'accession_source', 'title', 'uuid',
                    'get_version', 'get_version_details', 'get_investigation']


class InvestigationLinkAdmin(GuardedModelAdmin):
    pass


class AnalysisAdmin(GuardedModelAdmin):
    pass


class DiskQuotaAdmin(GuardedModelAdmin):
    pass


class DownloadAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    pass


admin.site.register(UserProfile)
admin.site.register(ExtendedGroup)
admin.site.register(Project, ProjectAdmin)
admin.site.register(DataSet, DataSetAdmin)
admin.site.register(InvestigationLink, InvestigationLinkAdmin)
admin.site.register(Workflow, WorkflowAdmin)
admin.site.register(WorkflowEngine, WorkflowEngineAdmin)
admin.site.register(WorkflowDataInput)
admin.site.register(WorkflowDataInputMap)
admin.site.register(Analysis, AnalysisAdmin)
admin.site.register(Download, DownloadAdmin)
admin.site.register(AnalysisResult)
admin.site.register(AnalysisNodeConnection, AnalysisNodeConnectionAdmin)
admin.site.register(DiskQuota, DiskQuotaAdmin)
admin.site.register(NodePair)
admin.site.register(NodeRelationship)
admin.site.register(WorkflowInputRelationships)
admin.site.register(WorkflowFilesDL)
admin.site.register(NodeSet)
admin.site.register(Invitation)
