'''
Created on May 4, 2012

@author: nils
'''

from django.conf.urls.defaults import url
from django.core.serializers import json
from django.utils import simplejson
from tastypie import fields
from tastypie.resources import ModelResource
from tastypie.authentication import SessionAuthentication
from tastypie.authorization import Authorization
from tastypie.serializers import Serializer
from core.models import Project, NodeSet
from data_set_manager.models import Node
from data_set_manager.api import StudyResource, AssayResource


#TODO: implement custom authorization class based on django-guardian permissions


class PrettyJSONSerializer(Serializer):
    '''Adds indentations and newlines to JSON output
    Source: http://django-tastypie.readthedocs.org/en/latest/cookbook.html#pretty-printed-json-serialization
    '''
    json_indent = 2

    def to_json(self, data, options=None):
        options = options or {}
        data = self.to_simple(data, options)
        return simplejson.dumps(data, cls=json.DjangoJSONEncoder,
                sort_keys=True, ensure_ascii=False, indent=self.json_indent)


class ProjectResource(ModelResource):
    class Meta:
        #authentication = ApiKeyAuthentication()
        queryset = Project.objects.all()


class NodeResource(ModelResource):
    class Meta:
        queryset = Node.objects.all()
        resource_name = 'node'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = Authorization() # any user can change any Node instance
        serializer = PrettyJSONSerializer()

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]


class NodeSetResource(ModelResource):
    nodes = fields.ToManyField(NodeResource, 'nodes')
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')

    class Meta:
        queryset = NodeSet.objects.all()
        resource_name = 'nodeset'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = Authorization() # any user can change any NodeSet instance
        serializer = PrettyJSONSerializer()
        fields = ['name', 'summary', 'assay', 'study', 'uuid', 'nodes']

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]
