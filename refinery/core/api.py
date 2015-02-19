'''
Created on May 4, 2012

@author: nils
'''

from GuardianTastypieAuthz import GuardianAuthorization
from core.models import Project, NodeSet, NodeRelationship, NodePair, Workflow, \
    WorkflowInputRelationships, Analysis, DataSet, ExternalToolStatus, StatisticsObject, \
    SharedPermissionObject
from data_set_manager.api import StudyResource, AssayResource
from data_set_manager.models import Node, Study
from core.tasks import check_tool_status
from django.conf.urls.defaults import url
from django.contrib.auth.models import User, Group
from django.core.serializers import json
from django.db.models.aggregates import Count
from django.utils import simplejson
from file_store.models import FileStoreItem
from tastypie import fields
from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.authorization import DjangoAuthorization, Authorization
from tastypie.bundle import Bundle
from tastypie.constants import ALL_WITH_RELATIONS, ALL
from tastypie.exceptions import Unauthorized, ImmediateHttpResponse
from tastypie.http import HttpNotFound
from tastypie.resources import ModelResource, Resource
from tastypie.serializers import Serializer
import logging
import re
import json
import uuid


logger = logging.getLogger(__name__)


class DataSetResource(ModelResource):
    class Meta:
        queryset = DataSet.objects.all()
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        allowed_methods = ['get']
        resource_name = 'data_set'
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()        
        filtering = {'uuid': ALL}
        fields = ['uuid']


class AnalysisResource(ModelResource):
    data_set = fields.ToOneField(DataSetResource, 'data_set', use_in='detail')
    uuid = fields.CharField(attribute='uuid', use_in='all')
    name = fields.CharField(attribute='name', use_in='all')
    workflow__uuid = fields.CharField(attribute='workflow__uuid', use_in='all')
    creation_date = fields.CharField(attribute='creation_date', use_in='all')
    workflow_steps_num = fields.IntegerField(attribute='workflow_steps_num',
                                             blank=True, null=True, use_in='detail')
    workflow_copy = fields.CharField(attribute='workflow_copy',
                                     blank=True, null=True, use_in='detail')
    history_id = fields.CharField(attribute='history_id', blank=True, null=True,
                                  use_in='detail')
    workflow_galaxy_id = fields.CharField(attribute='workflow_galaxy_id',
                                          blank=True, null=True, use_in='detail')
    library_id = fields.CharField(attribute='library_id', blank=True, null=True,
                                  use_in='detail')
    time_start = fields.DateTimeField(attribute='time_start', blank=True, null=True,
                                      use_in='detail')
    time_end = fields.DateTimeField(attribute='time_end', blank=True, null=True,
                                    use_in='detail')
    status = fields.CharField(attribute='status', default=Analysis.INITIALIZED_STATUS,
                              blank=True, null=True, use_in='detail')

    class Meta:
        queryset = Analysis.objects.all()
        resource_name = Analysis._meta.module_name
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()
        allowed_methods = ["get"]
        fields = ['data_set', 'creation_date', 'history_id', 'library_id', 'name',
                'resource_uri', 'status', 'time_end', 'time_start', 'uuid',
                'workflow_copy', 'workflow_galaxy_id', 'workflow_steps_num']
        filtering = {'data_set': ALL_WITH_RELATIONS, 'workflow_steps_num': ALL_WITH_RELATIONS }
        ordering = ['name', 'creation_date']


class ProjectResource(ModelResource):
    class Meta:
        #authentication = ApiKeyAuthentication()
        queryset = Project.objects.all()


class NodeResource(ModelResource):
    parents = fields.ToManyField( 'core.api.NodeResource', 'parents' )
    study = fields.ToOneField( 'data_set_manager.api.StudyResource', 'study' )
    assay = fields.ToOneField( 'data_set_manager.api.AssayResource', 'assay', null=True )

    class Meta:
        queryset = Node.objects.all()
        resource_name = 'node'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = Authorization() #GuardianAuthorization()
        allowed_methods = ["get" ]
        fields = ['name', 'uuid', 'file_uuid', 'file_url', 'study', 'assay', 'children', 'type', 'analysis_uuid', 'subanalysis' ]
        filtering = { 'uuid': ALL, 'study': ALL_WITH_RELATIONS, 'assay': ALL_WITH_RELATIONS }
        #filtering = { "study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS }

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]

    def dehydrate(self, bundle):
        # return download URL of file if a file is associated with the node
        
        if bundle.obj.file_uuid is not None and bundle.obj.file_uuid != "":
            try:
                bundle.data['file_url'] = FileStoreItem.objects.get( uuid=bundle.obj.file_uuid ).get_full_url()
            except:
                logger.warning( 'Unable to find file store item with UUID "' + bundle.obj.file_uuid + '".' )
                bundle.data['file_url'] = None
        else:
            bundle.data['file_url'] = None
           
        return bundle
    

class NodeSetResource(ModelResource):
    # https://github.com/toastdriven/django-tastypie/pull/538
    # https://github.com/toastdriven/django-tastypie/issues/526
    # Once the above has been integrated into a tastypie release branch remove NodeSetListResource and
    # use "use_in" instead 
    #nodes = fields.ToManyField(NodeResource, 'nodes', use_in="detail" )
    
    solr_query = fields.CharField(attribute='solr_query', null=True)
    solr_query_components = fields.CharField(attribute='solr_query_components', null=True)
    node_count = fields.IntegerField(attribute='node_count', null=True)
    is_implicit = fields.BooleanField(attribute='is_implicit')
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')

    class Meta:
        # create node count attribute on the fly - node_count field has to be defined on resource
        queryset = NodeSet.objects.all().order_by( '-is_current', 'name') 
        resource_name = 'nodeset'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()
        fields = [ 'is_current', 'name', 'summary', 'assay', 'study', 'uuid', 'is_implicit', 'node_count', 'solr_query','solr_query_components']
        ordering = [ 'is_current', 'name', 'summary', 'assay', 'study', 'uuid', 'is_implicit', 'node_count', 'solr_query','solr_query_components']
        allowed_methods = ["get", "post", "put" ]
        filtering = { "study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS, "uuid": ALL }
        always_return_data = True # otherwise JQuery treats a 201 as an error for data type "JSON"

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]

    def obj_create(self, bundle, **kwargs):
        '''Create a new NodeSet instance and assign current user as owner if
        current user has read permission on the data set referenced by the new NodeSet

        '''
        # get the Study specified by the UUID in the new NodeSet
        study_uri = bundle.data['study']
        match = re.search('[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', study_uri)
        study_uuid = match.group()
        try:
            study = Study.objects.get(uuid=study_uuid)
        except Study.DoesNotExist:
            logger.error("Study '{}' does not exist".format(study_uuid))
            self.unauthorized_result(Unauthorized("You are not allowed to create a new NodeSet."))
        # look up the dataset via InvestigationLink relationship
        # an investigation is only associated with a single data set even though
        # InvestigationLink is a many to many relationship
        try:
            dataset = study.investigation.investigationlink_set.all()[0].data_set
        except IndexError:
            logger.error("Data set not found for study '{}'".format(study.uuid))
            self.unauthorized_result(Unauthorized("You are not allowed to create a new NodeSet."))
        permission = "read_%s" % dataset._meta.module_name
        if not bundle.request.user.has_perm(permission, dataset):
            self.unauthorized_result(Unauthorized("You are not allowed to create a new NodeSet."))
        # if user has the read permission on the data set
        # continue with creating the new NodeSet instance
        bundle = super(NodeSetResource, self).obj_create(bundle, **kwargs)
        bundle.obj.set_owner(bundle.request.user)
        return bundle


class NodeSetListResource(ModelResource):
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')
    node_count = fields.IntegerField(attribute='node_count',readonly=True)
    is_implicit = fields.BooleanField(attribute='is_implicit')

    class Meta:
        # create node count attribute on the fly - node_count field has to be defined on resource
        queryset = NodeSet.objects.all().order_by( '-is_current', 'name') 
        detail_resource_name = 'nodeset' # NG: introduced to get correct resource ids
        resource_name = 'nodesetlist'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()
        fields = [ 'is_current', 'name', 'summary', 'assay', 'study', 'uuid' ]
        allowed_methods = ["get" ]
        filtering = { "study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS }
        ordering = [ 'is_current', 'name', 'node_count' ];
    
    def dehydrate(self, bundle):
        # replace resource URI to point to the nodeset resource instead of the nodesetlist resource        
        bundle.data['resource_uri'] = bundle.data['resource_uri'].replace( self._meta.resource_name, self._meta.detail_resource_name ) 
        return bundle


class NodePairResource(ModelResource):
    node1 = fields.ToOneField(NodeResource, 'node1')
    node2 = fields.ToOneField(NodeResource, 'node2', null=True)
    group = fields.CharField(attribute='group', null=True)
    
    class Meta:
        detail_allowed_methods = [ 'get', 'post', 'delete', 'put', 'patch' ]
        queryset = NodePair.objects.all()
        detail_resource_name = 'nodepair' 
        resource_name = 'nodepair'
        detail_uri_name = 'uuid'  
        authentication = SessionAuthentication()
        authorization = Authorization()        
        # for use with AngularJS $resources: returns newly created object upon POST (in addition to the location response header)
        always_return_data = True

 
class NodeRelationshipResource(ModelResource):
    name = fields.CharField(attribute='name', null=True)
    type = fields.CharField(attribute='type', null=True)
    node_pairs = fields.ToManyField(NodePairResource, 'node_pairs')  #, full=True), if you need each attribute for each nodepair
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')
    
    class Meta:
        detail_allowed_methods = [ 'get', 'post', 'delete', 'put', 'patch' ]
        queryset = NodeRelationship.objects.all().order_by( '-is_current', 'name') 
        detail_resource_name = 'noderelationship' 
        resource_name = 'noderelationship'
        detail_uri_name = 'uuid'  
        authentication = SessionAuthentication()
        authorization = Authorization()
        # for use with AngularJS $resources: returns newly created object upon POST (in addition to the location response header)
        always_return_data = True
        
        #fields = ['type', 'study', 'assay', 'node_pairs']
        ordering = [ 'is_current', 'name', 'type', 'node_pairs']
        filtering = { 'study': ALL_WITH_RELATIONS, 'assay': ALL_WITH_RELATIONS }


class WorkflowResource(ModelResource):
    input_relationships = fields.ToManyField("core.api.WorkflowInputRelationshipsResource", 'input_relationships', full=True)

    class Meta:
        queryset = Workflow.objects.filter(is_active=True).order_by('name')
        detail_resource_name = 'workflow'
        resource_name = 'workflow'
        detail_uri_name = 'uuid'
        allowed_methods = ['get']
        fields = ['name', 'uuid', 'summary']

    def dehydrate(self, bundle):
        # detect if detail
        if self.get_resource_uri(bundle) == bundle.request.path:
            # detail detected, add graph as json
            try:
                bundle.data['graph'] = json.loads(bundle.obj.graph)
            except ValueError:
                logger.error("Failed to decode workflow graph into dictionary for workflow " + str(bundle.obj) + ".")
                # don't include in response if error occurs
        bundle.data['author'] = bundle.obj.get_owner()
        bundle.data['galaxy_instance_identifier'] = bundle.obj.workflow_engine.instance.api_key
        return bundle

        
class WorkflowInputRelationshipsResource(ModelResource):
    #workflow = fields.ToOneField(WorkflowResource, 'workflow')
    
    class Meta:
        queryset = WorkflowInputRelationships.objects.all()
        detail_resource_name = 'workflowrelationships' 
        resource_name = 'workflowrelationships'
        #detail_uri_name = 'uuid'   
        fields = ['category', 'set1', 'set2', 'workflow']
        

class ExternalToolStatusResource(ModelResource):
    class Meta:
        queryset = ExternalToolStatus.objects.all()
        resource_name = 'externaltoolstatus'
        authentication = Authentication()
        authorization = Authorization()
        allowed_methods = ["get" ]
        fields = ['name', 'is_active', 'unique_instance_identifier']
        
    def dehydrate(self, bundle):        
        bundle.data['status'] = check_tool_status(bundle.data['name'])[1] # call to method

        return bundle


class StatisticsResource(Resource):
    user = fields.IntegerField(attribute="user")
    group = fields.IntegerField(attribute="group")
    files = fields.IntegerField(attribute="files")
    dataset = fields.DictField(attribute="dataset")
    workflow = fields.DictField(attribute="workflow")
    project = fields.DictField(attribute="project")

    def stat_summary(self, model):
        total = len(model.objects.all())
        public = len(filter(lambda x: x.is_public(), model.objects.all()))
        private_shared = len(filter(lambda x: (not x.is_public() and len(x.get_groups()) > 1), model.objects.all()))
        private = total - public - private_shared
        return {"total": total, "public": public, "private": private, "private_shared": private_shared}

    class Meta:
        resource_name = "statistics"
        object_class = StatisticsObject 

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}
        kwargs['pk'] = uuid.uuid1()
        return kwargs 

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def get_object_list(self, request):
        user_count = User.objects.count()
        group_count = Group.objects.count()
        files_count = FileStoreItem.objects.count()
        dataset_summary = {}
        workflow_summary = {}
        project_summary = {}
        
        if "dataset" in request.GET:
            dataset_summary = self.stat_summary(DataSet)
        if "workflow" in request.GET:
            workflow_summary = self.stat_summary(Workflow)
        if "project" in request.GET:
            project_summary = self.stat_summary(Project)

        request_string = request.GET.get("type")
        
        if request_string is not None:
            if "dataset" in request_string:
                dataset_summary = self.stat_summary(DataSet)
            if "workflow" in request_string:
                workflow_summary = self.stat_summary(Workflow)
            if "project" in request_string:
                project_summary = self.stat_summary(Project)

        results = [StatisticsObject(user_count, group_count, files_count, dataset_summary, workflow_summary, project_summary)]
        return results


class SharedPermissionResource(Resource):
    username = fields.CharField(attribute="username")
    keys = fields.DictField(attribute="keys")
    permission_map = fields.DictField(attribute="permission_map")

    # get user object from username string
    def get_user(self, username):
        user_list = filter(lambda u: u.username == username, User.objects.all())
        return None if len(user_list) == 0 else user_list[0]
       
    # get all the resources that belongs to the user for a specific type of sharable resource
    def get_res(self, username, res_type):
        user = self.get_user(username)
        return filter(lambda res: res.get_owner() == user, res_type.objects.all())

    # the keys are the names of the sharable resources
    def get_key_map(self, username):
        def extract_names(res_list):
            return map(lambda res: res.name, res_list)
        return {
            "data_set": extract_names(self.get_res(username, DataSet)),
            "project": extract_names(self.get_res(username, Project)),
            "workflow": extract_names(self.get_res(username, Workflow)) }

    def get_permission_map(self, username):
        def get_res_map(res_type):
            # all the resources that are owned by the user for a specific type
            owned_res = self.get_res(username, res_type)
            acc_dict = {}
            
            for i in owned_res:
                # the list for one specific resource
                res_list = []
                # see if extended group or group is preferred just have to remove the group_ptr
                res_group_shared_with = map(lambda res: (res["group"].group_ptr.name, {"read": res["read"], "change": res["change"]}), i.get_groups())
            
                for j in res_group_shared_with:
                    # j[0] contains group name, j[1] contains read/change permission
                    # change has higher priority over read; change implies read permission
                    res_list.append({ "name": j[0], "permission": j[1]})
                acc_dict[i.name] = res_list
            return acc_dict
        return {
            "data_set": get_res_map(DataSet),
            "project": get_res_map(Project),
            "workflow": get_res_map(Workflow) }

    class Meta:
        resource_name = "shared_permission"
        object_class = SharedPermissionObject

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}
        kwargs['pk'] = uuid.uuid1()
        return kwargs

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def get_object_list(self, request):
        username = request.GET["username"]
        
        if self.get_user(username) is None:
            raise ImmediateHttpResponse(response=HttpNotFound("Username does not exist"))
        else: 
            key_map = self.get_key_map(username)
            permission_map = self.get_permission_map(username)
            return [SharedPermissionObject(username, key_map, permission_map)]


