'''
Created on Feb 20, 2012

@author: nils
'''

from django.contrib import admin
from core.models import UserProfile
from core.models import Project
from core.models import DataSet
from core.models import Workflow
from core.models import WorkflowDataInput
from core.models import WorkflowDataInputMap
from core.models import Analysis
from django.contrib.auth.models import Permission
from guardian.admin import GuardedModelAdmin


class ProjectAdmin(GuardedModelAdmin):
    pass

class WorkflowAdmin(GuardedModelAdmin):
    pass

class DataSetAdmin(GuardedModelAdmin):
    pass

admin.site.register(UserProfile)
admin.site.register(Project,ProjectAdmin)
admin.site.register(DataSet,DataSetAdmin)
admin.site.register(Workflow,WorkflowAdmin)
admin.site.register(WorkflowDataInput)
admin.site.register(WorkflowDataInputMap)
admin.site.register(Analysis)

admin.site.register( Permission )



