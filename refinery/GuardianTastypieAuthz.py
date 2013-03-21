'''
Source: https://github.com/davidbernick/GuardianTastypie

'''

from tastypie.authorization import Authorization
from tastypie.exceptions import TastypieError, Unauthorized
from guardian.shortcuts import assign,remove_perm
import logging
logger = logging.getLogger(__name__)
logger_debug = logging.getLogger(__name__)


class GuardianAuthorization(Authorization):
    """
    Uses permission checking from ``django.contrib.auth`` to map
    ``POST / PUT / DELETE / PATCH`` to their equivalent Django auth
    permissions.

    Both the list & detail variants simply check the model they're based
    on, as that's all the more granular Django's permission setup gets.
    """
    def base_checks(self, request, model_klass):

        # If it doesn't look like a model, we can't check permissions.
        if not model_klass or not getattr(model_klass, '_meta', None):
            return False

        # User must be logged in to check permissions.
        if not hasattr(request, 'user'):
            return False

        return model_klass

    def read_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)
        read_list=[]

        if klass is False:
            return []

        permission = 'read_%s' % (klass._meta.module_name)
        for obj in object_list:
            if bundle.request.user.has_perm(permission,obj):
                read_list.append(obj)
        # GET-style methods are always allowed.
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

    def create_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)

        if klass is False:
            return []

        permission = '%s.add_%s' % (klass._meta.app_label, klass._meta.module_name)

        if not bundle.request.user.has_perm(permission):
            return []
        return object_list

    def create_detail(self, object_list, bundle):
        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = '%s.add_%s' % (klass._meta.app_label, klass._meta.module_name)

        if bundle.request.user.has_perm(permission):
            return True
        raise Unauthorized("You are not allowed to access that resource.")

    def update_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)
        update_list=[]

        if klass is False:
            return []

        permission = '%s.change_%s' % (klass._meta.app_label, klass._meta.module_name)

        for obj in object_list:           
            if bundle.request.user.has_perm(permission,obj):
                update_list.append(obj)

        if update_list:
            return update_list
        raise Unauthorized("You are not allowed to access that resource.")

    def update_detail(self, object_list, bundle):
        update_list=[]
        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'change_%s' % (klass._meta.module_name)

        for obj in object_list:           
            if bundle.request.user.has_perm(permission,obj):
                update_list.append(obj)

        if update_list:
            return update_list
        raise Unauthorized("You are not allowed to access that resource.")

    def delete_list(self, object_list, bundle):
        delete_list=[]
        klass = self.base_checks(bundle.request, object_list.model)

        if klass is False:
            return []

        permission = '%s.delete_%s' % (klass._meta.app_label, klass._meta.module_name)

        for obj in object_list:           
            if bundle.request.user.has_perm(permission,obj):
                delete_list.append(obj)

        if delete_list:
            return delete_list
        raise Unauthorized("You are not allowed to access that resource.")

    def delete_detail(self, object_list, bundle):
        delete_list=[]

        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = '%s.delete_%s' % (klass._meta.app_label, klass._meta.module_name)

        for obj in object_list:           
            if bundle.request.user.has_perm(permission,obj):
                delete_list.append(obj)

        if delete_list:
            return delete_list
        raise Unauthorized("You are not allowed to access that resource.")
