'''
Source: https://github.com/davidbernick/GuardianTastypie

'''

from tastypie.authorization import DjangoAuthorization
from tastypie.exceptions import Unauthorized


class GuardianAuthorization(DjangoAuthorization):
    """
    Uses permission checking from ``django.contrib.auth`` to map
    ``GET`` to its equivalent django-guardian permission.

    Only model-level checks are done for other types of requests.  Add
    appropriate instance-level check before using with resources that support
    those additional requests.

    """
    def read_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)
        read_list=[]

        if klass is False:
            return []

        permission = 'read_%s' % (klass._meta.module_name)
        for obj in object_list:
            if bundle.request.user.has_perm(permission,obj):
                read_list.append(obj)
        if read_list:
            return read_list
        raise Unauthorized("You are not allowed to access that resource.")

    def read_detail(self, object_list, bundle):
        klass = self.base_checks(bundle.request, bundle.obj.__class__)
        read_list=[]

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'read_%s' % (klass._meta.module_name)
        for obj in object_list:
            if bundle.request.user.has_perm(permission, obj):
                read_list.append(obj)
                
        if read_list:
            return True
        raise Unauthorized("You are not allowed to access that resource.")

