'''
Source: https://github.com/davidbernick/GuardianTastypie

'''

from tastypie.authorization import DjangoAuthorization
from tastypie.exceptions import Unauthorized
from guardian.shortcuts import get_objects_for_user


class GuardianAuthorization(DjangoAuthorization):
    '''Apply django-guardian (per instance permissions)

    '''
    def read_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)

        if klass is False:
            return []

        permission = 'read_%s' % (klass._meta.module_name)
        allowed_list = get_objects_for_user(bundle.request.user, permission, klass)
        return object_list.filter(pk__in=[obj.pk for obj in allowed_list])

    def read_detail(self, object_list, bundle):
        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'read_%s' % (klass._meta.module_name)
        if bundle.request.user.has_perm(permission, object_list[0]):
            return True
        else:
            raise Unauthorized("You are not allowed to access that resource.")

    def create_list(self, object_list, bundle):
        return super(GuardianAuthorization, self).create_list(object_list, bundle)

    def create_detail(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        # WARNING: adding new objects is always allowed
        # ModelResources must do their own permission checking in obj_create()
        return True

    def update_list(self, object_list, bundle):
        return []

    def update_detail(self, object_list, bundle):
        raise Unauthorized("You are not allowed to access that resource.")

    def delete_list(self, object_list, bundle):
        return []

    def delete_detail(self, object_list, bundle):
        raise Unauthorized("You are not allowed to access that resource.")
