'''
Created on May 4, 2012

@author: nils
'''

import json
import logging
import re
import uuid
from django.conf.urls.defaults import url
from django.contrib.auth.models import User, Group
from guardian.shortcuts import get_objects_for_user
from tastypie import fields
from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.authorization import Authorization
from tastypie.bundle import Bundle
from tastypie.constants import ALL_WITH_RELATIONS, ALL
from tastypie.exceptions import Unauthorized, ImmediateHttpResponse
from tastypie.http import HttpNotFound, HttpForbidden, HttpBadRequest
from tastypie.resources import ModelResource, Resource
from core.models import Project, NodeSet, NodeRelationship, NodePair, Workflow,\
    WorkflowInputRelationships, Analysis, DataSet, ExternalToolStatus,\
    StatisticsObject, ProjectSharingObject, DataSetSharingObject,\
    WorkflowSharingObject, GroupManagementObject
from core.tasks import check_tool_status
from data_set_manager.api import StudyResource, AssayResource
from data_set_manager.models import Node, Study
from file_store.models import FileStoreItem
from GuardianTastypieAuthz import GuardianAuthorization


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
    workflow_steps_num = fields.IntegerField(
        attribute='workflow_steps_num', blank=True, null=True, use_in='detail')
    workflow_copy = fields.CharField(
        attribute='workflow_copy', blank=True, null=True, use_in='detail')
    history_id = fields.CharField(
        attribute='history_id', blank=True, null=True, use_in='detail')
    workflow_galaxy_id = fields.CharField(
        attribute='workflow_galaxy_id', blank=True, null=True, use_in='detail')
    library_id = fields.CharField(
        attribute='library_id', blank=True, null=True, use_in='detail')
    time_start = fields.DateTimeField(
        attribute='time_start', blank=True, null=True, use_in='detail')
    time_end = fields.DateTimeField(
        attribute='time_end', blank=True, null=True, use_in='detail')
    status = fields.CharField(
        attribute='status', default=Analysis.INITIALIZED_STATUS, blank=True,
        null=True, use_in='detail')

    class Meta:
        queryset = Analysis.objects.all()
        resource_name = Analysis._meta.module_name
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        # required for public data set access by anonymous users
        authentication = Authentication()
        authorization = Authorization()
        allowed_methods = ["get"]
        fields = [
            'data_set', 'creation_date', 'history_id', 'library_id', 'name',
            'resource_uri', 'status', 'time_end', 'time_start', 'uuid',
            'workflow_copy', 'workflow_galaxy_id', 'workflow_steps_num'
        ]
        filtering = {
            'data_set': ALL_WITH_RELATIONS,
            'workflow_steps_num': ALL_WITH_RELATIONS
        }
        ordering = ['name', 'creation_date']


class ProjectResource(ModelResource):
    class Meta:
        #authentication = ApiKeyAuthentication()
        queryset = Project.objects.all()


class NodeResource(ModelResource):
    parents = fields.ToManyField('core.api.NodeResource', 'parents')
    study = fields.ToOneField('data_set_manager.api.StudyResource', 'study')
    assay = fields.ToOneField(
        'data_set_manager.api.AssayResource', 'assay', null=True)

    class Meta:
        queryset = Node.objects.all()
        resource_name = 'node'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        # required for public data set access by anonymous users
        authentication = Authentication()
        authorization = Authorization()
        allowed_methods = ["get"]
        fields = [
            'name', 'uuid', 'file_uuid', 'file_url', 'study', 'assay',
            'children', 'type', 'analysis_uuid', 'subanalysis'
        ]
        filtering = {
            'uuid': ALL, 'study': ALL_WITH_RELATIONS,
            'assay': ALL_WITH_RELATIONS
        }

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]

    def dehydrate(self, bundle):
        # return download URL of file if a file is associated with the node
        try:
            file_item = FileStoreItem.objects.get(uuid=bundle.obj.file_uuid)
        except AttributeError:
            logger.warning("No UUID provided")
            bundle.data['file_url'] = None
            bundle.data['file_import_status'] = None
        except FileStoreItem.DoesNotExist:
            logger.warning(
                "Unable to find file store item with UUID '%s'",
                bundle.obj.file_uuid)
            bundle.data['file_url'] = None
            bundle.data['file_import_status'] = None
        else:
            bundle.data['file_url'] = file_item.get_full_url()
            bundle.data['file_import_status'] = file_item.get_import_status()
        return bundle

    def get_object_list(self, request):
        """Get all nodes that are available to the current user (via data set)
        Temp workaround due to Node being not Ownable

        """
        perm = 'read_%s' % DataSet._meta.module_name
        allowed_datasets = get_objects_for_user(request.user, perm, DataSet)
        # get a list of node UUIDs that belong to all data sets available to the
        # current user
        all_allowed_studies = []
        for dataset in allowed_datasets:
            dataset_studies = dataset.get_investigation().study_set.all()
            all_allowed_studies.extend([study for study in dataset_studies])
        allowed_nodes = []
        for study in all_allowed_studies:
            allowed_nodes.extend(study.node_set.all().values('uuid'))
        # filter nodes using that list
        return super(NodeResource, self).get_object_list(request).filter(
            uuid__in=[node['uuid'] for node in allowed_nodes])


class NodeSetResource(ModelResource):
    # https://github.com/toastdriven/django-tastypie/pull/538
    # https://github.com/toastdriven/django-tastypie/issues/526
    # Once the above has been integrated into a tastypie release branch remove
    # NodeSetListResource and use "use_in" instead
    #nodes = fields.ToManyField(NodeResource, 'nodes', use_in="detail" )

    solr_query = fields.CharField(attribute='solr_query', null=True)
    solr_query_components = fields.CharField(
        attribute='solr_query_components', null=True)
    node_count = fields.IntegerField(attribute='node_count', null=True)
    is_implicit = fields.BooleanField(attribute='is_implicit')
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')

    class Meta:
        # create node count attribute on the fly - node_count field has to be
        # defined on resource
        queryset = NodeSet.objects.all().order_by( '-is_current', 'name') 
        resource_name = 'nodeset'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = Authorization()
        fields = [
            'is_current', 'name', 'summary', 'assay', 'study', 'uuid',
            'is_implicit', 'node_count', 'solr_query','solr_query_components'
        ]
        ordering = [
            'is_current', 'name', 'summary', 'assay', 'study', 'uuid',
            'is_implicit', 'node_count', 'solr_query','solr_query_components'
        ]
        allowed_methods = ["get", "post", "put" ]
        filtering = {
            "study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS,
            "uuid": ALL
        }
        # jQuery treats a 201 as an error for data type "JSON"
        always_return_data = True

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$" %
                    self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]

    def obj_create(self, bundle, **kwargs):
        """Create a new NodeSet instance and assign current user as owner if
        current user has read permission on the data set referenced by the new
        NodeSet

        """
        # get the Study specified by the UUID in the new NodeSet
        study_uri = bundle.data['study']
        match = re.search(
            '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}',
            study_uri)
        study_uuid = match.group()
        try:
            study = Study.objects.get(uuid=study_uuid)
        except Study.DoesNotExist:
            logger.error("Study '{}' does not exist".format(study_uuid))
            self.unauthorized_result(
                Unauthorized("You are not allowed to create a new NodeSet."))
        # look up the dataset via InvestigationLink relationship
        # an investigation is only associated with a single data set even though
        # InvestigationLink is a many to many relationship
        try:
            dataset = study.investigation.investigationlink_set.all()[0].data_set
        except IndexError:
            logger.error("Data set not found for study '{}'".format(study.uuid))
            self.unauthorized_result(
                Unauthorized("You are not allowed to create a new NodeSet."))
        permission = "read_%s" % dataset._meta.module_name
        if not bundle.request.user.has_perm(permission, dataset):
            self.unauthorized_result(
                Unauthorized("You are not allowed to create a new NodeSet."))
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
        # create node count attribute on the fly - node_count field has to be
        # defined on resource
        queryset = NodeSet.objects.all().order_by( '-is_current', 'name') 
        # NG: introduced to get correct resource IDs
        detail_resource_name = 'nodeset'
        resource_name = 'nodesetlist'
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        authentication = SessionAuthentication()
        authorization = Authorization()
        fields = ['is_current', 'name', 'summary', 'assay', 'study', 'uuid']
        allowed_methods = ["get"]
        filtering = {"study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS}
        ordering = ['is_current', 'name', 'node_count']

    def dehydrate(self, bundle):
        # replace resource URI to point to the nodeset resource instead of the
        # nodesetlist resource
        bundle.data['resource_uri'] = bundle.data['resource_uri'].replace(
            self._meta.resource_name, self._meta.detail_resource_name)
        return bundle


class NodePairResource(ModelResource):
    node1 = fields.ToOneField(NodeResource, 'node1')
    node2 = fields.ToOneField(NodeResource, 'node2', null=True)
    group = fields.CharField(attribute='group', null=True)
    
    class Meta:
        detail_allowed_methods = ['get', 'post', 'delete', 'put', 'patch']
        queryset = NodePair.objects.all()
        detail_resource_name = 'nodepair' 
        resource_name = 'nodepair'
        detail_uri_name = 'uuid'  
        authentication = SessionAuthentication()
        authorization = Authorization()        
        # for use with AngularJS $resources: returns newly created object upon
        # POST (in addition to the location response header)
        always_return_data = True


class NodeRelationshipResource(ModelResource):
    name = fields.CharField(attribute='name', null=True)
    type = fields.CharField(attribute='type', null=True)
    #, full=True), if you need each attribute for each nodepair
    node_pairs = fields.ToManyField(NodePairResource, 'node_pairs')
    study = fields.ToOneField(StudyResource, 'study')
    assay = fields.ToOneField(AssayResource, 'assay')

    class Meta:
        detail_allowed_methods = ['get', 'post', 'delete', 'put', 'patch']
        queryset = NodeRelationship.objects.all().order_by('-is_current', 'name')
        detail_resource_name = 'noderelationship' 
        resource_name = 'noderelationship'
        detail_uri_name = 'uuid'  
        authentication = SessionAuthentication()
        authorization = Authorization()
        # for use with AngularJS $resources: returns newly created object upon
        # POST (in addition to the location response header)
        always_return_data = True
        #fields = ['type', 'study', 'assay', 'node_pairs']
        ordering = ['is_current', 'name', 'type', 'node_pairs']
        filtering = {'study': ALL_WITH_RELATIONS, 'assay': ALL_WITH_RELATIONS}


class WorkflowResource(ModelResource):
    input_relationships = fields.ToManyField(
        "core.api.WorkflowInputRelationshipsResource", 'input_relationships',
        full=True)

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
                logger.error(
                    "Failed to decode workflow graph into dictionary for " +
                    "workflow '%s'", str(bundle.obj))
                # don't include in response if error occurs
        bundle.data['author'] = bundle.obj.get_owner()
        bundle.data['galaxy_instance_identifier'] = \
            bundle.obj.workflow_engine.instance.api_key
        return bundle


class WorkflowInputRelationshipsResource(ModelResource):
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
        allowed_methods = ["get"]
        fields = ['name', 'is_active', 'last_time_check',  'unique_instance_identifier']

    def dehydrate(self, bundle):
        # call to method
        bundle.data['status'] = check_tool_status(bundle.data['name'])[1]
        return bundle


class StatisticsResource(Resource):
    user = fields.IntegerField(attribute='user')
    group = fields.IntegerField(attribute='group')
    files = fields.IntegerField(attribute='files')
    dataset = fields.DictField(attribute='dataset')
    workflow = fields.DictField(attribute='workflow')
    project = fields.DictField(attribute='project')

    def stat_summary(self, model):
        model_list = model.objects.all()
        total = len(model_list)
        public = len(filter(lambda x: x.is_public(), model_list))
        private_shared = len(filter(
            lambda x: not x.is_public() and len(x.get_groups()) > 1, 
            model_list))
        private = total - public - private_shared
        return {'total': total, 'public': public, \
                'private': private, 'private_shared': private_shared}

    class Meta:
        resource_name = 'statistics'
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

        if 'dataset' in request.GET:
            dataset_summary = self.stat_summary(DataSet)
        if 'workflow' in request.GET:
            workflow_summary = self.stat_summary(Workflow)
        if 'project' in request.GET:
            project_summary = self.stat_summary(Project)
        
        request_string = request.GET.get('type')
        if request_string is not None:
            if 'dataset' in request_string:
                dataset_summary = self.stat_summary(DataSet)
            if 'workflow' in request_string:
                workflow_summary = self.stat_summary(Workflow)
            if 'project' in request_string:
                project_summary = self.stat_summary(Project)
        
        return [StatisticsObject(user_count, group_count, files_count, \
                dataset_summary, workflow_summary, project_summary)]


class SharablePermission(object):
    def __init__(self, res_type, perm_obj):
        self.res_type = res_type
        self.perm_obj = perm_obj

    def get_user(self, user_id):
        user_list = User.objects.filter(id=int(user_id))
        return None if len(user_list) == 0 else user_list[0]

    def get_res(self, res_uuid):
        res_list = self.res_type.objects.filter(uuid=res_uuid)
        return None if len(res_list) == 0 else res_list[0]

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def get_share_list(self, user, res):
        group_dict = {} 
        group_list = Group.objects.all()
        groups_in = filter(lambda g: user in g.user_set.all(), group_list)
        for i in groups_in:
            group_dict[i.id] = (i.name, {'read': False, 'change': False})

        groups_shared_with = map(
            lambda g: (
                g['group'].id, 
                g['group'].group_ptr.name, 
                {'read': g['read'], 'change': g['change']}), 
            res.get_groups())
        for g in groups_shared_with:
            # 0 = id, 1 = name, 2 = permissions
            group_dict[g[0]] = (g[1], g[2])
        
        share_list = []
        for k, v in group_dict.iteritems():
            # k = id, v[0] = name, v[1] = permissions
            share_list.append({'id': k, 'name': v[0], 'permissions': v[1]})
        
        return share_list

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}
        if isinstance(bundle_or_obj, Bundle):
            kwargs['pk'] = bundle_or_obj.obj.uuid
        else:
            kwargs['pk'] = bundle_or_obj.uuid
        return kwargs

    def obj_get(self, bundle, **kwargs):
        uuid = kwargs['pk']
        return self.get_res(uuid)

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def get_object_list(self, request):
        user = self.get_user(request.GET['owner-id'])
        res = self.get_res(request.GET['uuid'])
        if (user is None):
            raise ImmediateHttpResponse(response=HttpNotFound())
        elif (res is None):
            raise ImmediateHttpResponse(response=HttpNotFound())
        elif (res.get_owner().id != user.id):
            raise ImmediateHttpResponse(response=HttpForbidden())
        else:
            shares = self.get_share_list(user, res)
            return [self.perm_obj(user.username, user.id, res.name, \
                    res.uuid, shares)]

    def obj_update(self, bundle, **kwargs):
        kwargs = self.detail_uri_kwargs(bundle)
        uuid = kwargs['pk']
        res = self.get_res(uuid)
        owner = res.get_owner()
        user = bundle.request.user
        share_list = bundle.data['shares']
        
        if ((res is None) or (owner is None) or (share_list is None)):
            raise ImmediateHttpResponse(response=HttpBadRequest())

        # remove all objects before adding them
        for i in res.get_groups():
            res.unshare(self.get_group(i['id']))
        
        for group_data in share_list:
            group = self.get_group(group_data['id'])
            # sharing only allowed if can read or change and user is in group
            should_share = ((group_data['permission']['read']) or \
                (group_data['permission']['change'])) and \
                (user == owner) and \
                (user in group.user_set.all())
            is_read_only = not (group_data['permission']['change'])
            if should_share:
                res.share(group, is_read_only)
        
        res.save()
        return self.perm_obj()

class ProjectSharingResource(SharablePermission, Resource):
    owner = fields.CharField(attribute='owner', null=True)
    owner_id = fields.CharField(attribute='owner_id', null=True)
    res_name = fields.CharField(attribute='res_name', null=True)
    res_uuid = fields.CharField(attribute='res_uuid', null=True)
    shares = fields.ListField(attribute='shares', null=True)
    
    def __init__(self):
        SharablePermission.__init__(self, Project, ProjectSharingObject)
        Resource.__init__(self)

    class Meta:
        resource_name = 'project_sharing'
        object_class = ProjectSharingObject
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()


class DataSetSharingResource(SharablePermission, Resource):
    owner = fields.CharField(attribute='owner', null=True)
    owner_id = fields.CharField(attribute='owner_id', null=True)
    res_name = fields.CharField(attribute='res_name', null=True)
    res_uuid = fields.CharField(attribute='res_uuid', null=True)
    shares = fields.ListField(attribute='shares', null=True)
    
    def __init__(self):
        SharablePermission.__init__(self, DataSet, DataSetSharingObject)
        Resource.__init__(self)

    class Meta:
        resource_name = 'dataset_sharing'
        object_class = DataSetSharingObject
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()


class WorkflowSharingResource(SharablePermission, Resource):
    owner = fields.CharField(attribute='owner', null=True)
    owner_id = fields.CharField(attribute='owner_id', null=True)
    res_name = fields.CharField(attribute='res_name', null=True)
    res_uuid = fields.CharField(attribute='res_uuid', null=True)
    shares = fields.ListField(attribute='shares', null=True)
    
    def __init__(self):
        SharablePermission.__init__(self, Workflow, WorkflowSharingObject)
        Resource.__init__(self)

    class Meta:
        resource_name = 'workflow_sharing'
        object_class = WorkflowSharingObject
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()
        

class GroupManagementResource(Resource):
    member_list = fields.ListField(attribute='member_list', null=True)

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def get_members(self, group):
        user_list = group.user_set.all()
        return map(lambda u: {'username': u.username, 'id': u.id}, user_list)

    class Meta:
        resource_name = 'group_management'
        object_class = GroupManagementObject
        # authentication = SessionAuthentication

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}
        if isinstance(bundle_or_obj, Bundle):
            kwargs['pk'] = bundle_or_obj.obj.id
        else:
            kwargs['pk'] = bundle_or_obj.id
        return kwargs

    def obj_get(self, bundle, **kwargs):
        uuid = kwargs['pk']
        return self.get_group(uuid)

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def get_object_list(self, request):
        group = self.get_group(request.GET['id'])
        return [GroupManagementObject(group.id, self.get_members(group))]

    def obj_update(self, bundle, **kwargs):
        kwargs = self.detail_uri_kwargs(bundle)
        id = kwargs['pk']
        group = self.get_group(id)
        user = bundle.request.user
        member_list = bundle.data['member_list']

        # Verify that user has permission - if they are in the manager group.
        if user not in group.extendedgroup.manager_group.user_set.all():
            # raise ImmediateHttpResponse(response=HttpForbidden())
            pass

        # Remove all objects before readding them.
        group.user_set.clear()
        for i in member_list:
            group.user_set.add(i['id'])
        return GroupManagementResource()


