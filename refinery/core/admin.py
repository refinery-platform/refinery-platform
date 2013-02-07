'''
Created on Feb 20, 2012

@author: nils
'''

from django.contrib import admin
from core.models import UserProfile
from core.models import ExtendedGroup
from core.models import Project
from core.models import DataSet
from core.models import InvestigationLink
from core.models import Workflow
from core.models import WorkflowEngine
from core.models import WorkflowDataInput
from core.models import WorkflowDataInputMap
from core.models import Analysis
from core.models import DiskQuota
from core.models import NodeSet
from core.models import NodePair
from core.models import NodeRelationship
from core.models import WorkflowInputRelationships

from guardian.admin import GuardedModelAdmin

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
admin.site.register(DiskQuota,DiskQuotaAdmin)
admin.site.register(NodeSet)
admin.site.register(NodePair)
admin.site.register(NodeRelationship)
admin.site.register(WorkflowInputRelationships)
