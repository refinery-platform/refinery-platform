import csv
from datetime import timedelta
import json
import logging
import urllib
import uuid
from urlparse import urljoin
from xml.parsers.expat import ExpatError

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.sites.models import RequestSite, Site
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage
from django.core.urlresolvers import reverse
from django.db import transaction
from django.http import (Http404, HttpResponse, HttpResponseBadRequest,
                         HttpResponseForbidden, HttpResponseNotFound,
                         HttpResponseRedirect, HttpResponseServerError,
                         JsonResponse)
from django.shortcuts import (get_object_or_404, redirect, render,
                              render_to_response)
from django.template import RequestContext, loader
from django.utils import timezone
from django.views.decorators.gzip import gzip_page

import boto3
import botocore
from guardian.shortcuts import (get_groups_with_perms, get_objects_for_user,
                                get_perms)

from guardian.core import ObjectPermissionChecker
from guardian.utils import get_anonymous_user
from registration import signals
from registration.views import RegistrationView
import requests
from requests.exceptions import HTTPError
from rest_framework import authentication, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import detail_route
from rest_framework.exceptions import APIException
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
import xmltodict

from data_set_manager.models import Attribute

from .forms import UserForm, UserProfileForm
from .models import (Analysis, CustomRegistrationProfile, DataSet, Event,
                     ExtendedGroup, Invitation, SiteProfile, SiteStatistics,
                     SiteVideo, UserProfile, Workflow)

from .serializers import (AnalysisSerializer, DataSetSerializer,
                          EventSerializer, ExtendedGroupSerializer,
                          InvitationSerializer, SiteProfileSerializer,
                          SiteVideoSerializer, UserProfileSerializer,
                          WorkflowSerializer)
from .utils import (api_error_response, get_data_sets_annotations,
                    get_data_set_for_view_set, get_group_for_view_set,
                    get_non_manager_groups_for_user)

logger = logging.getLogger(__name__)


def home(request):
    return render(request, 'core/home.html')


def about(request):
    return render_to_response('core/about.html',
                              {'site_name': get_current_site(request).name},
                              context_instance=RequestContext(request))


def dashboard(request):
    return render_to_response('core/dashboard.html', {},
                              context_instance=RequestContext(request))


def auto_login(request):
    try:
        user = int(request.GET.get('user', -1))
    except ValueError:
        user = -1

    exploration = request.GET.get('exploration', False)

    if user >= 0 and user in settings.AUTO_LOGIN:
        if request.user.is_authenticated():
            logout(request)

        try:
            user = User.objects.get(id=user)
            user.backend = settings.AUTHENTICATION_BACKENDS[0]
        except Exception:
            logger.error('Auto login for user ID {} failed.'.format(user))
            return redirect('{}'.format(reverse('home')))

        login(request, user)

        if exploration:
            return redirect('{}#/exploration'.format(reverse('home')))

    return redirect('{}'.format(reverse('home')))


@login_required
def group_invite(request, token):
    inv_list = Invitation.objects.filter(token_uuid=token)
    if len(inv_list) == 0:
        return render_to_response(
            'core/group_invite.html',
            {
                'site': '{}://{}'.format(settings.REFINERY_URL_SCHEME,
                                         get_current_site(request)),
                'message': 'Invalid token. Not found or expired.'
            },
            context_instance=RequestContext(request))

    inv = inv_list[0]
    user = request.user
    ext_group_list = ExtendedGroup.objects.filter(id=int(inv.group_id))
    ext_group = None if len(ext_group_list) == 0 else ext_group_list[0]

    if not ext_group:
        return render_to_response(
            'core/group_invite.html',
            {
                'site': '{}://{}'.format(settings.REFINERY_URL_SCHEME,
                                         get_current_site(request)),
                'message': 'Invalid token. Unable to find pairing group'
            },
            context_instance=RequestContext(request))

    ext_group.user_set.add(user)
    # If the group is a manager group
    if ext_group.is_manager_group():
        for i in ext_group.managed_group.all():
            i.user_set.add(user)
    # We are done using this token
    inv.delete()
    return render_to_response(
        'core/group_invite.html',
        {
            'site': '{}://{}'.format(settings.REFINERY_URL_SCHEME,
                                     get_current_site(request)),
            'message': '%s has been added to the group %s.' %
                       (user.username, ext_group.name),
            'user': user,
            'ext_group': ext_group
        },
        context_instance=RequestContext(request))


def custom_error_page(request, template, context_dict):
    temp_loader = loader.get_template(template)
    return temp_loader.render(context_dict, request)


@login_required()
def user(request, query):
    try:
        user = User.objects.get(username=query)
    except User.DoesNotExist:
        user = get_object_or_404(UserProfile, uuid=query).user

    # return all non-manager groups in profile
    groups = get_non_manager_groups_for_user(user)
    return render(request,
                  'core/user.html',
                  {'profile_user': user, 'user_groups': groups})


@login_required()
def user_profile(request):
    return user(request, request.user.profile.uuid)


@login_required()
def user_edit(request, uuid):
    profile_object = get_object_or_404(UserProfile, uuid=uuid)
    user_object = profile_object.user
    if request.method == "POST":
        uform = UserForm(data=request.POST, instance=user_object)
        pform = UserProfileForm(data=request.POST, instance=profile_object)
        if uform.is_valid() and pform.is_valid():
            user = uform.save()
            profile = pform.save(commit=False)
            profile.user = user
            profile.save()
            return HttpResponseRedirect(
                reverse('core.views.user', args=(uuid,))
            )
    else:
        uform = UserForm(instance=user_object)
        pform = UserProfileForm(instance=profile_object)

    return render_to_response('core/edit_user.html',
                              {'profile_user': user_object,
                               'uform': uform, 'pform': pform},
                              context_instance=RequestContext(request))


@login_required()
def user_profile_edit(request):
    return user_edit(request, request.user.profile.uuid)


@login_required()
def group(request, query):
    group = get_object_or_404(ExtendedGroup, uuid=query)
    # only group members are allowed to see group pages
    if not request.user.is_superuser:
        if group.id not in request.user.groups.values_list('id', flat=True):
            return HttpResponseForbidden(
                custom_error_page(request, '403.html',
                                  {'user': request.user,
                                   'msg': "view group %s" % group.name}))
    return render_to_response('core/group.html', {'group': group},
                              context_instance=RequestContext(request))


def data_set_slug(request, slug):
    d = get_object_or_404(DataSet, slug=slug)
    return data_set(request, d.uuid)


def data_set(request, data_set_uuid, analysis_uuid=None):
    data_set = get_object_or_404(DataSet, uuid=data_set_uuid)
    public_group = ExtendedGroup.objects.public_group()

    if not request.user.has_perm('core.read_meta_dataset', data_set):
        if 'read_meta_dataset' not in get_perms(public_group, data_set):
            if request.user.is_authenticated():
                return HttpResponseForbidden(
                    custom_error_page(request, '403.html',
                                      {user: request.user,
                                       'msg': "view this data set"}))
            else:
                return HttpResponse(
                    custom_error_page(request, '401.html',
                                      {'msg': "view this data set"}),
                    status='401')
    # get studies
    investigation = data_set.get_investigation()
    studies = investigation.study_set.all()
    # If repository mode, only return workflows tagged for the repository
    if (settings.REFINERY_REPOSITORY_MODE):
        workflows = Workflow.objects.filter(show_in_repository_mode=True)
    else:
        workflows = Workflow.objects.all()

    study_uuid = studies[0].uuid
    # used for solr field postfixes: FIELDNAME_STUDYID_ASSAY_ID_FIELDTYPE
    study_id = studies[0].id
    assay_uuid = studies[0].assay_set.all()[0].uuid
    # used for solr field postfixes: FIELDNAME_STUDYID_ASSAY_ID_FIELDTYPE
    assay_id = studies[0].assay_set.all()[0].id

    return render_to_response(
        'core/data_set.html',
        {
            "data_set": data_set,
            "analysis_uuid": analysis_uuid,
            "studies": studies,
            "study_uuid": study_uuid,
            "study_id": study_id,
            "assay_uuid": assay_uuid,
            "assay_id": assay_id,
            "has_change_dataset_permission": 'change_dataset' in get_perms(
                request.user, data_set),
            "workflows": workflows,
            "isatab_archive": investigation.get_file_store_item(),
            "pre_isatab_archive": investigation.get_file_store_item(),
            "attribute_edit_types": ','.join(Attribute.editable_types)
        },
        context_instance=RequestContext(request))


def workflow_slug(request, slug):
    w = get_object_or_404(Workflow, slug=slug)
    return workflow(request, w.uuid)


def workflow(request, uuid):
    workflow = get_object_or_404(Workflow, uuid=uuid)
    public_group = ExtendedGroup.objects.public_group()
    if not request.user.has_perm('core.read_workflow', workflow):
        if 'read_workflow' not in get_perms(public_group, workflow):
            if request.user.is_authenticated():
                return HttpResponseForbidden(
                    custom_error_page(request, '403.html',
                                      {user: request.user,
                                       'msg': "view this workflow"}))
            else:
                return HttpResponse(
                    custom_error_page(request, '401.html',
                                      {'msg': "view this workflow"}),
                    status='401')
    # load graph dictionary from Galaxy
    workflow = Workflow.objects.filter(uuid=uuid).get()
    return render_to_response('core/workflow.html', {'workflow': workflow},
                              context_instance=RequestContext(request))


def solr_core_search(request):
    """Query Solr's core index for search.

    Queries are augmented with user and group information so that no datasets
    is returned for which the user has no access.

    For visualizing the repository it's important to know all datasets right
    from the beginning. Because Django and Solr most likely run on the same
    server, it's better to prefetch all dataset uuid and send them back
    altogether rather than having to query from the client side twice.
    """
    url = settings.REFINERY_SOLR_BASE_URL + "core/select"

    headers = {
        'Accept': 'application/json'
    }

    params = request.GET.dict()
    # Generate access list
    if not request.user.is_superuser:
        if request.user.id is None:
            access = ['g_{}'.format(settings.REFINERY_PUBLIC_GROUP_ID)]
        else:
            access = ['u_{}'.format(request.user.id)]
            for group in request.user.groups.all():
                access.append('g_{}'.format(group.id))
        params['fq'] = params['fq'] + ' AND access:({})'.format(
            ' OR '.join(access))

    try:
        allIds = params['allIds'] in ['1', 'true', 'True']
    except KeyError:
        allIds = False

    try:
        annotations = params['annotations'] in ['1', 'true', 'True']
    except KeyError:
        annotations = False
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
    except HTTPError as e:
        logger.error(e)

    if allIds or annotations:
        # Query for all uuids given the same query. Solr shold be very fast
        # because we just queried for almost the same information, only limited
        # in size.
        all_ids_params = {
            'defType': params['defType'],
            'fl': 'dbid',
            'fq': params['fq'],
            'q': params['q'],
            'qf': params['qf'],
            'rows': 2147483647,
            'start': 0,
            'wt': 'json'
        }
        try:
            response_ids = requests.get(
                url,
                params=all_ids_params,
                headers=headers
            )
            response_ids.raise_for_status()
        except HTTPError as e:
            logger.error(e)

        if response_ids.status_code == 200:
            response_ids = response_ids.json()
            ids = []

            for ds in response_ids['response']['docs']:
                ids.append(ds['dbid'])

            annotation_data = get_data_sets_annotations(ids)

            response = response.json()

            if allIds:
                response['response']['allIds'] = ids

            if annotations:
                response['response']['annotations'] = annotation_data

            return JsonResponse(response)

    return HttpResponse(response, content_type='application/json')


def doi(request, id):
    """Forwarding requests to DOI's API"""
    # Decode URL and replace dollar signs by forward slashes
    # This encoding is needed because forward slashes cause 404 errors even
    # when they are URL encoded as they are still regarded as forward
    # slashes.
    id = urllib.unquote(id).decode('utf8')
    id = id.replace('$', '/')
    url = "https://doi.org/{id}".format(id=id)
    headers = {'Accept': 'application/json'}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except HTTPError as e:
        logger.error(e)
    except requests.exceptions.ConnectionError:
        return HttpResponse('Service currently unavailable', status=503)

    return HttpResponse(response, content_type='application/json')


def pubmed_abstract(request, id):
    """Forwarding requests to PubMed's API
    Example:
    https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=XML&rettype=abstract&id=25344497
    """
    url = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    params = {
        'db': 'pubmed',
        'retmode': 'xml',
        'rettype': 'abstract',
        'id': id
    }
    headers = {
        'Accept': 'text/xml'
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
    except HTTPError as e:
        logger.error(e)
    except requests.exceptions.ConnectionError:
        return HttpResponse('Service currently unavailable', status=503)

    try:
        response_dict = xmltodict.parse(response.text)
    except ExpatError:
        return HttpResponse('Service currently unavailable', status=503)

    return JsonResponse(response_dict)


def pubmed_search(request, term):
    """Forwarding requests to PubMed's API
    Example:
    https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term=10.1093%2Fbioinformatics%2Fbtu707
    """
    term = urllib.unquote(term).decode('utf8')
    term = term.replace('$', '/')

    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        'db': 'pubmed',
        'retmode': 'json',
        'retmax': 1,
        'term': term
    }
    headers = {
        'Accept': 'application/json'
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
    except HTTPError as e:
        logger.debug(e)
    except requests.exceptions.ConnectionError:
        return HttpResponse('Service currently unavailable', status=503)

    return HttpResponse(response, content_type='application/json')


def pubmed_summary(request, id):
    """Forwarding requests to PubMed's API
    Example:
    https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=25344497
    """
    url = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    params = {
        'db': 'pubmed',
        'retmode': 'json',
        'id': id
    }
    headers = {
        'Accept': 'application/json'
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
    except HTTPError as e:
        logger.error(e)
    except requests.exceptions.ConnectionError:
        return HttpResponse('Service currently unavailable', status=503)

    return HttpResponse(response, content_type='application/json')


@gzip_page
def neo4j_dataset_annotations(request):
    """Query Neo4J for dataset annotations per user"""

    if request.user.username:
        user_name = request.user.username
    else:
        try:
            user_name = get_anonymous_user().username
        except(User.DoesNotExist, User.MultipleObjectsReturned,
               ImproperlyConfigured) as e:
            error_message = \
                "Could not properly fetch the AnonymousUser: {}".format(e)
            logger.error(error_message)
            return HttpResponseServerError(error_message)

    url = urljoin(
        settings.NEO4J_BASE_URL,
        'ontology/unmanaged/annotations/{}'.format(user_name)
    )

    headers = {
        'Accept': 'application/json; charset=UTF-8',
        'Accept-Encoding': 'gzip,deflate',
        'Content-type': 'application/json'
    }

    params = {
        'objectification': 2
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
    except HTTPError as e:
        logger.error(e)
    except requests.exceptions.ConnectionError as e:
        logger.error('Neo4J seems to be offline.')
        logger.error(e)
        return HttpResponse(
            'Neo4J seems to be offline.',
            content_type='text/plain',
            status=503
        )

    return HttpResponse(response, content_type='application/json')


class WorkflowViewSet(viewsets.ModelViewSet):
    """API endpoint that allows Workflows to be viewed"""
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']

    @detail_route(methods=['get'])
    def graph(self, request, *args, **kwargs):
        return HttpResponse(
            get_object_or_404(Workflow, uuid=kwargs.get("uuid")).graph
        )


class EventViewSet(APIView):
    """API endpoint that allows Events to be viewed"""
    def get(self, request):
        """Queryset based on DataSets that the requesting User has permission
         to access"""
        data_sets_for_user = get_objects_for_user(
            request.user,
            'core.read_meta_dataset',
            accept_global_perms=False
        )

        user_events = Event.objects.filter(
            data_set__in=data_sets_for_user
        ).order_by('-date_time')[0:50]
        serializer = EventSerializer(user_events, many=True,
                                     context={'request': request})
        return Response(serializer.data)


class DataSetsViewSet(viewsets.ViewSet):
    """API endpoint for viewing, editing, and deleting datasets."""
    http_method_names = ['get', 'delete', 'patch']
    lookup_field = 'uuid'

    def get_object(self, uuid):
        return get_data_set_for_view_set(uuid)

    def list(self, request):
        params = request.query_params
        paginator = LimitOffsetPagination()
        paginator.default_limit = 100

        filters = {
            'is_owner': params.get('is_owner'),
            'is_public': params.get('public')
        }
        try:
            filters['group'] = ExtendedGroup.objects.get(
                id=params.get('group')
            )
        except Exception:
            filters['group'] = None

        user_data_sets = get_objects_for_user(
            request.user,
            "core.read_meta_dataset",
            accept_global_perms=False
        ).order_by('-modification_date')

        filtered_data_sets = []
        check_own = filters.get('is_owner')
        all_owner_perms = ObjectPermissionChecker(request.user)
        all_owner_perms.prefetch_perms(user_data_sets)

        check_public = filters.get('is_public')
        all_public_perms = ObjectPermissionChecker(
            ExtendedGroup.objects.public_group()
        )
        all_public_perms.prefetch_perms(user_data_sets)

        group = filters.get('group')
        if group:
            all_group_perms = ObjectPermissionChecker(filters.get('group'))
            all_group_perms.prefetch_perms(user_data_sets)

        for data_set in user_data_sets:
            is_public = all_public_perms.has_perm('read_meta_dataset',
                                                  data_set)
            if request.user.is_superuser:
                is_owner = data_set.get_owner() == request.user
            else:
                is_owner = all_owner_perms.has_perm('share_dataset', data_set)
            setattr(data_set, 'public', is_public)
            setattr(data_set, 'is_owner', is_owner)

            if not data_set.is_valid:
                logger.warning(
                    "DataSet with UUID: {} is invalid, and most likely is "
                    "still being created".format(data_set.uuid)
                )
                continue
            elif check_own or check_public or group:
                if group:
                    group_perms = all_group_perms.has_perm('read_meta_dataset',
                                                           data_set)
                # need to check for filter and then check data set perms
                if check_own and check_public and group:
                    if is_owner and is_public and group_perms:
                        filtered_data_sets.append(data_set)
                elif check_own and group:
                    if is_owner and group_perms:
                        filtered_data_sets.append(data_set)
                elif check_own and check_public:
                    if is_owner and is_public:
                        filtered_data_sets.append(data_set)
                elif check_public and group:
                    if is_public and group_perms:
                        filtered_data_sets.append(data_set)
                elif check_own and is_owner or check_public and is_public\
                        or group and group_perms:
                    filtered_data_sets.append(data_set)
            else:
                filtered_data_sets.append(data_set)

        total_data_sets = len(filtered_data_sets)
        paged_data_sets = paginator.paginate_queryset(filtered_data_sets,
                                                      request)
        serializer = DataSetSerializer(paged_data_sets, many=True,
                                       context={'request': request})

        return Response({'data_sets': serializer.data,
                        'total_data_sets': total_data_sets})

    def retrieve(self, request, uuid):
        data_set = self.get_object(uuid)
        public_group = ExtendedGroup.objects.public_group()
        if not ('read_meta_dataset' in get_perms(public_group, data_set) or
                request.user.has_perm('core.read_meta_dataset', data_set)):
            return Response(
                uuid, status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = DataSetSerializer(data_set, context={'request': request})
        return Response(serializer.data)

    def is_user_authorized(self, user, data_set):
        if (not user.is_authenticated() or
                not user.has_perm('core.change_dataset', data_set)):
            return False
        else:
            return True

    def destroy(self, request, uuid):
        if not request.user.is_authenticated():
            return HttpResponseForbidden(
                content="User {} is not authenticated".format(request.user))

        try:
            data_set = DataSet.objects.get(uuid=uuid)
        except NameError as e:
            logger.error(e)
            return HttpResponseBadRequest(content="Bad Request")
        except DataSet.DoesNotExist as e:
            logger.error(e)
            return HttpResponseNotFound(content="DataSet with UUID: {} "
                                                "not found.".format(uuid))
        except DataSet.MultipleObjectsReturned as e:
            logger.error(e)
            return HttpResponseServerError(
                content="Multiple DataSets returned for this request")

        if data_set.get_owner() == request.user:
            data_set_deleted = data_set.delete()
            if data_set_deleted[0]:
                return Response({"data": data_set_deleted[1]})
            else:
                return HttpResponseBadRequest(content=data_set_deleted[1])

        return Response('Unauthorized to delete data set with uuid: {'
                        '}'.format(uuid), status=status.HTTP_401_UNAUTHORIZED)

    def partial_update(self, request, uuid, format=None):
        self.data_set = self.get_object(uuid)
        self.current_site = get_current_site(request)

        # check edit permission for user
        if self.is_user_authorized(request.user, self.data_set):
            # update data set's owner
            current_owner = self.data_set.get_owner()
            if request.data.get('transfer_data_set') and current_owner == \
                    request.user:
                new_owner_email = request.data.get('new_owner_email')
                try:
                    new_owner = User.objects.get(email=new_owner_email)
                except Exception:
                    return Response(uuid, status=status.HTTP_404_NOT_FOUND)

                try:
                    with transaction.atomic():
                        self.data_set.transfer_ownership(current_owner,
                                                         new_owner)
                        perm_groups = self.update_group_perms(new_owner)
                except Exception as e:
                    return Response(
                        e, status=status.HTTP_412_PRECONDITION_FAILED
                    )

                self.send_transfer_notification_email(current_owner,
                                                      new_owner, perm_groups)
                serializer = DataSetSerializer(self.data_set,
                                               context={'request': request})
                return Response(serializer.data,
                                status=status.HTTP_202_ACCEPTED)

            # update data set's fields
            serializer = DataSetSerializer(
                self.data_set, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(
                    serializer.data, status=status.HTTP_202_ACCEPTED
                )
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )
        else:
            return Response(
                uuid, status=status.HTTP_401_UNAUTHORIZED
            )

    def send_transfer_notification_email(self, old_owner, new_owner,
                                         perm_groups):
        """
        Helper method which emails the old and new owner of the data set
        transfer and which groups have access
        :param old_owner: data set's previous owner obj
        :param new_owner: data set's new owner obj
        :param perm_groups: obj with two obj of permission groups
        """
        subject = "{}: Data Set ownership transfer".format(
           settings.EMAIL_SUBJECT_PREFIX
        )
        old_owner_name = old_owner.get_full_name() or  \
            old_owner.username
        new_owner_name = new_owner.get_full_name() or  \
            new_owner.username

        temp_loader = loader.get_template(
            'core/owner_transfer_notification.txt')
        context_dict = {
            'site': self.current_site,
            'old_owner_name': old_owner_name,
            'old_owner_uuid': old_owner.profile.uuid,
            'new_owner_name': new_owner_name,
            'new_owner_uuid': new_owner.profile.uuid,
            'data_set_name': self.data_set.name,
            'data_set_uuid': self.data_set.uuid,
            'groups_with_access': perm_groups.get('groups_with_access'),
            'groups_without_access': perm_groups.get('groups_without_access')
        }
        email = EmailMessage(
            subject,
            temp_loader.render(context_dict),
            to=[new_owner.email, old_owner.email]
        )
        email.send()
        return email

    def update_group_perms(self, new_owner):
        """
        Helper method which updates the groups access to the data set based
        on the new_owner's memberships
        transfer and which groups have access
        :param new_owner: data set's new owner obj
        """
        new_owner_group_ids = new_owner.groups.all().\
            values_list('id', flat=True)
        all_groups_with_ds_access = get_groups_with_perms(
            self.data_set, attach_perms=True
        )
        groups_with_access = []
        groups_without_access = []
        for group in all_groups_with_ds_access:
            group_details = {
                'name': group.extendedgroup.name,
                'profile': 'http://{}/groups/{}'.format(
                    self.current_site,
                    group.extendedgroup.uuid
                )
            }
            if group.id in new_owner_group_ids:
                groups_with_access.append(group_details)
            else:
                self.data_set.unshare(group)
                groups_without_access.append(group_details)

        return {"groups_with_access": groups_with_access,
                "groups_without_access": groups_without_access}


class AnalysisViewSet(APIView):
    """API endpoint that allows for Analyses to be retrieved or deleted"""
    http_method_names = ['get', 'delete']

    def get(self, request):
        data_set_uuid = request.query_params.get('dataSetUuid')
        paginator = LimitOffsetPagination()
        paginator.default_limit = 100

        # return cross-dataset analyses per user
        if data_set_uuid is None:
            data_sets = get_objects_for_user(request.user,
                                             'core.read_meta_dataset')
            filtered_analyses = Analysis.objects.filter(
                data_set__in=data_sets.values_list("id", flat=True)
            ).order_by('-time_start')
            paged_analyses = paginator.paginate_queryset(filtered_analyses,
                                                         request)
            serializer = AnalysisSerializer(paged_analyses, many=True)
            return Response(serializer.data)

        data_set = get_data_set_for_view_set(data_set_uuid)
        public_group = ExtendedGroup.objects.public_group()
        if not ('read_meta_dataset' in get_perms(public_group, data_set) or
                request.user.has_perm('core.read_meta_dataset', data_set)):
            return Response(data_set_uuid, status=status.HTTP_401_UNAUTHORIZED)

        analyses = Analysis.objects.filter(
            data_set=data_set
        ).order_by('-time_start')
        paged_analyses = paginator.paginate_queryset(analyses, request)
        serializer = AnalysisSerializer(paged_analyses, many=True)
        return Response(serializer.data)

    def delete(self, request, uuid):
        if not request.user.is_authenticated():
            return HttpResponseForbidden(
                content="User {} is not authenticated".format(request.user))
        else:
            try:
                analysis_deleted = Analysis.objects.get(uuid=uuid).delete()
            except NameError as e:
                logger.error(e)
                return HttpResponseBadRequest(content="Bad Request")
            except Analysis.DoesNotExist as e:
                logger.error(e)
                return HttpResponseNotFound(content="Analysis with UUID: {} "
                                                    "not found.".format(uuid))
            except Analysis.MultipleObjectsReturned as e:
                logger.error(e)
                return HttpResponseServerError(
                    content="Multiple Analyses returned for this request")
            else:
                if analysis_deleted[0]:
                    return Response({"data": analysis_deleted[1]})
                else:
                    return HttpResponseBadRequest(content=analysis_deleted[1])


class GroupViewSet(viewsets.ViewSet):
    """API endpoint for viewing groups."""
    http_method_names = ['get', 'delete', 'patch', 'post']
    lookup_field = 'uuid'

    def get_object(self, uuid):
        return get_group_for_view_set(uuid)

    def create(self, request):
        group_name = request.data.get('name')
        if request.user.is_anonymous():
            return Response(
                self.request.user, status=status.HTTP_401_UNAUTHORIZED
            )
        serializer = ExtendedGroupSerializer(data={'name': group_name})

        if serializer.is_valid():
            group = serializer.save()
            group.user_set.add(request.user)
            group.manager_group.user_set.add(request.user)
            return Response(serializer.data,
                            status=status.HTTP_201_CREATED)
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )

    def destroy(self, request, uuid):
        user = request.user
        group = self.get_object(uuid)
        if group.is_user_a_group_manager(user):
            group.delete()
            return Response(uuid)

        return Response('Only managers may delete groups',
                        status=status.HTTP_403_FORBIDDEN)

    def list(self, request):
        data_set_uuid = request.query_params.get('dataSetUuid')
        all_perms_flag = request.query_params.get('allPerms', False)

        if data_set_uuid is None:
            # returns member list, so must be logged in
            if request.user.is_anonymous():
                return Response(
                    self.request.user, status=status.HTTP_401_UNAUTHORIZED
                )
            query_set = ExtendedGroup.objects.all()
            context = {'data_set': None, 'user': request.user}
        else:
            data_set = get_data_set_for_view_set(data_set_uuid)
            context = {'data_set': data_set, 'user': request.user}

            public_group = ExtendedGroup.objects.public_group()
            if not ('read_meta_dataset' in get_perms(public_group, data_set) or
                    request.user.has_perm('core.read_meta_dataset', data_set)):
                return Response(data_set_uuid,
                                status=status.HTTP_403_FORBIDDEN)

            if all_perms_flag:
                # all groups user is member of
                query_set = ExtendedGroup.objects.all()

            else:
                # all groups associated with data set and user is a member of
                query_set = ExtendedGroup.objects.filter(
                    group_ptr__in=get_groups_with_perms(data_set)
                )

        member_groups = [group for group in query_set
                         if request.user in group.user_set.all() and
                         not group.is_manager_group()]

        serializer = ExtendedGroupSerializer(member_groups,
                                             many=True,
                                             context=context)
        return Response(serializer.data)

    def partial_update(self, request, uuid, format=None):
        data_set_uuid = request.data.get('dataSetUuid')
        group = self.get_object(uuid)

        data_set = get_data_set_for_view_set(data_set_uuid)
        if data_set.get_owner() != request.user:
            return Response(data_set_uuid, status=status.HTTP_403_FORBIDDEN)

        group_perm_update = request.data.get('perm_list')
        # remove all perms
        data_set.unshare(group)
        if group_perm_update.get('change'):
            # fields for share method: read_only, read_meta only
            data_set.share(group, False, False)
        elif group_perm_update.get('read'):
            data_set.share(group, True, False)
        elif group_perm_update.get('read_meta'):
            data_set.share(group, False, True)

        serializer = ExtendedGroupSerializer(group,
                                             context={'data_set': data_set,
                                                      'user': request.user})

        return Response(serializer.data)


class GroupMemberAPIView(APIView):
    """API endpoint that allows for Group Members to be promoted,
    demoted or removed"""
    http_method_names = ['delete', 'post']

    def get_object(self, uuid):
        return get_group_for_view_set(uuid)

    def get_user(self, id):
        try:
            return User.objects.get(id=id)
        except User.DoesNotExist as e:
            logger.error(e)
            raise Http404
        except User.MultipleObjectsReturned as e:
            logger.error(e)
            raise APIException("Multiple users returned for this request.")

    def post(self, request, uuid):
        # if group is a manager_group, user is promoted by adding to user set
        group = self.get_object(uuid)

        if group.is_user_a_group_manager(request.user):
            edit_user = self.get_user(request.data.get('userId'))
            if group.is_manager_group():
                group.user_set.add(edit_user)
                serializer = ExtendedGroupSerializer(group,
                                                     context={user: edit_user})
                return Response(serializer.data)
            return HttpResponseBadRequest(
                content="Manager groups are required to upgrade."
                )
        # not a group manager
        return Response(uuid, status=status.HTTP_403_FORBIDDEN)

    def delete(self, request, uuid, id):
        # if group is a manager_group, user is demoted by removal
        group = self.get_object(uuid)
        edit_user = self.get_user(id)
        if self.is_user_unauthorized_to_edit(group, request.user, edit_user):
            return Response(uuid, status=status.HTTP_403_FORBIDDEN)

        if group.id == settings.REFINERY_PUBLIC_GROUP_ID:
            return HttpResponseBadRequest(
                content="Users can not leave public group."
            )
        # Demote
        if group.is_manager_group():
            if len(group.user_set.all()) > 1:
                group.user_set.remove(edit_user)
                return Response(uuid)
            else:
                return HttpResponseBadRequest(
                    content="Last manager must delete group to leave."
                )
        # Leave
        if group.is_user_a_group_manager(edit_user):
            return HttpResponseBadRequest(
                content="Managers can not leave group. Demote user first."
            )
        if len(group.user_set.all()) > 0:
            group.user_set.remove(edit_user)
            return Response(uuid)
        return HttpResponseBadRequest(content="No users left in group.")

    def is_user_unauthorized_to_edit(self, group, request_user, edit_user):
        return not group.is_user_a_group_manager(request_user) \
               and request_user != edit_user


class InvitationViewSet(viewsets.ViewSet):
    """API endpoint for creating, getting, resending, & removing invitations"""
    http_method_names = ['delete', 'get', 'post', 'patch']
    lookup_field = 'id'

    def get_object(self, id):
        try:
            return Invitation.objects.get(id=id)
        except Invitation.DoesNotExist as e:
            logger.error(e)
            raise Http404
        except Invitation.MultipleObjectsReturned as e:
            logger.error(e)
            raise APIException("Multiple invitations returned for this "
                               "request.")

    def create(self, request):
        group_uuid = request.data.get('group_uuid')
        group = get_group_for_view_set(group_uuid)
        if not group.is_user_a_group_manager(request.user):
            return Response(id, status=status.HTTP_403_FORBIDDEN)

        serializer = InvitationSerializer(data=request.data)
        if serializer.is_valid():
            invite = serializer.save()
            invite.group_id = group.id
            invite.sender = request.user
            invite.token_uuid = uuid.uuid1()
            invite.token_duration = timedelta(days=settings.TOKEN_DURATION)
            invite.expires = timezone.now() + invite.token_duration
            invite.save()
            self.send_email(request, invite, group)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, id):
        group_uuid = request.data.get('group_uuid')
        group = get_group_for_view_set(group_uuid)
        invitation = self.get_object(id=id)
        if not group.is_user_a_group_manager(request.user):
            return Response(id, status=status.HTTP_403_FORBIDDEN)

        invitation.delete()
        return Response(id)

    def list(self, request):
        group_uuid = request.query_params.get('group_uuid')
        group = get_group_for_view_set(group_uuid)
        if not group.is_user_a_group_manager(request.user):
            return Response(group_uuid, status=status.HTTP_403_FORBIDDEN)

        invites = Invitation.objects.all().filter(group_id=group.id)\
            .order_by('-recipient_email')
        # Remove expired invites
        for invite in invites:
            if self.has_invite_expired(invite):
                invite.delete()

        serializer = InvitationSerializer(invites.all(), many=True)
        return Response(serializer.data)

    def partial_update(self, request, id):
        group_uuid = request.data.get('group_uuid')
        group = get_group_for_view_set(group_uuid)
        if not group.is_user_a_group_manager(request.user):
            return Response(id, status=status.HTTP_403_FORBIDDEN)

        invite = self.get_object(id)
        invite.token_duration = timedelta(days=settings.TOKEN_DURATION)
        invite.expires = timezone.now() + invite.token_duration
        invite.save()
        self.send_email(request, invite, group)
        serializer = InvitationSerializer(invite)
        return Response(serializer.data)

    def has_invite_expired(self, invite):
        return (
            timezone.now() - invite.expires
        ).total_seconds() >= 0

    def send_email(self, request, invitation, group):
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


class CustomRegistrationView(RegistrationView):
    success_url = "registration_complete"

    def register(self, request):
        """
        Given a username, email address, password, first name, last name,
        and affiliation, register a new user account, which will initially
        be inactive.

        Along with the new ``User`` object, a new
        ``core.models.CustomRegistrationProfile`` will be created,
        tied to that ``User``, containing the activation key which
        will be used for this account.

        An email will be sent to the administrator email address; this
        email should contain an activation link. The email will be
        rendered using two templates. See the documentation for
        ``CustomRegistrationProfile.custom_send_activation_email()`` for
        information about these templates and the contexts provided to
        them.

        After the ``User`` and ``CustomRegistrationProfile`` are created and
        the activation email is sent, the signal
        ``registration.signals.user_registered`` will be sent, with
        the new ``User`` as the keyword argument ``user`` and the
        class of this backend as the sender.

        """
        username = request.cleaned_data['username']
        email = request.cleaned_data['email']
        password = request.cleaned_data['password1']
        first_name = request.cleaned_data['first_name']
        last_name = request.cleaned_data['last_name']
        affiliation = request.cleaned_data['affiliation']

        if Site._meta.installed:
            site = Site.objects.get_current()
        else:
            site = RequestSite(request)

        # Create a new inactive User with the extra custom fields
        new_user = CustomRegistrationProfile.objects \
            .custom_create_inactive_user(
                username, email, password, site,
                first_name, last_name, affiliation)

        signals.user_registered.send(sender=self.__class__,
                                     user=new_user,
                                     request=request)
        return new_user

    def form_valid(self, form):
        if not self.request.recaptcha_is_valid:
            return render(
                self.request, "registration/registration_form.html",
                {
                    "form": form,
                    "recaptcha_error_message": "* Could not verify reCAPTCHA"
                }, status=400
            )
        return super(CustomRegistrationView, self).form_valid(form)


class OpenIDToken(APIView):
    """Registers (or retrieves) a Cognito IdentityId and an OpenID Connect
    token for a user authenticated by Django authentication process

    Requires:
    * server must have access to AWS Cognito API
    * Cognito identity pool with Refinery configured as a custom auth provider
    """
    authentication_classes = (authentication.SessionAuthentication,)
    permission_classes = (IsAuthenticated,)
    renderer_classes = (JSONRenderer,)

    def post(self, request):
        try:
            client = boto3.client('cognito-identity',
                                  region_name=settings.REFINERY_AWS_REGION)
        except botocore.exceptions.NoRegionError as exc:
            message = "Server AWS configuration is incorrect: {}".format(exc)
            logger.error(message)
            return api_error_response(
                message, status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            token = client.get_open_id_token_for_developer_identity(
                IdentityPoolId=settings.COGNITO_IDENTITY_POOL_ID,
                Logins={'login.refinery': request.user.username}
            )
        except (botocore.exceptions.ClientError,
                botocore.exceptions.ParamValidationError) as exc:
            message =\
                "Could not obtain OpenID token for " \
                "user '{}' in Identity Pool '{}': {}".format(
                    request.user.username, settings.COGNITO_IDENTITY_POOL_ID,
                    exc
                )
            logger.error(message)
            return api_error_response(
                message, status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        token["Region"] = settings.REFINERY_AWS_REGION

        return Response(token)


class SiteProfileViewSet(APIView):
    """API endpoint that allows for SiteProfileViewSet to be edited.
     ---
    #YAML

    PATCH:
        parameters_strategy:
        form: replace
        query: merge

        parameters:
            - name: about_markdown
              description: Markdown paragraph
              type: string
              paramType: form
              required: false
            - name: intro_markdown
              description: Markdown paragraph
              type: string
              paramType: form
              required: false
            - name: twitter_username
              description: twitter user name to display twitter feed
              type: string
              paramType: form
              required: false
            - name: site_videos
              description: string object with source, source ids, and captions
              type: string
              paramType: form
              required: false
    ...
    """
    http_method_names = ["get", "patch"]

    def get(self, request):
        try:
            site_profile = SiteProfile.objects.get(
                site=get_current_site(request)
            )
        except SiteProfile.DoesNotExist as e:
            logger.error("Site profile for the current site does not exist.")
            return HttpResponseNotFound(e)
        except SiteProfile.MultipleObjectsReturned:
            logger.error("Multiple site profiles for current site error.")
            return HttpResponseServerError(e)

        serializer = SiteProfileSerializer(site_profile)
        return Response(serializer.data)

    def patch(self, request):
        if not request.user.is_superuser:
            return Response(
                self.request.user, status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            site_profile = SiteProfile.objects.get(
                site=get_current_site(request)
            )
        except SiteProfile.DoesNotExist as e:
            logger.error("Site profile for the current site does not exist.")
            return HttpResponseNotFound(e)
        except SiteProfile.MultipleObjectsReturned:
            logger.error("Multiple site profiles for current site error.")
            return HttpResponseServerError(e)

        site_videos = request.data.get('site_videos')
        # remove unlisted videos
        if site_videos is not None:
            db_site_videos = SiteVideo.objects.filter(
                site_profile=site_profile
            )
            new_video_list = json.loads(request.data.getlist('site_videos')[0])
            new_video_list_ids = [vid.get('id') for vid in new_video_list]
            # delete unused videos
            for video in db_site_videos:
                if video.id not in new_video_list_ids:
                    video.delete()
            # add new videos or update exisiting videos
            for new_video_data in new_video_list:
                try:
                    db_video = SiteVideo.objects.get(
                        id=new_video_data.get('id')
                    )
                except SiteVideo.MultipleObjectsReturned as e:
                    logger.error("Duplicate site videos found for id %s."
                                 % new_video_data.get('id'))
                    return HttpResponseServerError(e)
                except SiteVideo.DoesNotExist:
                    vid_serializer = SiteVideoSerializer(data=new_video_data)
                else:
                    vid_serializer = SiteVideoSerializer(db_video,
                                                         data=new_video_data,
                                                         partial=True)
                if vid_serializer.is_valid():
                    vid_serializer.save()

        serializer = SiteProfileSerializer(site_profile,
                                           data=request.data,
                                           partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data, status=status.HTTP_202_ACCEPTED
            )
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )


class UserProfileViewSet(APIView):
    """API endpoint that allows for UserProfiles to be edited.
     ---
    #YAML

    PATCH:
        parameters_strategy:
        form: replace
        query: merge

        parameters:
            - name: uuid
              description: User profile uuid used as an identifier
              type: string
              paramType: path
              required: true
            - name: primary_group
              description: group id
              type: int
              paramType: form
              required: false
    ...
    """
    http_method_names = ["patch"]

    def patch(self, request, uuid):
        if request.user.is_anonymous():
            return Response(
                self.request.user, status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = UserProfileSerializer(request.user.profile,
                                           data=request.data,
                                           partial=True,
                                           context={'request': request})

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data, status=status.HTTP_202_ACCEPTED
            )
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )


@staff_member_required
def site_statistics(request, **kwargs):
    site_statistics_type = kwargs.get("type")
    response = HttpResponse()
    writer = csv.writer(response)
    writer.writerow(SiteStatistics.CSV_COLUMN_HEADERS)

    queryset = SiteStatistics.objects.all().order_by("run_date")
    if site_statistics_type == "deltas":
        queryset = queryset[1:]
    for site_statistics_instance in queryset:
        writer.writerow(
            site_statistics_instance.get_csv_row(
                aggregates=(site_statistics_type == "totals")
            )
        )
    return response


class ObtainAuthTokenValidSession(ObtainAuthToken):
    """
    Allow authenticated Users to obtain a DRF API V2 auth token
    """
    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        token, created = Token.objects.get_or_create(user=request.user)
        return JsonResponse({'token': token.key})
