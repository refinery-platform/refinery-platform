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
from django.contrib.auth.models import Group
from django.contrib.sites.models import get_current_site
from django.core.mail import EmailMessage
from django.forms import ValidationError
from django.template import loader
from django.utils import timezone

from constants import UUID_RE
from tastypie import fields
from tastypie.authorization import Authorization
from tastypie.constants import ALL
from tastypie.exceptions import ImmediateHttpResponse
from tastypie.http import (HttpAccepted, HttpBadRequest, HttpCreated,
                           HttpForbidden, HttpMethodNotAllowed,
                           HttpNoContent, HttpNotFound, HttpUnauthorized)
from tastypie.resources import ModelResource

from .models import ExtendedGroup, Invitation

logger = logging.getLogger(__name__)


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
