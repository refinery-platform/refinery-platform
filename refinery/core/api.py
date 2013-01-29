'''
Created on May 4, 2012

@author: nils
'''

from core.models import Project, NodeSet
from data_set_manager.api import StudyResource, AssayResource
from data_set_manager.models import Node
from django.conf.urls.defaults import url
from django.core.serializers import json
from django.db.models.aggregates import Count
from django.utils import simplejson
from tastypie import fields
from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.authorization import Authorization
from tastypie.bundle import Bundle
from tastypie.constants import ALL_WITH_RELATIONS
from tastypie.resources import ModelResource
from tastypie.serializers import Serializer

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
    # https://github.com/toastdriven/django-tastypie/pull/538
    # https://github.com/toastdriven/django-tastypie/issues/526
    # Once the above has been integrated into a tastypie release branch remove NodeSetListResource and
    # use "use_in" instead 
    # nodes = fields.ToManyField(NodeResource, 'nodes', use_in="detail" )
    solr_query = fields.CharField(attribute='solr_query')
    node_count = fields.IntegerField(attribute='node_count')
    is_implicit = fields.BooleanField(attribute='is_implicit')
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')

    class Meta:
        # create node count attribute on the fly - node_count field has to be defined on resource
        queryset = NodeSet.objects.all()
        resource_name = 'nodeset'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        #TODO: switch to SessionAuthentication()
        #authentication = SessionAuthentication()
        authentication = Authentication()
        authorization = Authorization() # any user can change any NodeSet instance
        serializer = PrettyJSONSerializer()
        fields = ['name', 'summary', 'assay', 'study', 'uuid', 'node_count']
        allowed_methods = ["get", "patch", "put", "post" ]

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]


class NodeSetListResource(ModelResource):
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')
    node_count = fields.IntegerField(attribute='node_count',readonly=True)

    class Meta:
        # create node count attribute on the fly - node_count field has to be defined on resource
        queryset = NodeSet.objects.all()
        detail_resource_name = 'nodeset' # NG: introduced to get correct resource ids
        resource_name = 'nodesetlist'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        #TODO: switch to SessionAuthentication()
        #authentication = SessionAuthentication()
        authentication = Authentication()
        authorization = Authorization() # any user can change any NodeSet instance
        fields = ['name', 'summary', 'assay', 'study', 'uuid' ]
        allowed_methods = ["get" ]
        filtering = { "study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS }
        ordering = [ 'name', 'node_count' ];
    
    def dehydrate(self, bundle):
        # replace resource URI to point to the nodeset resource instead of the nodesetlist resource        
        bundle.data['resource_uri'] = bundle.data['resource_uri'].replace( self._meta.resource_name, self._meta.detail_resource_name ) 
        return bundle