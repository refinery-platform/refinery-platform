'''
Created on May 4, 2012

@author: nils
'''

import ast
from datetime import timedelta
import json
import logging
from sets import Set
import uuid

from django.conf import settings
from django.conf.urls import url
from django.contrib.auth.models import Group, User
from django.contrib.contenttypes.models import ContentType
from django.contrib.sites.models import get_current_site
from django.core.cache import cache
from django.core.mail import EmailMessage
from django.core.signing import Signer
from django.forms import ValidationError
from django.template import loader
from django.utils import timezone

from constants import UUID_RE
from guardian.models import GroupObjectPermission
from guardian.shortcuts import get_objects_for_group, get_objects_for_user
from guardian.utils import get_anonymous_user
from tastypie import fields
from tastypie.authentication import Authentication, SessionAuthentication
from tastypie.authorization import Authorization
from tastypie.bundle import Bundle
from tastypie.constants import ALL, ALL_WITH_RELATIONS
from tastypie.exceptions import ImmediateHttpResponse, NotFound
from tastypie.http import (HttpAccepted, HttpBadRequest, HttpCreated,
                           HttpForbidden, HttpGone, HttpMethodNotAllowed,
                           HttpNoContent, HttpNotFound, HttpUnauthorized)
from tastypie.resources import ModelResource, Resource
from tastypie.utils import trailing_slash

from core.models import (Analysis, DataSet, ExtendedGroup, GroupManagement,
                         Invitation, Project, ResourceStatistics, Tutorials,
                         UserAuthentication, UserProfile, Workflow)
from core.utils import (get_data_sets_annotations, get_resources_for_user,
                        which_default_read_perm)
from data_set_manager.api import (AssayResource, InvestigationResource,
                                  StudyResource)
from data_set_manager.models import Attribute, Node, Study
from file_store.models import FileStoreItem

logger = logging.getLogger(__name__)
signer = Signer()


# Specifically made for descendants of SharableResource.
class SharableResourceAPIInterface(object):

    def __init__(self, res_type):
        self.res_type = res_type

    # Useful getter methods that process data.

    def get_res(self, res_uuid):
        res_list = self.res_type.objects.filter(uuid=res_uuid)
        return None if len(res_list) == 0 else res_list[0]

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def is_manager_group(self, group):
        return not group.extendedgroup.is_managed()

    def get_perms(self, res, group):
        # Default values.
        perms = {'read': False, 'change': False}
        if self.res_type._meta.verbose_name == 'dataset':
            perms['read_meta'] = False

        # Find matching ones if available.
        for i in res.get_groups():
            if i['group'].group_ptr.id == group.id:
                perms = {'read': i['read'], 'change': i['change']}
                if self.res_type._meta.verbose_name == 'dataset':
                    perms['read_meta'] = i['read_meta']

        return perms

    def get_share_list(self, user, res):
        # Handle anonymousUsers seperatly due to request.users
        # SimpleLazyObjects loading Users vs AnonymousUsers. Can't compare
        # SLO-AnonymousUsers directly with user models
        if user.is_anonymous():
            user = get_anonymous_user()

        groups_in = filter(
            lambda g:
            not self.is_manager_group(g) and user in g.user_set.all(),
            Group.objects.all())

        return map(
            lambda g: {
                'group_id': g.id,
                'group_name': g.name,
                'group_uuid': g.extendedgroup.uuid,
                'perms': self.get_perms(res, g)},
            groups_in)

    def groups_with_user(self, user):
        return filter(lambda g: user in g.user_set.all(), Group.objects.all())

    # Generalizes bundle construction and resource processing. Turning on more
    # options may require going to the SharableResource class and adding them.

    # Apply filters.
    def query_filtering(self, res_list, get_params):
        for param in get_params:
            # Skip if res does not have the attribute. Done to help avoid
            # whatever internal filtering can be performed on other things,
            # like limiting the return amount.
            res_list = [
                item for item in res_list
                if not hasattr(item, param) or
                str(getattr(item, param)) == get_params[param]
            ]

        return res_list

    def _build_res_list(self, user):
        return get_resources_for_user(user, self.res_type._meta.verbose_name)

    # Turns on certain things depending on flags
    def transform_res_list(self, user, res_list, request, **kwargs):

        try:
            user_uuid = user.profile.uuid
        except AttributeError:
            logger.error("User: %s's profile or UUID not available.",
                         user.username)
            user_uuid = None

        # Try and retrieve a cached resource based on model name
        # provide uniqueness between cached resources w/
        # res_list_unique
        try:
            res_list_unique = res_list.model.__name__
        except AttributeError as e:
            logger.error(
                'Res_list doesn\'t seem to have a model name. Error: %s', e
            )
            res_list_unique = None

        cache_check = None
        if res_list_unique is not None:
            try:
                cache_check = cache.get('{}-{}'.format(
                    user.id, res_list_unique))
            except Exception as e:
                logger.error(
                    'Something went wrong with retrieving the cached res_list.'
                    ' Error: %s', e
                )

        if cache_check is None:
            owned_res_set = Set(
                get_objects_for_user(
                    user,
                    'core.share_%s' %
                    self.res_type._meta.verbose_name).values_list("id",
                                                                  flat=True))

            public_res_set = Set(
                get_objects_for_group(
                    ExtendedGroup.objects.public_group(),
                    which_default_read_perm(self.res_type._meta.verbose_name)
                ).values_list("id", flat=True))

            # Get content type, needed to map Guardian group permission.
            content_type = ContentType.objects.get(model='dataset')

            shared_res_dict = {res.id: GroupObjectPermission.objects.filter(
                content_type_id=content_type.id,
                object_pk=res.id
            ).count() for res in res_list}

            # instantiate owner and public fields
            for res in res_list:
                is_owner = res.id in owned_res_set
                setattr(res, 'is_owner', is_owner)
                owner = res.get_owner()
                setattr(
                    res,
                    'owner',
                    owner.profile.uuid if owner is not None else owner
                )
                setattr(
                    res,
                    'public',
                    True if res.id in public_res_set else False
                )
                setattr(
                    res,
                    'is_shared',
                    shared_res_dict[res.id] > 0
                )

                if 'sharing' in kwargs and kwargs['sharing']:
                    setattr(res, 'share_list', self.get_share_list(user, res))

            if user_uuid and res_list_unique:
                cache.add('{}-{}'.format(user.id, res_list_unique), res_list)
        else:
            res_list = cache_check

        # Filter for query flags.
        res_list = self.query_filtering(res_list, request.GET)

        return res_list

    def build_bundle_list(self, request, res_list, **kwargs):
        bundle_list = []

        for i in res_list:
            built_obj = self.build_bundle(obj=i, request=request)
            bundle_list.append(self.full_dehydrate(built_obj))

        return bundle_list

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
    def process_get(self, request, res, **kwargs):
        user = request.user
        mod_res_list = self.transform_res_list(user, [res], request, **kwargs)
        bundle = self.build_bundle_list(request, mod_res_list)[0]
        return self.build_response(request, bundle, **kwargs)

    def process_get_list(self, request, res_list, **kwargs):
        user = request.user
        mod_res_list = self.transform_res_list(
            user, res_list, request, **kwargs)
        bundle_list = self.build_bundle_list(request, mod_res_list, **kwargs)
        object_list = self.build_object_list(bundle_list, **kwargs)
        return self.build_response(request, object_list, **kwargs)

    # Overriding some ORM methods.

    # Handles POST requests.
    def obj_create(self, bundle, **kwargs):
        bundle = ModelResource.obj_create(self, bundle, **kwargs)
        bundle.obj.set_owner(bundle.request.user)
        return bundle

    # Some wacky custom job because ModelResource's get calls some things that
    # we don't want to get called :(
    def obj_get(self, bundle, **kwargs):
        res = self.get_res(kwargs['uuid'])

        request = bundle.request
        user = request.user

        if not res:
            return HttpBadRequest()

        # User not authenticated, res is not public.
        if not user.is_authenticated() and res and not res.is_public():
            return HttpUnauthorized()

        mod_res_list = self.transform_res_list(user, [res], request, **kwargs)
        bundle = self.build_bundle_list(request, mod_res_list)[0]
        return bundle.obj

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def get_object_list(self, request):
        user = request.user
        obj_list = self._build_res_list(user)
        r_list = self.transform_res_list(user, obj_list, request)
        return r_list

    # A few default URL endpoints as directed by prepend_urls in subclasses.

    def prepend_urls(self):
        return [
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/sharing/$' %
                (self._meta.resource_name, UUID_RE),
                self.wrap_view('res_sharing'),
                name='api_%s_sharing' % (self._meta.resource_name)),
            url(r'^(?P<resource_name>%s)/sharing/$' %
                (self._meta.resource_name),
                self.wrap_view('res_sharing_list'),
                name='api_%s_sharing_list' % (self._meta.resource_name)),
        ]

    # TODO: Make sure GuardianAuthorization works.
    def res_sharing(self, request, **kwargs):
        res = self.get_res(kwargs['uuid'])
        user = request.user

        if not res:
            return HttpBadRequest()
        # if user is not logged in then data set must be public
        if not user.is_authenticated() and not res.is_public():
            return HttpUnauthorized()

        if request.method == 'GET':
            # user has read permissions
            if not user.has_perm('core.read_meta_dataset', res):
                return HttpUnauthorized()
            kwargs['sharing'] = True
            mod_res = self.transform_res_list(user, [res], request, **kwargs)

            if request.user.has_perm('core.change_dataset', res):
                user_perms = 'change'
            elif request.user.has_perm('core.read_dataset', res):
                user_perms = 'read'
            elif request.user.has_perm('core.read_meta_dataset', res):
                user_perms = 'read_meta'
            else:
                user_perms = 'none'

            perm_obj = {
                'owner': mod_res[0].owner,
                'is_owner': mod_res[0].is_owner,
                'share_list': mod_res[0].share_list,
                'user_perms': user_perms
            }
            return self.build_response(request, perm_obj, **kwargs)
        elif request.method == 'PUT':
            # user must be admin or owner
            if not user.is_superuser and user != res.get_owner():
                return HttpUnauthorized()
            data = json.loads(request.body)
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

                # datasets handled seperate due to object-level perm
                if self.res_type._meta.verbose_name == 'dataset':
                    is_read_meta_only = False
                    if not should_share and i['read_meta']:  # read_meta only
                        is_read_meta_only = i['read_meta']
                        should_share = is_read_meta_only
                    if should_share:  # read, read_meta, or change
                        res.share(group, is_read_only, is_read_meta_only)
                elif should_share:
                    res.share(group, is_read_only)

            return HttpAccepted()
        else:
            return HttpMethodNotAllowed()

    def res_sharing_list(self, request, **kwargs):
        if request.method == 'GET':
            kwargs['sharing'] = True
            res_list = self._build_res_list(request.user)
            return self.process_get_list(request, res_list, **kwargs)
        return HttpMethodNotAllowed()


class ProjectResource(ModelResource, SharableResourceAPIInterface):
    share_list = fields.ListField(attribute='share_list', null=True)
    public = fields.BooleanField(attribute='public', null=True)
    is_owner = fields.BooleanField(attribute='is_owner', null=True)

    def __init__(self):
        SharableResourceAPIInterface.__init__(self, Project)
        ModelResource.__init__(self)

    class Meta:
        # authentication = ApiKeyAuthentication()
        queryset = Project.objects.filter(is_catch_all=False)
        resource_name = 'projects'
        detail_uri_name = 'uuid'
        fields = ['name', 'id', 'uuid', 'summary']
        # authentication = SessionAuthentication()
        # authorization = GuardianAuthorization()
        authorization = Authorization()

    def prepend_urls(self):
        return SharableResourceAPIInterface.prepend_urls(self)

    def res_sharing_list(self, request, **kwargs):
        if request.method == 'GET':
            kwargs['sharing'] = True
            res_list = filter(
                lambda r: not r.is_catch_all,
                self._build_res_list(request.user)
            )
            return self.process_get_list(request, res_list, **kwargs)
        return HttpMethodNotAllowed()

    def obj_create(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_create(self, bundle, **kwargs)

    def obj_get(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_get(self, bundle, **kwargs)

    def obj_get_list(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_get_list(
            self, bundle, **kwargs)

    def get_object_list(self, request):
        obj_list = SharableResourceAPIInterface.get_object_list(self, request)
        return filter(lambda o: not o.is_catch_all, obj_list)


class UserResource(ModelResource):
    class Meta:
        queryset = User.objects.all()
        allowed_methods = ['get']
        excludes = ('is_active', 'is_staff', 'is_superuser', 'last_login',
                    'password', 'date_joined')


class UserProfileResource(ModelResource):
    user = fields.ForeignKey(UserResource, 'user', full=True)

    class Meta:
        queryset = UserProfile.objects.all()
        allowed_methods = ['get', 'put']
        detail_uri_name = 'uuid'
        resource_name = 'users'
        authentication = Authentication()
        authorization = Authorization()

    # Handle PUT requests for updating a User's tutorial views
    def obj_update(self, bundle, **kwargs):
        try:
            userprofile = UserProfile.objects.get(uuid=kwargs[u'uuid'])
            user = userprofile.user
        except (UserProfile.DoesNotExist,
                UserProfile.MultipleObjectsReturned) as e:
            logger.error("Could not fetch UserProfile: %s", e)
            return HttpNoContent

        # User not authenticated
        if not user.is_authenticated():
            return HttpUnauthorized()

        try:
            t = Tutorials.objects.get(user_profile=userprofile)
        except (Tutorials.DoesNotExist,
                Tutorials.MultipleObjectsReturned) as e:
            logger.error("Could not fetch Tutorial: %s", e)
            return HttpNoContent

        # Update User's Tutorials based on payload received
        if bundle.data["collab_viewed"]:
            t.collaboration_tutorial_viewed = bundle.data["collab_viewed"]
        if bundle.data["launchpad_viewed"]:
            t.launchpad_tutorial_viewed = bundle.data["launchpad_viewed"]
        if bundle.data["upload_viewed"]:
            t.data_upload_tutorial_viewed = bundle.data["upload_viewed"]

        t.save()

        return HttpAccepted


class DataSetResource(SharableResourceAPIInterface, ModelResource):
    id_regex = '[0-9]+'
    share_list = fields.ListField(attribute='share_list', null=True)
    public = fields.BooleanField(attribute='public', null=True)
    is_owner = fields.BooleanField(attribute='is_owner', null=True)
    owner = fields.CharField(attribute='owner', null=True)
    is_shared = fields.BooleanField(attribute='is_shared', null=True)
    file_size = fields.IntegerField(attribute='file_size')

    def __init__(self):
        SharableResourceAPIInterface.__init__(self, DataSet)
        ModelResource.__init__(self)

    class Meta:
        queryset = DataSet.objects.all()
        detail_uri_name = 'uuid'  # for using UUIDs instead of pk in URIs
        # allowed_methods = ['get']
        resource_name = 'data_sets'
        # authentication = SessionAuthentication()
        # authorization = GuardianAuthorization()
        filtering = {
            'uuid': ALL,
            'is_owner': ALL,
            'public': ALL
        }

    def dehydrate(self, bundle):
        if not bundle.data['owner']:
            owner = bundle.obj.get_owner()
            try:
                bundle.data['owner'] = owner.profile.uuid
            except:
                pass

        metadata_file_store_item = \
            bundle.obj.get_metadata_as_file_store_item()

        if bundle.obj.is_isatab_based:
            bundle.data["isa_archive"] = metadata_file_store_item.uuid
            bundle.data["isa_archive_url"] = \
                metadata_file_store_item.get_datafile_url()
        else:
            bundle.data["pre_isa_archive"] = metadata_file_store_item.uuid

        analyses = []
        for analysis in bundle.obj.get_analyses():
            analysis_dict = {}
            analysis_dict["uuid"] = analysis.uuid
            analysis_dict["name"] = analysis.name
            analysis_dict["status"] = analysis.status
            analysis_dict['is_owner'] = False
            owner = analysis.get_owner()
            if owner:
                try:
                    analysis_dict['owner'] = owner.profile.uuid
                    user = bundle.request.user
                    if (hasattr(user, 'profile') and
                       user.profile.uuid == analysis_dict['owner']):
                        analysis_dict['is_owner'] = True
                except:
                    analysis_dict['owner'] = None

            else:
                analysis_dict['owner'] = None

            analyses.append(analysis_dict)

        investigation_link = bundle.obj.get_latest_investigation_link()

        bundle.data["analyses"] = analyses
        bundle.data["creation_date"] = bundle.obj.creation_date
        bundle.data["date"] = investigation_link.date
        bundle.data["modification_date"] = bundle.obj.modification_date
        bundle.data["version"] = investigation_link.version

        return bundle

    def apply_sorting(self, obj_list, options=None):
        """Manually sorting the list of objects returned by
        `SharableResourceAPIInterface`. Ordering is being triggered in the same
        way it normally is.

        Example:
        # Ascending
        /api/v1/resource/?order_by=attribute
        # Descending
        /api/v1/resource/?order_by=-attribute
        """
        if options and 'order_by' in options:
            if options['order_by'][0] == '-':
                reverse = True
                sorting = options['order_by'][1:]
            else:
                reverse = False
                sorting = options['order_by']
        else:
            # Default sorting
            sorting = 'modification_date'
            reverse = True

        obj_list.sort(
            key=lambda x: getattr(x, sorting),
            reverse=reverse
        )

        return obj_list

    def prepend_urls(self):
        prepend_urls_list = SharableResourceAPIInterface.prepend_urls(self) + [
            url(r'^(?P<resource_name>%s)/ids%s$' % (
                    self._meta.resource_name,
                    trailing_slash()
                ),
                self.wrap_view('get_all_ids'),
                name='api_%s_get_all_ids' % (
                    self._meta.resource_name)
                ),
            url(r'^(?P<resource_name>%s)/annotations%s$' % (
                    self._meta.resource_name,
                    trailing_slash()
                ),
                self.wrap_view('get_all_annotations'),
                name='api_%s_get_all_annotations' % (
                    self._meta.resource_name)
                ),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/investigation%s$' % (
                    self._meta.resource_name,
                    UUID_RE,
                    trailing_slash()
                ),
                self.wrap_view('get_investigation'),
                name='api_%s_get_investigation' % (
                    self._meta.resource_name)
                ),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/studies%s$' % (
                    self._meta.resource_name,
                    UUID_RE,
                    trailing_slash()
                ),
                self.wrap_view('get_studies'),
                name='api_%s_get_studies' % (
                    self._meta.resource_name
                )),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/assays%s$' % (
                    self._meta.resource_name,
                    UUID_RE,
                    trailing_slash()
                ),
                self.wrap_view('get_assays'),
                name='api_%s_get_studies' % (
                    self._meta.resource_name
                )),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/analyses%s$' % (
                    self._meta.resource_name,
                    UUID_RE,
                    trailing_slash()
                ),
                self.wrap_view('get_analyses'),
                name='api_%s_get_analyses' % (
                    self._meta.resource_name
                )),
            url(r'^(?P<resource_name>%s)/(?P<uuid>%s)/studies/'
                r'(?P<study_uuid>%s)/assays%s$' % (
                    self._meta.resource_name,
                    UUID_RE,
                    UUID_RE,
                    trailing_slash()
                ),
                self.wrap_view('get_study_assays'),
                name='api_%s_get_assays' % (
                    self._meta.resource_name
                )),
            url(r'^(?P<resource_name>%s)/(?P<id>%s)%s$' % (
                    self._meta.resource_name,
                    self.id_regex,
                    trailing_slash()
                ),
                self.wrap_view('get_by_db_id'),
                name='api_%s_get_by_db_id' % (
                    self._meta.resource_name)
                ),
        ]
        return prepend_urls_list

    def filter_by_group(self, request, obj_list):
        if 'group' in request.GET:
            try:
                group = ExtendedGroup.objects.get(
                    id=request.GET['group']
                )
            except Exception:
                group = None

            if group:
                obj_list = list(get_objects_for_group(
                    group, 'core.read_meta_dataset'
                ))

        return obj_list

    def obj_get(self, bundle, **kwargs):
        try:
            dataset = DataSet.objects.get(uuid=kwargs["uuid"])
        except (DataSet.DoesNotExist, DataSet.MultipleObjectsReturned) as e:
            logger.error("Couldn't properly fetch DataSet with UUID: %s %s",
                         kwargs["uuid"], e)
            raise NotFound(e)

        if not dataset.is_valid():
            raise NotFound(
                "DataSet with UUID: {} is invalid, and most likely is "
                "still being created".format(dataset.uuid)
            )
        return super(DataSetResource, self).obj_get(bundle, **kwargs)

    def obj_get_list(self, bundle, **kwargs):
        datasets = super(DataSetResource, self).obj_get_list(bundle, **kwargs)

        valid_datasets = []
        for dataset in datasets:
            if dataset.is_valid():
                valid_datasets.append(dataset)
            else:
                logger.error(
                    "DataSet with UUID: {} is invalid, and most likely is "
                    "still being created".format(dataset.uuid)
                )
        return valid_datasets

    def get_object_list(self, request):
        obj_list = SharableResourceAPIInterface.get_object_list(self, request)
        obj_list = self.filter_by_group(request, obj_list)
        return obj_list

    def obj_create(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_create(self, bundle, **kwargs)

    def get_all_ids(self, request, **kwargs):
        data_sets = get_objects_for_user(request.user,
                                         'core.read_meta_dataset')
        return self.create_response(
            request,
            {
                'ids': [data_set.id for data_set in data_sets]
            }
        )

    def get_by_db_id(self, request, **kwargs):
        return_obj = {}

        try:
            ds = DataSet.objects.get(id=kwargs['id'])
        except DataSet.DoesNotExist:
            return HttpNoContent()

        groups = GroupObjectPermission.objects.filter(object_pk=ds.id)

        is_public = False
        for group in groups:
            if group.group == ExtendedGroup.objects.public_group():
                is_public = True

        is_owner = request.user.has_perm(
            'core.share_dataset', ds
        )

        try:
            user_uuid = request.user.profile.uuid
        except:
            user_uuid = None

        if ds and request.user.has_perm('core.read_meta_dataset', ds):
            return_obj['accession'] = ds.accession
            return_obj['accession_source'] = ds.accession_source
            return_obj['creation_date'] = ds.creation_date
            return_obj['description'] = ds.description
            return_obj['file_count'] = ds.file_count
            return_obj['file_size'] = ds.file_size
            return_obj['id'] = ds.id
            return_obj['is_owner'] = is_owner
            return_obj['is_shared'] = groups.count() > 0
            return_obj['modification_date'] = ds.modification_date
            return_obj['name'] = ds.name
            return_obj['owner'] = user_uuid if is_owner else None
            return_obj['public'] = is_public
            return_obj['share_list'] = None
            return_obj['slug'] = ds.slug
            return_obj['summary'] = ds.summary
            return_obj['title'] = ds.title
            return_obj['uuid'] = ds.uuid
        else:
            return HttpForbidden()

        return self.create_response(request, return_obj)

    def get_all_annotations(self, request, **kwargs):
        return self.create_response(request, get_data_sets_annotations())

    def get_investigation(self, request, **kwargs):
        try:
            data_set = DataSet.objects.get(uuid=kwargs['uuid'])
        except (DataSet.DoesNotExist,
                DataSet.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpGone()

        # Assuming 1 to 1 relationship between DataSet and Investigation
        return InvestigationResource().get_detail(
            request,
            uuid=data_set.get_investigation().uuid
        )

    def get_studies(self, request, **kwargs):
        try:
            data_set = DataSet.objects.get(uuid=kwargs['uuid'])
        except (DataSet.DoesNotExist,
                DataSet.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpGone()

        return StudyResource().get_list(
            request=request,
            investigation_uuid=data_set.get_investigation().uuid
        )

    def get_assays(self, request, **kwargs):
        try:
            data_set = DataSet.objects.get(uuid=kwargs['uuid'])
            assays = data_set.get_assays()
        except (DataSet.DoesNotExist,
                DataSet.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpGone()

        # Unfortunately Tastypie doesn't allow `get_list` to run on a list of
        # identifiers.
        return self.create_response(
            request,
            {
                'meta': {
                    'total_count': len(assays)
                },
                'objects': [
                    {
                        'id': assay.id,
                        'uuid': assay.uuid,
                        'technology': assay.technology,
                        'measurement': assay.measurement
                    } for assay in assays
                ]
            }
        )

    def get_analyses(self, request, **kwargs):
        try:
            DataSet.objects.get(uuid=kwargs['uuid'])
        except (DataSet.DoesNotExist,
                DataSet.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpGone()

        return AnalysisResource().get_list(
            request=request,
            data_set__uuid=kwargs['uuid']
        )

    def get_study_assays(self, request, **kwargs):
        try:
            DataSet.objects.get(uuid=kwargs['uuid'])
        except (DataSet.DoesNotExist,
                DataSet.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpGone()

        try:
            Study.objects.get(uuid=kwargs['study_uuid'])
        except (Study.DoesNotExist,
                Study.MultipleObjectsReturned) as e:
            logger.error(e)
            return HttpGone()

        return AssayResource().get_list(
            request=request,
            study_uuid=kwargs['study_uuid']
        )


class WorkflowResource(ModelResource, SharableResourceAPIInterface):
    share_list = fields.ListField(attribute='share_list', null=True)
    public = fields.BooleanField(attribute='public', null=True)
    is_owner = fields.BooleanField(attribute='is_owner', null=True)
    is_active = fields.BooleanField(attribute='is_active', null=True)

    def __init__(self):
        SharableResourceAPIInterface.__init__(self, Workflow)
        ModelResource.__init__(self)

    class Meta:
        queryset = Workflow.objects.filter(is_active=True).order_by('name')
        detail_resource_name = 'workflow'
        resource_name = 'workflow'
        detail_uri_name = 'uuid'
        allowed_methods = ['get', 'patch']
        fields = ['name', 'uuid', 'summary', 'is_active']
        # authentication = SessionAuthentication()
        # authorization = GuardianAuthorization()

    def apply_sorting(self, obj_list, options=None):
        """Same as dataSet sorting
        """
        if options and 'order_by' in options:
            if options['order_by'][0] == '-':
                reverse = True
                sorting = options['order_by'][1:]
            else:
                reverse = False
                sorting = options['order_by']
        else:
            # Default sorting
            sorting = 'name'
            reverse = False

        obj_list.sort(
            key=lambda x: getattr(x, sorting),
            reverse=reverse
        )

        return obj_list

    def prepend_urls(self):
        return SharableResourceAPIInterface.prepend_urls(self)

    def obj_get(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_get(self, bundle, **kwargs)

    def obj_get_list(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_get_list(
            self, bundle, **kwargs)

    def get_object_list(self, request):
        obj_list = SharableResourceAPIInterface.get_object_list(self, request)
        return filter(lambda o: o.is_active, obj_list)

    def obj_create(self, bundle, **kwargs):
        return SharableResourceAPIInterface.obj_create(self, bundle, **kwargs)

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


class AnalysisResource(ModelResource):
    data_set = fields.ToOneField(DataSetResource, 'data_set', use_in='all')
    uuid = fields.CharField(attribute='uuid', use_in='all')
    name = fields.CharField(attribute='name', use_in='all')
    data_set__uuid = fields.CharField(attribute='data_set__uuid', use_in='all')
    workflow__uuid = fields.CharField(attribute='workflow__uuid', use_in='all')
    creation_date = fields.CharField(attribute='creation_date', use_in='all')
    modification_date = fields.CharField(
        attribute='modification_date',
        use_in='all'
    )
    workflow_steps_num = fields.IntegerField(
        attribute='workflow_steps_num', blank=True, null=True, use_in='all')
    workflow_copy = fields.CharField(
        attribute='workflow_copy', blank=True, null=True, use_in='all')
    history_id = fields.CharField(
        attribute='history_id', blank=True, null=True, use_in='all')
    workflow_galaxy_id = fields.CharField(
        attribute='workflow_galaxy_id', blank=True, null=True, use_in='all')
    library_id = fields.CharField(
        attribute='library_id', blank=True, null=True, use_in='all')
    time_start = fields.DateTimeField(
        attribute='time_start', blank=True, null=True, use_in='all')
    time_end = fields.DateTimeField(
        attribute='time_end', blank=True, null=True, use_in='all')
    status = fields.CharField(
        attribute='status', default=Analysis.INITIALIZED_STATUS, blank=True,
        null=True, use_in='all')

    class Meta:
        queryset = Analysis.objects.all()
        resource_name = Analysis._meta.model_name
        detail_uri_name = 'uuid'  # for using UUIDs instead of pk in URIs
        # required for public data set access by anonymous users
        authentication = Authentication()
        authorization = Authorization()
        allowed_methods = ["get"]
        fields = [
            'data_set', 'data_set__uuid', 'creation_date',
            'modification_date', 'history_id', 'library_id', 'name',
            'workflow__uuid', 'resource_uri', 'status', 'time_end',
            'time_start', 'uuid', 'workflow_galaxy_id', 'workflow_steps_num',
            'workflow_copy', 'owner', 'is_owner',
            'facet_name'
        ]

        filtering = {
            'data_set': ALL_WITH_RELATIONS,
            'workflow_steps_num': ALL_WITH_RELATIONS,
            'data_set__uuid': ALL,
            'status': ALL,
            'uuid': ALL
        }
        ordering = ['name', 'creation_date', 'time_start', 'time_end']

    def dehydrate(self, bundle):
        bundle.data['facet_name'] = bundle.obj.facet_name()

        # owner
        bundle.data['is_owner'] = False
        owner = bundle.obj.get_owner()
        if owner:
            try:
                bundle.data['owner'] = owner.profile.uuid
                user = bundle.request.user
                if (hasattr(user, 'profile') and
                        user.profile.uuid == bundle.data['owner']):
                    bundle.data['is_owner'] = True
            except:
                bundle.data['owner'] = None
        else:
            bundle.data['owner'] = None

        workflow_dict = None
        try:
            workflow_dict = ast.literal_eval(bundle.data['workflow_copy'])
        except ValueError, exc:
            # TODO: Remove this and just let any errors bubble up.
            # I don't think I should do that at this moment because
            # I shouldn't make production any fussier about values
            # in DB than it is right now.
            logger.warn(
                '%s: Cannot parse workflow as python repr: %s',
                exc, bundle.data['workflow_copy']
            )
        if workflow_dict:
            workflow_json = json.dumps(workflow_dict)
            bundle.data['workflow_json'] = workflow_json

        return bundle

    def get_object_list(self, request, **kwargs):
        user = request.user
        perm = 'read_meta_%s' % DataSet._meta.model_name
        if (user.is_authenticated()):
            allowed_datasets = get_objects_for_user(user, perm, DataSet)
        else:
            allowed_datasets = get_objects_for_group(
                ExtendedGroup.objects.public_group(), perm, DataSet
            )

        return Analysis.objects.filter(
            data_set__in=allowed_datasets.values_list("id", flat=True)
        )

    def alter_list_data_to_serialize(self, request, data):
        if request.GET.get('meta_only'):
            return {'meta': data['meta']}
        return data


class NodeResource(ModelResource):
    parents = fields.ToManyField('core.api.NodeResource', 'parents')
    study = fields.ToOneField('data_set_manager.api.StudyResource', 'study')
    assay = fields.ToOneField(
        'data_set_manager.api.AssayResource', 'assay', null=True
    )
    attributes = fields.ToManyField(
        'data_set_manager.api.AttributeResource',
        attribute=lambda bundle: (
            Attribute.objects
            .exclude(value__isnull=True)
            .exclude(value__exact='')
            .filter(
                node=bundle.obj,
                subtype='organism'
            )
        ),
        use_in='all',
        full=True,
        null=True
    )

    class Meta:
        queryset = Node.objects.all()
        resource_name = 'node'
        detail_uri_name = 'uuid'  # for using UUIDs instead of pk in URIs
        # required for public data set access by anonymous users
        authentication = Authentication()
        authorization = Authorization()
        allowed_methods = ["get"]
        fields = [
            'name', 'uuid', 'file_uuid', 'file_url', 'study', 'assay',
            'children', 'type', 'analysis_uuid', 'subanalysis', 'attributes'
        ]
        filtering = {
            'uuid': ALL,
            'study': ALL_WITH_RELATIONS,
            'assay': ALL_WITH_RELATIONS,
            'file_uuid': ALL,
            'type': ALL
        }
        limit = 0
        max_limit = 0

    def prepend_urls(self):
        return [
            url((r"^(?P<resource_name>%s)/(?P<uuid>" + UUID_RE + r")/$") %
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
            bundle.data['file_url'] = file_item.get_datafile_url()
            bundle.data['file_import_status'] = file_item.get_import_status()
        return bundle


class StatisticsResource(Resource):
    user = fields.IntegerField(attribute='user')
    group = fields.IntegerField(attribute='group')
    files = fields.IntegerField(attribute='files')
    dataset = fields.DictField(attribute='dataset')
    workflow = fields.DictField(attribute='workflow')
    project = fields.DictField(attribute='project')

    class Meta:
        resource_name = 'statistics'
        object_class = ResourceStatistics

    def stat_summary(self, model, unique_workflows=False):

        if not unique_workflows:
            model_list = model.objects.all()
        else:
            # Filter out inactive workflows
            model_list = model.objects.filter(is_active=True)

        total = len(model_list)

        public = len(filter(lambda x: x.is_public(), model_list))

        private_shared = len(filter(
            lambda x: not x.is_public() and len(x.get_groups()) > 1,
            model_list))

        private = total - public - private_shared
        return {
            'total': total, 'public': public,
            'private': private, 'private_shared': private_shared
        }

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
            workflow_summary = self.stat_summary(Workflow, True)
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

        return [ResourceStatistics(
            user_count, group_count, files_count,
            dataset_summary, workflow_summary, project_summary)]


class GroupManagementResource(Resource):
    group_id = fields.IntegerField(attribute='group_id', null=True)
    group_name = fields.CharField(attribute='group_name', null=True)
    member_list = fields.ListField(attribute='member_list', null=True)
    perm_list = fields.ListField(attribute='perm_list', null=True)
    can_edit = fields.BooleanField(attribute='can_edit', default=False)
    manager_group = fields.BooleanField(attribute='is_manager_group',
                                        default=False)
    manager_group_id = fields.IntegerField(attribute='manager_group_id',
                                           null=True)

    class Meta:
        resource_name = 'groups'
        object_class = GroupManagement
        detail_uri_name = 'group_id'
        authentication = SessionAuthentication()
        # authorization = GuardianAuthorization
        authorization = Authorization()

    def get_user(self, user_id):
        user_list = User.objects.filter(id=int(user_id))
        return None if len(user_list) == 0 else user_list[0]

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def groups_with_user(self, user):
        # Allow or disallow manager groups to show in queries.
        return filter(
            lambda g:
            not self.is_manager_group(g) and user in g.user_set.all(),
            Group.objects.all())

    def is_manager_group(self, group):
        return not group.extendedgroup.is_managed()

    # Removes the user from both the manager and user group.
    def full_remove(self, user, group):
        if self.is_manager_group(group):
            group.user_set.remove(user)

            for i in group.extendedgroup.managed_group.all():
                i.user_set.remove(user)
        else:
            group.user_set.remove(user)
            group.extendedgroup.manager_group.user_set.remove(user)

    def get_member_list(self, group):
        return map(
            lambda u: {
                'user_id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_manager': self.is_manager_group(group) and
                              u in group.user_set.all() or
                              not self.is_manager_group(group) and
                              u in
                              group.extendedgroup.manager_group.user_set.all()
            },
            group.user_set.all())

    # Group permissions against a single resource.
    def get_perms(self, res, group):
        # Default values.
        perms = {
            'uuid': res.uuid,
            'name': res.name,
            'type': res._meta.object_name,
            'read': False,
            'change': False
        }

        if self.res_type._meta.verbose_name == 'dataset':
            perms['read_meta'] = False

        # Find matching perms if available.
        for i in res.get_groups():
            if i['group'].group_ptr.id == group.id:
                perms['read'] = i['read']
                perms['change'] = i['change']
                if self.res_type._meta.verbose_name == 'dataset':
                    perms['read_meta'] = i['read_meta']

        return perms

    def get_perm_list(self, group):
        dataset_perms = filter(
            lambda r: r['read_meta'],
            map(lambda r: self.get_perms(r, group), DataSet.objects.all()))
        project_perms = filter(
            lambda r: r['read'],
            map(lambda r: self.get_perms(r, group), Project.objects.all()))
        workflow_perms = filter(
            lambda r: r['read'],
            map(lambda r: self.get_perms(r, group), Workflow.objects.all()))
        # workflow_engine_perms = map(f, WorkflowEngine.objects.all())
        # analysis_perms = map(f, Analysis.objects.all())
        # download_perms = map(f, Download.objects.all())
        return dataset_perms + project_perms + workflow_perms

    # Bundle building methods.

    # The group_list is actually a list of GroupManagement objects.
    def build_group_list(self, user, group_list, **kwargs):
        if 'members' in kwargs and kwargs['members']:
            for i in group_list:
                group = self.get_group(i.group_id)
                setattr(i, 'member_list', self.get_member_list(group))

        if 'perms' in kwargs and kwargs['perms']:
            for i in group_list:
                group = self.get_group(i.group_id)
                setattr(i, 'perm_list', self.get_perm_list(group))

        return group_list

    def build_bundle_list(self, request, group_list, **kwargs):
        bundle = []

        for i in group_list:
            built_obj = self.build_bundle(obj=i, request=request)
            bundle.append(self.full_dehydrate(built_obj))

        return bundle

    def build_object_list(self, bundle, **kwargs):
        return {
            'meta': {
                'total_count': len(bundle)
            },
            'objects': bundle
        }

    def build_response(self, request, object_list, **kwargs):
        return self.create_response(request, object_list)

    # Simplify things for GET requests.
    def process_get(self, request, group, **kwargs):
        user = request.user
        m_group_list = self.build_group_list(user, [group], **kwargs)
        bundle = self.build_bundle_list(request, m_group_list, **kwargs)[0]
        return self.build_response(request, bundle, **kwargs)

    def process_get_list(self, request, group_list, **kwargs):
        user = request.user
        m_group_list = self.build_group_list(user, group_list, **kwargs)
        bundle = self.build_bundle_list(request, m_group_list, **kwargs)
        object_list = self.build_object_list(bundle, **kwargs)
        return self.build_response(request, object_list, **kwargs)

    # This implies that users just have to be in the manager group, not
    # necessarily in the group itself.
    def user_authorized(self, user, group):
        user_set = group.user_set \
            if self.is_manager_group(group) \
            else group.extendedgroup.manager_group.user_set
        return user in user_set.all()

    # Endpoints for this resource.

    def detail_uri_kwargs(self, bundle_or_obj):
        return {
            'group_id': bundle_or_obj.obj.group_id
            if isinstance(bundle_or_obj, Bundle)
            else bundle_or_obj.group_id
        }

    def prepend_urls(self):
        return [
            url(r'^groups/(?P<id>[0-9]+)/$',
                self.wrap_view('group_basic'),
                name='api_group_basic'),
            url(r'^groups/$',
                self.wrap_view('group_basic_list'),
                name='api_group_basic_list'),
            url(r'^groups/(?P<id>[0-9]+)/members/$',
                self.wrap_view('group_members'),
                name='api_group_members'),
            url(r'^groups/(?P<id>[0-9]+)/members/(?P<user_id>[0-9])/$',
                self.wrap_view('group_members_detail'),
                name='api_group_members_detail'),
            url(r'^groups/members/$',
                self.wrap_view('group_members_list'),
                name='api_group_members_list'),
            url(r'^groups/(?P<id>[0-9]+)/perms/$',
                self.wrap_view('group_perms'),
                name='api_group_perms'),
            url(r'^groups/perms/$',
                self.wrap_view('group_perms_list'),
                name='api_group_perms_list'),
        ]

    def group_basic(self, request, **kwargs):
        user = request.user
        group = self.get_group(kwargs['id'])

        if not user.is_authenticated():
            return HttpUnauthorized()

        if request.method == 'GET':
            group_obj = GroupManagement(
                group.id,
                group.name,
                None,
                None,
                self.user_authorized(user, group),
                self.is_manager_group(group),
                group.id
                if self.is_manager_group(group)
                else group.extendedgroup.manager_group.id)
            return self.process_get(request, group_obj, **kwargs)
        elif request.method == 'DELETE':
            if not self.user_authorized(user, group):
                return HttpUnauthorized()

            # Cannot delete manager groups directly, must delete their managed
            # group, which causes manager group deletion.
            if self.is_manager_group(group):
                return HttpUnauthorized()

            group.delete()
            group.extendedgroup.manager_group.delete()
            return HttpNoContent()
        else:
            return HttpMethodNotAllowed()

    def group_basic_list(self, request, **kwargs):
        user = request.user

        if not user.is_authenticated():
            return HttpUnauthorized()

        if request.method == 'GET':
            group_list = self.groups_with_user(user)

            group_obj_list = map(
                lambda g: GroupManagement(
                    g.id,
                    g.name,
                    None,
                    None,
                    self.user_authorized(user, g),
                    self.is_manager_group(g),
                    g.id
                    if self.is_manager_group(g)
                    else g.extendedgroup.manager_group.id),
                group_list)

            return self.process_get_list(request, group_obj_list, **kwargs)
        elif request.method == 'POST':
            data = json.loads(request.body)
            new_group = ExtendedGroup(name=data['name'])
            new_group.save()
            new_group.group_ptr.user_set.add(user)
            new_group.manager_group.user_set.add(user)
            return HttpCreated()
        else:
            return HttpMethodNotAllowed()

    def group_members(self, request, **kwargs):
        user = request.user
        group = self.get_group(kwargs['id'])

        if request.method == 'GET':
            group_obj = GroupManagement(
                group.id,
                group.name,
                self.get_member_list(group),
                None,
                self.user_authorized(user, group),
                self.is_manager_group(group),
                group.id
                if self.is_manager_group(group)
                else group.extendedgroup.manager_group.id)
            kwargs['members'] = True
            return self.process_get(request, group_obj, **kwargs)
        elif request.method == 'PATCH':
            if not self.user_authorized(user, group):
                return HttpUnauthorized()

            data = json.loads(request.body)
            new_member_list = data['member_list']

            # Remove old members before updating.
            group.user_set.clear()

            for m in new_member_list:
                group.user_set.add(int(m['id']))

            # Managers should also be in groups they manage.
            if self.is_manager_group(group):
                for g in group.extendedgroup.managed_group.all():
                    for m in new_member_list:
                        g.user_set.add(int(m['id']))

            return HttpAccepted()
        elif request.method == 'POST':
            if not self.user_authorized(user, group):
                return HttpUnauthorized()

            data = json.loads(request.body)
            new_member = data['user_id']
            group.user_set.add(new_member)

            if self.is_manager_group(group):
                for g in group.extendedgroup.managed_group.all():
                    g.user_set.add(new_member)

            return HttpAccepted()
        else:
            return HttpMethodNotAllowed()

    def group_members_detail(self, request, **kwargs):
        group = self.get_group(kwargs['id'])
        user = request.user

        if not user.is_authenticated():
            return HttpUnauthorized()

        if request.method == 'GET':
            raise NotImplementedError()
        elif request.method == 'DELETE':
            # Removing yourself - can't leave a group if you're the last
            # member, must delete it.
            if user.id == int(kwargs['user_id']):
                if group.user_set.count() == 1:
                    return HttpForbidden('Last member - must delete group')

                # When demoting yourself while targetting manager group.
                if (self.is_manager_group(group) and
                        group.user_set.count() == 1):
                    return HttpForbidden(
                        'Last manager must delete group to leave')

                if (not self.is_manager_group(group) and user in
                        group.extendedgroup.manager_group.user_set.all()):
                    if group.extendedgroup.manager_group.user_set.count() == 1:
                        return HttpForbidden(
                            'Last manager must delete group to leave')

                group.user_set.remove(user)

                if not self.is_manager_group(group):
                    group.extendedgroup.manager_group.user_set.remove(user)

                return HttpNoContent()

            # Removing other people from the group
            if not self.user_authorized(user, group):
                return HttpUnauthorized()

            if self.is_manager_group(group):
                group.user_set.remove(int(kwargs['user_id']))
            else:
                group.user_set.remove(int(kwargs['user_id']))
                group.extendedgroup.manager_group.user_set.remove(
                    int(kwargs['user_id']))
            return HttpNoContent()
        else:
            return HttpMethodNotAllowed()

    def group_members_list(self, request, **kwargs):
        user = request.user

        if not user.is_authenticated():
            return HttpUnauthorized()

        if request.method == 'GET':
            group_list = self.groups_with_user(user)

            group_obj_list = map(
                lambda g: GroupManagement(
                    g.id,
                    g.name,
                    self.get_member_list(g),
                    None,
                    self.user_authorized(user, g),
                    self.is_manager_group(g),
                    g.id
                    if self.is_manager_group(g)
                    else g.extendedgroup.manager_group.id),
                group_list)

            kwargs['members'] = True
            return self.process_get_list(request, group_obj_list, **kwargs)
        else:
            return HttpMethodNotAllowed()

    def group_perms(self, request, **kwargs):
        user = request.user
        group = self.get_group(kwargs['id'])

        if not user.is_authenticated():
            return HttpUnauthorized()

        if request.method == 'GET':
            group_obj = GroupManagement(
                group.id,
                group.name,
                None,
                self.get_perm_list(group),
                self.user_authorized(user, group),
                self.is_manager_group(group),
                group.id
                if self.is_manager_group(group)
                else group.extendedgroup.manager_group.id)
            kwargs['perms'] = True
            return self.process_get(request, group_obj, **kwargs)
        elif request.method == 'PATCH':
            raise NotImplementedError()
        else:
            return HttpMethodNotAllowed()

    def group_perms_list(self, request, **kwargs):
        user = request.user

        if not user.is_authenticated():
            return HttpUnauthorized()

        if request.method == 'GET':
            group_list = self.groups_with_user(user)

            group_obj_list = map(
                lambda g: GroupManagement(
                    g.id,
                    g.name,
                    None,
                    self.get_perm_list(g),
                    self.user_authorized(user, g),
                    self.is_manager_group(g),
                    g.id
                    if self.is_manager_group(g)
                    else g.extendedgroup.manager_group.id),
                group_list)

            kwargs['perms'] = True
            return self.process_get_list(request, group_obj_list, **kwargs)
        else:
            return HttpMethodNotAllowed()


class UserAuthenticationResource(Resource):
    is_logged_in = fields.BooleanField(attribute='is_logged_in', default=False)
    is_admin = fields.BooleanField(attribute='is_admin', default=False)
    id = fields.IntegerField(attribute='id', default=-1)
    username = fields.CharField(attribute='username', default='AnonymousUser')

    class Meta:
        resource_name = 'user_authentication'
        object_class = UserAuthentication

    def determine_format(self, request):
        return 'application/json'

    def prepend_urls(self):
        return [
            url(r'^user_authentication/$',
                self.wrap_view('check_user_status'),
                name='api_user_authentication_check'),
        ]

    def check_user_status(self, request, **kwargs):
        user = request.user
        is_logged_in = user.is_authenticated()
        is_admin = user.is_staff
        username = user.username if is_logged_in else 'AnonymousUser'
        auth_obj = UserAuthentication(
            is_logged_in,
            is_admin,
            user.id,
            username
        )
        built_obj = self.build_bundle(obj=auth_obj, request=request)
        bundle = self.full_dehydrate(built_obj)
        return self.create_response(request, bundle)


class InvitationResource(ModelResource):
    sender_id = fields.IntegerField(attribute='sender__id', null=True)

    class Meta:
        queryset = Invitation.objects.all()
        resource_name = 'invitations'
        detail_uri_name = 'token_uuid'
        allowed_methods = ['get', 'post', 'put', 'delete']
        # authentication = SessionAuthentication()
        authorization = Authorization()
        filtering = {
            'group_id': ALL
        }

    def get_group(self, group_id):
        group_list = Group.objects.filter(id=int(group_id))
        return None if len(group_list) == 0 else group_list[0]

    def is_manager_group(self, group):
        return not group.extendedgroup.is_managed()

    def user_authorized(self, user, group):
        if self.is_manager_group(group):
            return user in group.user_set.all()
        else:
            return user in group.extendedgroup.manager_group.user_set.all()

    def has_expired(self, token):
        if token.expires is None:
            return True

        return (
            timezone.now() - token.expires
        ).total_seconds() >= 0

    def update_db(self):
        for i in Invitation.objects.all():
            if self.has_expired(i):
                i.delete()

    def send_email(self, request, invitation):
        group = self.get_group(invitation.group_id)
        subject = "Invitation to join group {}".format(group.name)
        temp_loader = loader.get_template(
            'group_invitation/group_invite_email.txt')
        context_dict = {
            'group_name': group.name,
            'site': get_current_site(request),
            'token': invitation.token_uuid
        }
        email = EmailMessage(
            subject,
            temp_loader.render(context_dict),
            to=[invitation.recipient_email]
        )
        email.send()
        return HttpCreated("Email sent")

    # Filter to only show own resources.
    def obj_get_list(self, bundle, **kwargs):
        self.update_db()
        get_dict = bundle.request.GET
        user = bundle.request.user

        auth_group_list = filter(
            lambda g: self.user_authorized(user, g),
            user.groups.all())

        if get_dict.get('group_id'):
            auth_group_list = filter(
                lambda g:
                get_dict['group_id'].isdigit() and
                g.id == int(get_dict['group_id']),
                auth_group_list)

        auth_group_id_set = map(lambda g: g.id, auth_group_list)

        inv_list = filter(
            lambda i: i.group_id in auth_group_id_set,
            Invitation.objects.all())

        inv_list.sort(key=lambda i: i.id)
        return inv_list

    # Handle POST requests for sending tokens.
    def obj_create(self, bundle, **kwargs):
        self.update_db()
        request = bundle.request
        data = json.loads(request.body)
        user = request.user
        group = self.get_group(int(data['group_id']))

        if not self.user_authorized(user, group):
            raise ImmediateHttpResponse(HttpUnauthorized())

        inv = Invitation(token_uuid=uuid.uuid1(), group_id=group.id)
        now = timezone.now()
        token_duration = timedelta(days=settings.TOKEN_DURATION)
        inv.expires = now + token_duration
        inv.sender = user
        inv.recipient_email = data['email']
        inv.save()
        self.send_email(request, inv)
        return bundle

    # Handle PUT requests for resending tokens.
    # Token UUIDs are embedded in URL for PUT requests.
    def obj_update(self, bundle, **kwargs):
        self.update_db()
        inv_list = Invitation.objects.filter(token_uuid=kwargs['token_uuid'])

        if len(inv_list) == 0:
            raise ImmediateHttpResponse(HttpNotFound('Not found or expired'))

        inv = inv_list[0]
        now = timezone.now()
        token_duration = timedelta(days=settings.TOKEN_DURATION)
        inv.expires = now + token_duration
        inv.save()
        self.send_email(bundle.request, inv)
        return bundle


class ExtendedGroupResource(ModelResource):
    member_list = fields.ListField(attribute='member_list', null=True)
    perm_list = fields.ListField(attribute='perm_list', null=True)
    can_edit = fields.BooleanField(attribute='can_edit', default=False)
    manager_group_uuid = fields.CharField(attribute='manager_group_uuid',
                                          null=True)

    class Meta:
        queryset = ExtendedGroup.objects.all()
        resource_name = 'extended_groups'
        object_class = ExtendedGroup
        detail_uri_name = 'uuid'
        # authentication = SessionAuthentication()
        authorization = Authorization()

    # More low-level group access
    def _get_ext_group(self, uuid):
        eg_list = ExtendedGroup.objects.filter(uuid=uuid)
        return None if len(eg_list) == 0 else eg_list[0]

    # Wrap get_ext_group and raise error if cannot be found.
    def get_ext_group_or_fail(self, uuid):
        ext_group = self._get_ext_group(uuid)

        if ext_group:
            return ext_group
        else:
            raise ImmediateHttpResponse(HttpNotFound())

    def ext_groups_with_user(self, user, allow_manager_groups=False):
        if allow_manager_groups:
            return filter(
                lambda g: user in g.user_set.all(),
                ExtendedGroup.objects.all())
        else:
            return filter(
                lambda g:
                not g.is_manager_group() and user in g.user_set.all(),
                ExtendedGroup.objects.all())

    def user_authorized(self, user, ext_group):
        if ext_group.is_manager_group():
            return user in ext_group.user_set.all()
        else:
            return (ext_group.manager_group and
                    user in ext_group.manager_group.user_set.all())

    def get_member_list(self, ext_group):
        return map(
            lambda u: {
                'user_id': u.id,
                'uuid': u.profile.uuid,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_manager': self.user_authorized(u, ext_group)
            },
            ext_group.user_set.all())

    # Override ORM methods for customization.
    def obj_get(self, bundle, **kwargs):
        user = bundle.request.user
        ext_group = super(ExtendedGroupResource, self).obj_get(
            bundle, **kwargs)
        ext_group.can_edit = self.user_authorized(user, ext_group)
        ext_group.manager_group_uuid = (
            ext_group.uuid
            if ext_group.is_manager_group()
            else ext_group.manager_group.uuid
        )
        return ext_group

    def obj_get_list(self, bundle, **kwargs):
        user = bundle.request.user
        ext_group_list = super(ExtendedGroupResource, self).obj_get_list(
            bundle, **kwargs)

        for i in ext_group_list:
            i.can_edit = self.user_authorized(user, i)
            i.manager_group_uuid = (
                i.uuid if i.is_manager_group() else i.manager_group.uuid
            )
        return ext_group_list

    def get_object_list(self, bundle, **kwargs):
        ext_group_list = super(ExtendedGroupResource, self).get_object_list(
            bundle, **kwargs)
        # Currently set so that manager groups are filtered out.
        # This does not make sense semantically but somehow works.
        return ext_group_list.filter(managed_group=None)

    def obj_create(self, bundle, **kwargs):
        user = bundle.request.user
        data = json.loads(bundle.request.body)
        new_ext_group = ExtendedGroup(name=data['name'])

        new_ext_group.name = new_ext_group.name.strip()
        try:
            new_ext_group.full_clean()
        except ValidationError as e:
            raise ImmediateHttpResponse(HttpBadRequest(
                'Invalid group creation request: %s.' % e
            ))
        new_ext_group.save()
        new_ext_group.user_set.add(user)
        new_ext_group.manager_group.user_set.add(user)
        return bundle

    def obj_delete(self, bundle, **kwargs):
        user = bundle.request.user
        ext_group = super(ExtendedGroupResource, self).obj_get(
            bundle, **kwargs)
        if not self.user_authorized(user, ext_group):
            raise ImmediateHttpResponse(HttpForbidden(
                'Only managers may delete groups.'
            ))
        ext_group.delete()
        return HttpAccepted('Group deleted.')

    # Extra things
    def prepend_urls(self):
        return [
            url(r'^extended_groups/members/$',
                self.wrap_view('ext_groups_members_list'),
                name='api_ext_group_members_list'),
            url(r'^extended_groups/(?P<uuid>' + UUID_RE + r')/members/$',
                self.wrap_view('ext_groups_members_basic'),
                name='api_ext_group_members_basic'),
            url(r'^extended_groups/(?P<uuid>' + UUID_RE +
                r')/members/(?P<user_id>[0-9]+)/$',
                self.wrap_view('ext_groups_members_detail'),
                name='api_ext_group_members_detail'),
        ]

    def ext_groups_members_basic(self, request, **kwargs):
        ext_group = self.get_ext_group_or_fail(kwargs['uuid'])
        user = request.user

        if request.method == 'GET':
            ext_group.member_list = self.get_member_list(ext_group)
            ext_group.can_edit = self.user_authorized(user, ext_group)
            ext_group.manager_group_uuid = (
                ext_group.uuid
                if ext_group.is_manager_group()
                else ext_group.manager_group.uuid
            )
            bundle = self.build_bundle(obj=ext_group, request=request)
            return self.create_response(request, self.full_dehydrate(bundle))
        elif request.method == 'PATCH':
            if not self.user_authorized(user, ext_group):
                return HttpUnauthorized()

            data = json.loads(request.body)
            new_member_list = data['member_list']

            # Remove old members before updating.
            ext_group.user_set.clear()

            for m in new_member_list:
                ext_group.user_set.add(int(m['user_id']))

            # Managers should be in the groups they manage.
            if ext_group.is_manager_group():
                for g in ext_group.managed_group.all():
                    for m in new_member_list:
                        g.user_set.add(int(m['user_id']))

            return HttpAccepted()
        elif request.method == 'POST':
            if not self.user_authorized(user, ext_group):
                return HttpUnauthorized()

            data = json.loads(request.body)
            new_member = data['user_id']
            ext_group.user_set.add(new_member)

            if ext_group.is_manager_group():
                for g in ext_group.managed_group.all():
                    g.user_set.add(new_member)

            return HttpAccepted()
        else:
            return HttpMethodNotAllowed()

    def ext_groups_members_detail(self, request, **kwargs):
        ext_group = self.get_ext_group_or_fail(kwargs['uuid'])
        user = request.user

        if request.method == 'GET':
            return self.ext_groups_members_basic(self, request, **kwargs)
        elif request.method == 'DELETE':
            # Removing yourself - must delete to leave if last member.
            if user.id == int(kwargs['user_id']):

                # Prevent users from leaving default public group
                if ext_group.name == 'Public':
                    return HttpForbidden('Members may not leave Public group')

                if ext_group.user_set.count() == 1:
                    return HttpForbidden('Last member - must delete group')

                # When demoting yourself while targetting manager group.
                if (ext_group.is_manager_group() and
                        ext_group.user_set.count() == 1):
                    return HttpForbidden(
                        'Last manager must delete group to leave')

                if (not ext_group.is_manager_group() and
                        user in ext_group.manager_group.user_set.all() and
                        ext_group.manager_group.user_set.count() == 1):
                    return HttpForbidden(
                        'Last manager must delete group to leave')

                ext_group.user_set.remove(user)

                if not ext_group.is_manager_group():
                    ext_group.manager_group.user_set.remove(user)

                return HttpNoContent()

            # Removing other people from the group
            else:
                if not self.user_authorized(user, ext_group):
                    return HttpUnauthorized()

                if ext_group.is_manager_group():
                    ext_group.user_set.remove(int(kwargs['user_id']))
                else:
                    ext_group.user_set.remove(int(kwargs['user_id']))
                    ext_group.manager_group.user_set.remove(
                        int(kwargs['user_id']))
                return HttpNoContent()
        else:
            return HttpMethodNotAllowed()

    def ext_groups_members_list(self, request, **kwargs):
        user = request.user

        if request.method == 'GET':
            ext_group_list = self.ext_groups_with_user(user)

            for i in ext_group_list:
                i.member_list = self.get_member_list(i)
                i.can_edit = self.user_authorized(user, i)
                i.manager_group_uuid = (
                    i.uuid if i.is_manager_group() else i.manager_group.uuid
                )
            return self.create_response(
                request,
                {
                    'meta': {
                        'total_count': len(ext_group_list)
                    },
                    'objects': map(
                        lambda g: self.full_dehydrate(
                            self.build_bundle(obj=g, request=request)),
                        ext_group_list)
                }
            )
        else:
            return HttpMethodNotAllowed()
