'''
Created on May 4, 2012

@author: nils
'''
from datetime import timedelta
import json
import logging
import uuid

from django.conf import settings
from django.conf.urls import url
from django.contrib.auth.models import Group, User
from django.contrib.sites.models import get_current_site
from django.core.mail import EmailMessage
from django.forms import ValidationError
from django.template import loader
from django.utils import timezone

from constants import UUID_RE
from tastypie import fields
from tastypie.authentication import SessionAuthentication
from tastypie.authorization import Authorization
from tastypie.bundle import Bundle
from tastypie.constants import ALL
from tastypie.exceptions import ImmediateHttpResponse
from tastypie.http import (HttpAccepted, HttpBadRequest, HttpCreated,
                           HttpForbidden, HttpMethodNotAllowed,
                           HttpNoContent, HttpNotFound, HttpUnauthorized)
from tastypie.resources import ModelResource, Resource

from .models import (DataSet, ExtendedGroup, GroupManagement, Invitation,
                     Project, UserAuthentication, Workflow)

logger = logging.getLogger(__name__)


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
            ext_group.user_set.all().filter(is_active=True).exclude(
                username=settings.ANONYMOUS_USER_NAME
            )
        )

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
