"""Source: https://github.com/davidbernick/GuardianTastypie
"""

import logging

from tastypie.authorization import Authorization
from tastypie.exceptions import Unauthorized

logger = logging.getLogger(__name__)


class GuardianAuthorization(Authorization):
    """Uses permission checking from ``django.contrib.auth`` to map
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
        # This does not work as originally implemented with a simple list as
        # the return object because some downstream methods are trying to call
        # QuerySet specific methods (e.g. order_by()) on the return object,
        # therefore we are now removing objects from the QuerySet for which the
        # user does not have permissions.
        klass = self.base_checks(bundle.request, object_list.model)
        has_results = False
        has_objects = object_list.count()

        if klass is False:
            return []

        permission = 'read_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                has_results = True
            else:
                # remove object for which the user does not have permissions
                object_list.exclude(id=obj.id)
        # GET-style methods are always allowed.
        if has_results:
            return object_list

        # should we always just return an empty list and never report a 401?
        if has_objects > 0 and not has_results:
            raise Unauthorized("You are not allowed to access that resource.")
        return object_list

    def read_detail(self, object_list, bundle):
        klass = self.base_checks(bundle.request, bundle.obj.__class__)
        read_list = []

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'read_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                read_list.append(obj)

        if read_list:
            return True
        raise Unauthorized("You are not allowed to access that resource.")

    def create_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)
        create_list = []

        logger.debug(object_list)

        if klass is False:
            return []

        permission = 'add_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                create_list.append(obj)

        if create_list:
            return create_list
        raise Unauthorized("You are not allowed to access that resource.")

    def create_detail(self, object_list, bundle):

        # a temporary fix - for now any logged in user can create any object
        return True

        """
        klass = self.base_checks(bundle.request, bundle.obj.__class__)
        create_list=[]

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'add_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission,obj):
                create_list.append(obj)

        if create_list:
            return True
        raise Unauthorized("You are not allowed to access that resource.")
        """

    def update_list(self, object_list, bundle):
        klass = self.base_checks(bundle.request, object_list.model)
        update_list = []

        if klass is False:
            return []

        permission = 'change_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                update_list.append(obj)

        if update_list:
            return update_list
        raise Unauthorized("You are not allowed to access that resource.")

    def update_detail(self, object_list, bundle):
        update_list = []
        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'change_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                update_list.append(obj)

        if update_list:
            return update_list
        raise Unauthorized("You are not allowed to access that resource.")

    def delete_list(self, object_list, bundle):
        delete_list = []
        klass = self.base_checks(bundle.request, object_list.model)

        if klass is False:
            return []

        permission = 'delete_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                delete_list.append(obj)

        if delete_list:
            return delete_list
        raise Unauthorized("You are not allowed to access that resource.")

    def delete_detail(self, object_list, bundle):
        delete_list = []

        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise Unauthorized("You are not allowed to access that resource.")

        permission = 'delete_%s' % (klass._meta.verbose_name)

        for obj in object_list:
            if bundle.request.user.has_perms(permission, obj):
                delete_list.append(obj)

        if delete_list:
            return delete_list
        raise Unauthorized("You are not allowed to access that resource.")
