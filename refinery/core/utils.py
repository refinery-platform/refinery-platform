

from functools import wraps
import logging
import sys

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import Http404
from django.utils import timezone

import requests
from rest_framework.exceptions import APIException
from rest_framework.response import Response

# These imports go against our coding style guide, but are necessary for the
#  time being due to mutual import issues
import core
from core.search_indexes import DataSetIndex
import data_set_manager

logger = logging.getLogger(__name__)


def skip_if_test_run(func):
    """Decorator to be used on functions that don't necessarily need to
    be run during tests or CI i.e. Solr stuff tend to pollute
    log output
    """
    def func_wrapper(*args, **kwargs):
        if "test" in sys.argv:
                return
        else:
            return func(*args, **kwargs)
    return func_wrapper


@skip_if_test_run
def update_data_set_index(data_set):
    """Update a dataset's corresponding document in Solr.
    """

    logger.info('Updated data set (uuid: %s) index', data_set.uuid)
    try:
        DataSetIndex().update_object(data_set, using='core')
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not update DataSetIndex: %s", e)


@skip_if_test_run
def delete_data_set_index(data_set):
    """Remove a dataset's related document from Solr's index.
    """

    logger.debug('Deleted data set (uuid: %s) index', data_set.uuid)
    try:
        DataSetIndex().remove_object(data_set, using='core')
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not delete from DataSetIndex: %s", e)


@skip_if_test_run
def delete_analysis_index(node_instance):
    """Remove a Analysis' related document from Solr's index.
    """
    try:
        data_set_manager.search_indexes.NodeIndex().remove_object(
            node_instance, using='data_set_manager'
        )
        logger.debug('Deleted Analysis\' NodeIndex with (uuid: %s)',
                     node_instance.uuid)
    except Exception as e:
        """ Solr is expected to fail and raise an exception when
        it is not running.
        (e.g. Travis CI doesn't support solr yet)
        """
        logger.error("Could not delete from NodeIndex: %s", e)


def invalidate_cached_object(instance, is_test=False):
    """
        Removes cached objects for all users based on the class name of the
        instance passed.

        Ex: Given a DataSet instance, all possible cached objects holding
        DataSets will be deleted to represent the saving, updating,
        deletion, or perms change that was performed upon it.

        If the is_test flag is set, a new instance of a mockcache Client
        will be returned
    """
    if not is_test:
        try:
            cache.delete_many(['{}-{}'.format(user.id, instance.__class__.
                                              __name__)
                               for user in User.objects.all()])

        except Exception as e:
            logger.debug("Could not delete %s from cache" %
                         instance.__class__.__name__, e)
    else:
        from mockcache import Client
        mc = Client()
        return mc


def build_absolute_url(string):
    """Creates an absolute URL from a relative URL using the current Site
    domain and REFINERY_URL_SCHEME Django setting
    """
    if not string:
        raise ValueError('Only relative urls allowed, not: {}'.format(string))
    if is_absolute_url(string):
        return string
    try:
        current_site = Site.objects.get_current()
    except Site.DoesNotExist as e:
        logger.error("Can not construct a full URL: no Sites configured or "
                     "SITE_ID is invalid")
        raise RuntimeError(e.message)

    return "{}://{}{}".format(
        settings.REFINERY_URL_SCHEME, current_site.domain, string
    )


def is_absolute_url(string):
    return string and '://' in string


def get_aware_local_time():
    # Returns the local time, model field default helper
    return timezone.localtime(timezone.now())


def email_admin(subject, message):
    """
    Sends an email to the admin email configured in our Django Settings
    """
    send_mail(subject, message, settings.SERVER_EMAIL,
              [settings.ADMINS[0][1]])


def admin_ui_deletion(request, objects_to_delete, single_model=None):
    """
        Helper method to delete objects selected in the Django admin
        interface and display the proper message based on the status of
        their deletion
        :param objects_to_delete: iterable of Objects selected in admin UI,
        or a single object instance if `delete_model:admin_ui_deletion` is
        called with `single_model` having a truthy value
        :param request: the request Obj
        :param single_model: Set this to true when calling from a overridden
        `delete_model` method in the admin.py code
    """

    def create_delete_response_message(del_response):
        if del_response[0]:
            messages.success(request, del_response[1])
        else:
            messages.error(request, del_response[1])

    # If this method is triggered from an Admin UI 'delete_selected' call
    if not single_model:
        for instance in objects_to_delete.all():
            delete_response = instance.delete()
            create_delete_response_message(delete_response)

    # If this method is triggered from an Admin UI 'delete_model' call
    else:
        delete_response = objects_to_delete.delete()

        if not delete_response[0]:
            # Fix for multiple messages displaying
            messages.set_level(request, messages.ERROR)
            create_delete_response_message(delete_response)


def api_error_response(error_message, http_status_code):
    """Return a standardized error for Django Rest Framework API calls"""
    return Response({'Error': error_message}, status=http_status_code)


def get_non_manager_groups_for_user(user):
    """
    :param user: model instance
    :return: array of (non-manager) ExtendedGroup objects
    """
    return user.groups.exclude(name__contains='Managers')


# False, accept_global_perms will be ignored, which means that only object
# permissions will be checked.
def accept_global_perms(resource_type):
    if resource_type == 'dataset':
        return False
    return True


def verify_recaptcha(view_function):
    @wraps(view_function)
    def _wrapped_view(request, *args, **kwargs):
        request.recaptcha_is_valid = False
        if request.method == 'POST':
            recaptcha_response = request.POST.get('g-recaptcha-response')
            data = {
                'secret': settings.REFINERY_GOOGLE_RECAPTCHA_SECRET_KEY,
                'response': recaptcha_response
            }
            result = requests.post(
                'https://www.google.com/recaptcha/api/siteverify', data=data
            ).json()
            if result['success']:
                request.recaptcha_is_valid = True
        return view_function(request, *args, **kwargs)
    return _wrapped_view


def get_data_set_for_view_set(uuid):
    try:
        return core.models.DataSet.objects.get(uuid=uuid)
    except core.models.DataSet.DoesNotExist as e:
        logger.error(e)
        raise Http404
    except core.models.DataSet.MultipleObjectsReturned as e:
        logger.error(e)
        raise APIException("Multiple dataSets returned for this request.")


def get_group_for_view_set(uuid):
    try:
        return core.models.ExtendedGroup.objects.get(uuid=uuid)
    except core.models.ExtendedGroup.DoesNotExist as e:
        logger.error(e)
        raise Http404
    except core.models.ExtendedGroup.MultipleObjectsReturned as e:
        logger.error(e)
        raise APIException("Multiple groups returned for this request.")
