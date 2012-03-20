'''
Created on Feb 20, 2012

@author: nils
'''

from django.contrib import admin
from core.models import User
from core.models import Project
from core.models import DataSet
from core.models import Workflow
from core.models import WorkflowDataInput
from core.models import WorkflowDataInputMap
from core.models import Analysis
from core.models import ProjectUserRelationship
from core.models import WorkflowUserRelationship
from core.models import DataSetUserRelationship

admin.site.register(User)
admin.site.register(Project)
admin.site.register(ProjectUserRelationship)
admin.site.register(DataSet)
admin.site.register(DataSetUserRelationship)
admin.site.register(Workflow)
admin.site.register(WorkflowDataInput)
admin.site.register(WorkflowDataInputMap)
admin.site.register(WorkflowUserRelationship)
admin.site.register(Analysis)




