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
    Invitation, Ontology,
    Tutorials)
from core.utils import admin_ui_deletion


class AnalysisNodeConnectionAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("node",)
    list_display = ['__unicode__', 'id', 'analysis', 'subanalysis', 'node',
                    'step', 'name', 'filename', 'filetype', 'direction',
                    'is_refinery_file']


class AnalysisResultAdmin(ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'analysis_uuid', 'file_store_uuid',
                    'file_name', 'file_type']


class ProjectAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'is_catch_all']


class WorkflowDataInputMapAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'workflow_data_input_name',
                    'data_uuid', 'pair_id']


class WorkflowDataInputAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'name', 'internal_id']


class WorkflowFilesDlAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'step_id', 'pair_id', 'filename']


class WorkflowAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'internal_id', 'workflow_engine',
                    'show_in_repository_mode', 'is_active', 'type']

    def hide_selected_workflows(self, request, queryset):
        for obj in queryset:
            obj.is_active = False
            obj.save()

    def show_selected_workflows(self, request, queryset):
        for obj in queryset:
            obj.is_active = True
            obj.save()

    def delete_selected(self, request, objs):
        admin_ui_deletion(request, objs)

    def delete_model(self, request, obj):
        admin_ui_deletion(request, obj, True)

    delete_selected.short_description = "Delete selected Workflows"
    actions = [delete_selected, hide_selected_workflows,
               show_selected_workflows]


class WorkflowInputRelationshipsAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'category', 'set1', 'set2']


class WorkflowEngineAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'instance']


class DataSetAdmin(GuardedModelAdmin):
    readonly_fields = ('uuid',)
    list_display = ['__unicode__', 'id', 'name', 'file_count', 'file_size',
                    'accession', 'accession_source', 'title']

    def delete_selected(self, request, objs):
        admin_ui_deletion(request, objs)

    def delete_model(self, request, obj):
        admin_ui_deletion(request, obj, True)

    delete_selected.short_description = "Delete selected DataSets"
    actions = [delete_selected]


class InvitationAdmin(GuardedModelAdmin):
    list_diaplay = ['__unicode__', 'id', 'token_uuid', 'group_id', 'created',
                    'expires', 'sender', 'recipient_email']


class InvestigationLinkAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'data_set', 'investigation',
                    'version',
                    'message', 'date']


class AnalysisAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'project', 'data_set',
                    'workflow', 'workflow_steps_num', 'history_id',
                    'workflow_galaxy_id', 'library_id', 'time_start',
                    'time_end', 'status', 'status_detail']

    def delete_selected(self, request, objs):
        admin_ui_deletion(request, objs)

    def delete_model(self, request, obj):
        admin_ui_deletion(request, obj, True)

    delete_selected.short_description = "Delete selected Analyses"
    actions = [delete_selected]


class DiskQuotaAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'name', 'summary', 'maximum',
                    'current']


class DownloadAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'data_set', 'analysis',
                    'file_store_item']


class ExtendedGroupAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'manager_group', 'uuid', 'is_public',
                    'member_list', 'perm_list', 'can_edit']


class NodePairAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['id', 'uuid', 'node1', 'node2', 'group']


class NodeRelationshipAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'type', 'node_set_1',
                    'node_set_2', 'study', 'assay', 'is_current']


class NodeSetAdmin(GuardedModelAdmin, ForeignKeyAutocompleteAdmin):
    list_display = ['__unicode__', 'id', 'node_count', 'is_implicit',
                    'study', 'assay', 'is_current']


class UserProfileAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'uuid', 'user', 'affiliation',
                    'catch_all_project', 'login_count',
                    'get_date_joined', 'get_is_active']

    def get_date_joined(self, obj):
        return obj.user.date_joined

    def get_is_active(self, obj):
        return obj.user.is_active

    get_is_active.short_description = 'Is active'
    get_is_active.admin_order_field = 'user__is_active'

    get_date_joined.short_description = 'Date joined'
    get_date_joined.admin_order_field = 'user__date_joined'


class TutorialsAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'user_profile',
                    'launchpad_tutorial_viewed',
                    'collaboration_tutorial_viewed',
                    'data_upload_tutorial_viewed']


class OntologyAdmin(GuardedModelAdmin):
    list_display = ['__unicode__', 'id', 'acronym', 'name', 'uri', 'version',
                    'owl2neo4j_version', 'import_date', 'update_date']


admin.site.register(ExtendedGroup, ExtendedGroupAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(DataSet, DataSetAdmin)
admin.site.register(InvestigationLink, InvestigationLinkAdmin)
admin.site.register(Workflow, WorkflowAdmin)
admin.site.register(WorkflowFilesDL, WorkflowFilesDlAdmin)
admin.site.register(WorkflowEngine, WorkflowEngineAdmin)
admin.site.register(WorkflowDataInput, WorkflowDataInputAdmin)
admin.site.register(WorkflowDataInputMap, WorkflowDataInputMapAdmin)
admin.site.register(Analysis, AnalysisAdmin)
admin.site.register(Download, DownloadAdmin)
admin.site.register(AnalysisResult, AnalysisResultAdmin)
admin.site.register(AnalysisNodeConnection, AnalysisNodeConnectionAdmin)
admin.site.register(DiskQuota, DiskQuotaAdmin)
admin.site.register(NodePair, NodePairAdmin)
admin.site.register(NodeRelationship, NodeRelationshipAdmin)
admin.site.register(NodeSet, NodeSetAdmin)
admin.site.register(Invitation, InvitationAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Tutorials, TutorialsAdmin)
admin.site.register(WorkflowInputRelationships,
                    WorkflowInputRelationshipsAdmin)
admin.site.register(Ontology, OntologyAdmin)
