'''
Created on May 4, 2012

@author: nils
'''

from django.contrib.auth.models import User
from tastypie import fields
from tastypie.resources import ModelResource
from tastypie.authentication import ApiKeyAuthentication
from core.models import Project, NodeSet


class ProjectResource(ModelResource):
    class Meta:
        #authentication = ApiKeyAuthentication()
        queryset = Project.objects.all()


class UserResource(ModelResource):
    class Meta:
        queryset = User.objects.all()
        resource_name = 'user'


class NodeSetResource(ModelResource):
    user = fields.ForeignKey(UserResource, 'user')

    class Meta:
        queryset = NodeSet.objects.all()
        resource_name = 'nodeset'
        allowed_methods = ['get']
