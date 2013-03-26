'''
Source: https://github.com/davidbernick/GuardianTastypie

'''

from tastypie.authorization import DjangoAuthorization
from tastypie.exceptions import Unauthorized


class GuardianAuthorization(DjangoAuthorization):
    """
    Maps ``GET`` to its equivalent django-guardian permission.
    Only model-level checks are done for ``POST``.
    Other types of requests are not allowed.
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
        return read_list

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
        else:
            raise Unauthorized("You are not allowed to access that resource.")

    def create_list(self, object_list, bundle):
        return super(GuardianAuthorization, self).create_list(object_list, bundle)

    def create_detail(self, object_list, bundle):
        return super(GuardianAuthorization, self).create_detail(object_list, bundle)

    def update_list(self, object_list, bundle):
        return []

    def update_detail(self, object_list, bundle):
        raise Unauthorized("You are not allowed to access that resource.")

    def delete_list(self, object_list, bundle):
        return []

    def delete_detail(self, object_list, bundle):
        raise Unauthorized("You are not allowed to access that resource.")
