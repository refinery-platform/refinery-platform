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
from tastypie.http import HttpNotFound, HttpForbidden, HttpBadRequest, \
    HttpUnauthorized, HttpMethodNotAllowed, HttpAccepted
from tastypie.resources import ModelResource, Resource
from core.models import Project, NodeSet, NodeRelationship, NodePair, Workflow,\
    WorkflowInputRelationships, Analysis, DataSet, ExternalToolStatus,\
    ResourceStatisticsObject, ProjectSharingObject, DataSetSharingObject,\
    WorkflowSharingObject, MemberManagementObject, GroupManagementObject
from core.tasks import check_tool_status
from data_set_manager.api import StudyResource, AssayResource
from data_set_manager.models import Node, Study
from file_store.models import FileStoreItem
from GuardianTastypieAuthz import GuardianAuthorization
from django.core.paginator import Paginator, InvalidPage, PageNotAnInteger, \
    EmptyPage
from haystack.query import SearchQuerySet, EmptySearchQuerySet
import ast


logger = logging.getLogger(__name__)

class SharableResourceAPIInterface(object):
    uuid_regex = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    response_format = 'application/json'

    def __init__(self, res_type):
        self.res_type = res_type
    
    # Useful getter methods that process data.

    def get_res(self, res_uuid):
        res_list = self.res_type.objects.filter(uuid=res_uuid)
        return None if len(res_list) == 0 else res_list[0]

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def get_perms(self, res, group):
        # Default values.
        perms = {'read': False, 'change': False}

        # Find matching ones if available.
        for i in res.get_groups():
            if i['group'].group_ptr.id == group.id:
                perms = {'read': i['read'], 'change': i['change']}

        return perms

    def get_share_list(self, user, res):
        groups_in = filter(
            lambda g: user in g.user_set.all(),
            Group.objects.all())

        return map(
            lambda g: {
                'group_id': g.id,
                'group_name': g.name,
                'perms': self.get_perms(res, g)},
            groups_in)

    # Generalizes bundle construction and resource processing. Turning on more
    # options may require going to the SharableResource class and adding them.

    # Turns on certain things depending on flags
    def build_res_list(self, user, res_list, **kwargs):
        if 'sharing' in kwargs and kwargs['sharing']:
            for i in res_list:
                setattr(i, 'share_list', self.get_share_list(user, i))

        return res_list

    def build_res_list_bundle(self, request, res_list, **kwargs):
        bundle = []

        for i in res_list:
            built_obj = self.build_bundle(obj=i, request=request)
            bundle.append(self.full_dehydrate(built_obj))

        return bundle

    # **kwargs added in case there is other data for future expansion.
    def build_object_list(self, bundle, **kwargs):
        return {
            'meta': {
                'total_count': len(bundle)
            },
            'objects': bundle
        }
        
    def build_response(self, request, object_list, **kwargs):
        return self.create_response(request, object_list)

    # Makes everything simpler for GET requests.
    def process_get(self, request, res_list, **kwargs):
        user = request.user
        mod_res_list = self.build_res_list(user, res_list, **kwargs)
        bundle = self.build_res_list_bundle(request, mod_res_list, **kwargs)
        object_list = self.build_object_list(bundle, **kwargs)
        return self.build_response(request, object_list, **kwargs)

    # A few default URL endpoints as directed by prepend_urls in subclasses.
    def prepend_urls(self):
        return [
            url(r'^(?P<resource_name>%s)/$' %
                (self._meta.resource_name), 
                self.wrap_view('res_default_basic_list'),
                name='api_%s_basic_list' % (self._meta.resource_name)),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/$' %
                (self._meta.resource_name, self.uuid_regex),
                self.wrap_view('res_default_basic'),
                name='api_%s_basic' % (self._meta.resource_name)),
            url(r'^(?P<resource_name>%s)/sharing/$' %
                (self._meta.resource_name),
                self.wrap_view('res_default_sharing_list'),
                name='api_%s_sharing_list' % (self._meta.resource_name)),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/sharing/$' %
                (self._meta.resource_name, self.uuid_regex),
                self.wrap_view('res_default_sharing'),
                name='api_%s_sharing' % (self._meta.resource_name)),
        ]

    def res_default_basic(self, request, **kwargs):
        res = self.get_res(kwargs['uuid'])
        if request.method == 'GET':
            res_list = [res]
            return self.process_get(request, res_list)
        elif request.method == 'PATCH':
            pass
        else:
            return HttpMethodNotAllowed()

    def res_default_basic_list(self, request, **kwargs):
        if request.method == 'GET':
            res_list = filter(
                lambda r: r.get_owner().id == request.user.id,
                self.res_type.objects.all())
            return self.process_get(request, res_list)
        else:
            return HttpMethodNotAllowed()

    # TODO: Make sure GuardianAuthorization works.
    def res_default_sharing(self, request, **kwargs):
        res = self.get_res(kwargs['uuid'])
        if request.method == 'GET':
            res_list = [res]
            return self.process_get(request, res_list, sharing=True)
        elif request.method == 'PATCH':
            data = json.loads(request.raw_post_data)
            new_share_list = data['share_list']

            groups_shared_with = map(
                lambda g: g['group'].group_ptr,
                res.get_groups())

            # Unshare everything before sharing.
            for i in groups_shared_with:
                res.unshare(i)

            for i in new_share_list:
                group = self.get_group(int(i['id']))
                can_read = i['read']
                can_change = i['change']
                is_read_only = can_read and not can_change
                should_share = can_read or can_change

                if should_share:
                    res.share(group, is_read_only)

            return HttpAccepted()
        else:
            return HttpMethodNotAllowed()

    def res_default_sharing_list(self, request, **kwargs):
        if request.method == 'GET':
            res_list = filter(
                lambda r: r.get_owner().id == request.user.id,
                self.res_type.objects.all())
            return self.process_get(request, res_list, sharing=True)
        else:
            return HttpMethodNotAllowed()

    # Some other useful methods
    
    def determine_format(self, request):
        return self.response_format


class ProjectResource(ModelResource, SharableResourceAPIInterface):
    share_list = fields.ListField(attribute='share_list', null=True)

    def __init__(self):
        SharableResourceAPIInterface.__init__(self, Project)
        ModelResource.__init__(self)

    class Meta:
        #authentication = ApiKeyAuthentication()
        queryset = Project.objects.all()
        resource_name = 'projects'
        detail_uri_name = 'uuid'
        fields = ['name', 'id', 'uuid', 'summary', 'share_list']
        # authentication = SessionAuthentication
        # authorization = GuardianAuthorization

    def prepend_urls(self):
        return SharableResourceAPIInterface.prepend_urls(self)

    def determine_format(self, request):
        return SharableResourceAPIInterface.determine_format(self, request)


class DataSetResource(ModelResource, SharableResourceAPIInterface):
    share_list = fields.ListField(attribute='share_list', null=True)

    def __init__(self):
        SharableResourceAPIInterface.__init__(self, DataSet)
        ModelResource.__init__(self)

    class Meta:
        queryset = DataSet.objects.all()
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        allowed_methods = ['get']
        resource_name = 'data_sets'
        # authentication = SessionAuthentication()
        # authorization = GuardianAuthorization()        
        filtering = {'uuid': ALL}
        fields = ['uuid']

    def prepend_urls(self):
        prepend_urls_list = SharableResourceAPIInterface.prepend_urls(self) + [
            url(r'^(?P<resource_name>%s)/search/$' %
                (self._meta.resource_name),
                self.wrap_view('get_search'),
                name='api_%s_search' % (self._meta.resource_name)),
            url(r'^(?P<resource_name>%s)/autocomplete/$' %
                (self._meta.resource_name),
                self.wrap_view('get_autocomplete'),
                name='api_%s_autocomplete' % (self._meta.resource_name)),
        ]
        return prepend_urls_list

    def determine_format(self, request):
        return SharableResourceAPIInterface.determine_format(self, request)

    def get_search(self, request, **kwargs):
        query = request.GET.get('q', None)
        if not query:
            raise ImmediateHttpResponse(response=HttpBadRequest('Please supply the search parameter q'))

        # Do the query.
        results = (SearchQuerySet().using('core')
                                   .models(DataSet)
                                   .facet('measurement', mincount=1)
                                   .facet('technology', mincount=1)
                                   .load_all()
                                   .auto_query(query))

        if not results:
            results = EmptySearchQuerySet()

        paginator = Paginator(results, 10)

        page = request.GET.get('page', 1)
        try:
            current_results = paginator.page(page)
        except PageNotAnInteger:
            # If page is not an integer, deliver first page.
            current_results = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g. 9999), deliver last page of results.
            current_results = paginator.page(paginator.num_pages)

        result_list = map(lambda r: r.object, current_results.object_list)
        bundle = self.build_res_list_bundle(request, result_list, **kwargs)
        object_list = self.build_object_list(bundle, **kwargs)
        
        self.log_throttled_access(request)
        return self.build_response(request, object_list, **kwargs)

    def get_autocomplete(self, request, **kwargs):
        query = request.GET.get('q', None)
        if not query:
            raise HttpBadRequest('Please supply the search parameter q')

        # Do the autocomplete query.
        results = (SearchQuerySet().using('core')
                                   .models(DataSet)
                                   .autocomplete(content_auto=query))
        
        # logger.debug('')

        if not results:
            results = EmptySearchQuerySet()

        paginator = Paginator(results, 5)

        page = request.GET.get('page', 1)
        try: 
            current_results = paginator.page(page)
        except PageNotAnInteger:
            # If page is not an integer, deliver first page.
            current_reuslts = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g. 9999), deliver last page of results.
            current_results = paginator.page(paginator.num_pages)

        result_list = map(lambda r: r.object, current_results.object_list)
        bundle = self.build_res_list_bundle(request, result_list, **kwargs)
        object_list = self.build_object_list(bundle, **kwargs)
        
        self.log_throttled_access(request)
        return self.build_response(request, object_list, **kwargs)


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
        return {
            'total': total, 'public': public, \
            'private': private, 'private_shared': private_shared
        }

    class Meta:
        resource_name = 'statistics'
        object_class = ResourceStatisticsObject 

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
        
        return [ResourceStatisticsObject(
            user_count, group_count, files_count, \
            dataset_summary, workflow_summary, project_summary)]


class SharablePermission(object):
    def __init__(self, res_type, perm_obj):
        self.res_type = res_type
        self.perm_obj = perm_obj

    def get_res(self, res_uuid):
        res_list = self.res_type.objects.filter(uuid=res_uuid)
        return None if len(res_list) == 0 else res_list[0]

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    # Permissions that a res has for all the groups that the user is in.
    def get_share_list(self, user, res):
        group_dict = {} 
        group_list = Group.objects.all()

        groups_in = filter(lambda g: user in g.user_set.all(), group_list)
        
        # Set everything to False as default first before changing accoridngly. 
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
    
    # Complete permission objects for the groups that the resource is in.
    def perm_obj_list(self, user, res):
        return map(
            lambda s:
                self.perm_obj(
                    res.uuid, res.name, s['id'], s['name'], s['permissions']),
                self.get_share_list(user, res))

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}

        if isinstance(bundle_or_obj, Bundle):
            kwargs['pk'] = bundle_or_obj.obj.res_uuid + '_' + \
                str(bundle_or_obj.obj.group_id)
        else:
            kwargs['pk'] = bundle_or_obj.res_uuid + '_' + \
                str(bundle_or_obj.group_id)

        return kwargs

    def obj_get(self, bundle, **kwargs):
        user = bundle.request.user
        # args 0 = res uuid, 1 = group id.
        args = kwargs['pk'].split('_', 1)
        res = self.get_res(args[0])
        group = self.get_group(int(args[1]))
        share_list = self.get_share_list(user, res)
        # If the res is not shared with group, the res's get_groups function
        # doesn't display the group. Which is why we need default values here.
        perm = {'read': False, 'change': False}
        
        perm_list = filter(lambda s: s['id'] == group.id, share_list)

        if len(perm_list) != 0:
            perm = perm_list[0]['permissions']

        return self.perm_obj(res.uuid, res.name, group.id, group.name, perm)

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def get_object_list(self, request):
        user = request.user
        # Return result for 1 res, or for all res that user owns.
        if 'uuid' in request.GET:
            res = self.get_res(request.GET['uuid'])
            return self.perm_obj_list(user, res)
        else:
            res_list = filter(
                lambda r: r.get_owner().id == user.id,
                self.res_type.objects.all())
            sum_list = []
            
            for i in res_list:
                sum_list = sum_list + self.perm_obj_list(user, i)
          
            return sum_list

    def obj_update(self, bundle, **kwargs):
        res = self.get_res(bundle.data['res_uuid'])
        group = self.get_group(bundle.data['group_id'])
        can_read = bundle.data['read']
        can_change = bundle.data['change']
        should_share = can_read or can_change
        is_read_only = can_read and not can_change

        if should_share:
            res.share(group, is_read_only)
        else:
            res.unshare(group)

        return self.perm_obj()
    
    def obj_delete(self, bundle, **kwargs):
        args = kwargs['pk'].split('_', 1)
        res = self.get_res(args[0])
        group = self.get_group(int(args[1]))
        res.unshare(group)


class ProjectSharingResource(SharablePermission, Resource):
    res_name = fields.CharField(attribute='res_name', null=True)
    res_uuid = fields.CharField(attribute='res_uuid', null=True)
    group_id = fields.IntegerField(attribute='group_id', null=True)
    group_name = fields.CharField(attribute='group_name', null=True)
    permissions = fields.DictField(attribute='permissions', null=True)

    def __init__(self):
        SharablePermission.__init__(self, Project, ProjectSharingObject)
        Resource.__init__(self)

    class Meta:
        resource_name = 'project_sharing'
        object_class = ProjectSharingObject
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()

    # Overriden because this "convenience" method wasn't being convenient.
    def get_bundle_detail_data(self, bundle):
        return bundle.obj.res_uuid


class DataSetSharingResource(SharablePermission, Resource):
    res_name = fields.CharField(attribute='res_name', null=True)
    res_uuid = fields.CharField(attribute='res_uuid', null=True)
    group_id = fields.IntegerField(attribute='group_id', null=True)
    group_name = fields.CharField(attribute='group_name', null=True)
    permissions = fields.DictField(attribute='permissions', null=True)

    def __init__(self):
        SharablePermission.__init__(self, DataSet, DataSetSharingObject)
        Resource.__init__(self)

    class Meta:
        resource_name = 'dataset_sharing'
        object_class = DataSetSharingObject
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()

    def get_bundle_detail_data(self, bundle):
        return bundle.obj.res_uuid


class WorkflowSharingResource(SharablePermission, Resource):
    res_name = fields.CharField(attribute='res_name', null=True)
    res_uuid = fields.CharField(attribute='res_uuid', null=True)
    group_id = fields.IntegerField(attribute='group_id', null=True)
    group_name = fields.CharField(attribute='group_name', null=True)
    permissions = fields.DictField(attribute='permissions', null=True)
    
    def __init__(self):
        SharablePermission.__init__(self, Workflow, WorkflowSharingObject)
        Resource.__init__(self)

    class Meta:
        resource_name = 'workflow_sharing'
        object_class = WorkflowSharingObject
        authentication = SessionAuthentication()
        authorization = GuardianAuthorization()
 
    def get_bundle_detail_data(self, bundle):
        return bundle.obj.res_uuid       


class MemberManagementResource(Resource):
    member_list = fields.ListField(attribute='member_list', null=True)

    # Assume that groups only exist in Group-Manager pairs. 
    def is_manager_group(self, group):
        return group.extendedgroup.manager_group is None 

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def get_members(self, group):
        user_list = group.user_set.all()
        return map(lambda u: {'username': u.username, 'id': u.id}, user_list)

    class Meta:
        resource_name = 'member_management'
        object_class = MemberManagementObject
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
        return [MemberManagementObject(group.id, self.get_members(group))]

    def obj_update(self, bundle, **kwargs):
        id = kwargs['pk']
        group = self.get_group(id)
        user = bundle.request.user
        member_list = bundle.data['member_list']
        is_manager = self.is_manager_group(group)

        """
        # Verify that the user has is in the manager group
        if is_manager:
            if user not in group.user_set.all():
                # raise ImmediateHttpResponse(response=HttpUnauthorized)
        else:
            if user not in group.extendedgroup.manager_group.user_set.all():
                # raise ImmediateHttpResponse(response=HttpUnauthorized)
        """

        # Remove all objects before readding them.
        group.user_set.clear() 

        for m in member_list:
            group.user_set.add(m['id'])

        # Managers should also be in the group that they manage.
        if is_manager:
            for g in group.extendedgroup.managed_group.all():
                for m in member_list:
                    g.user_set.add(m['id'])

        return MemberManagementResource()


class GroupManagementResource(Resource):
    group_id = fields.IntegerField(attribute='group_id', null=True)
    group_name = fields.CharField(attribute='group_name', null=True)
    
    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    class Meta:
        resource_name = 'group_management'
        object_class = GroupManagementObject
        # authentication = SessionAuthentication

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}
        
        if isinstance(bundle_or_obj, Bundle):
            kwargs['pk'] = bundle_or_obj.obj.group_id
        else:
            kwargs['pk'] = bundle_or_obj.group_id

        return kwargs

    def obj_get(self, bundle, **kwargs):
        group = self.get_group(kwargs['pk'])
        return GroupManagementObject(group.id, group.name)
        # return group_list

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request);

    def get_object_list(self, request):
        user = request.user

        group_list = map(
            lambda g: GroupManagementObject(g.id, g.name),
            user.groups.all())

        return group_list

    def obj_update(self, bundle, **kwargs):
        return self.obj_create(bundle, **kwargs)

    def obj_create(self, bundle, **kwargs):
        new_name = bundle.data['name']
        # create group here and be sure to assign the manager group stuff
        return bundle

    def obj_delete(self, bundle, **kwargs):
        user = bundle.request.user
        logger.info(bundle.data)
