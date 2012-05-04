'''
Created on May 4, 2012

@author: nils
'''

from tastypie.resources import ModelResource
from tastypie.authentication import ApiKeyAuthentication
from core.models import Project


class ProjectResource(ModelResource):
    class Meta:
        authentication = ApiKeyAuthentication()
        queryset = Project.objects.all()
        
    
