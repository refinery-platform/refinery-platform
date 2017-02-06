import json
import logging
import os
import re
import urllib
from urlparse import urljoin
import xmltodict

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.sites.models import get_current_site, RequestSite, Site
from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from django.http import (Http404, HttpResponse, HttpResponseBadRequest,
                         HttpResponseForbidden, HttpResponseNotFound,
                         HttpResponseRedirect, HttpResponseServerError)

from django.shortcuts import get_object_or_404, render_to_response
from django.template import loader, RequestContext
from django.views.decorators.gzip import gzip_page

from guardian.shortcuts import get_perms
from guardian.utils import get_anonymous_user
from registration import signals
from registration.views import RegistrationView
import requests
from requests.exceptions import HTTPError
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from xml.parsers.expat import ExpatError

from .forms import (DataSetForm, ProjectForm, UserForm, UserProfileForm,
                    WorkflowForm)
from .models import (Analysis, CustomRegistrationProfile, DataSet,
                     ExtendedGroup, Invitation, NodeGroup, Ontology, Project,
                     UserProfile, Workflow, WorkflowEngine)
from .serializers import (DataSetSerializer, NodeGroupSerializer,
                          NodeSerializer, WorkflowSerializer)
from .utils import (create_current_selection_node_group,
                    filter_nodes_uuids_in_solr,
                    get_data_sets_annotations, move_obj_to_front)
from annotation_server.models import GenomeBuild
from data_set_manager.models import Node
from data_set_manager.utils import generate_solr_params
from file_store.models import FileStoreItem
from visualization_manager.views import igv_multi_species

logger = logging.getLogger(__name__)


def home(request):
    return render_to_response(
        'core/home.html',
        {
            'public_group_id': settings.REFINERY_PUBLIC_GROUP_ID,
            'main_container_no_padding': True,
            'num_ontologies_imported': Ontology.objects.count()
        },
        context_instance=RequestContext(request)
    )


def about(request):
    return render_to_response('core/about.html',
                              {'site_name': get_current_site(request).name},
                              context_instance=RequestContext(request))


def contact(request):
    return render_to_response('core/contact.html', {},
                              context_instance=RequestContext(request))


def statistics(request):
    return render_to_response('core/statistics.html', {},
                              context_instance=RequestContext(request))


@login_required
def collaboration(request):
    return render_to_response('core/collaboration.html', {},
                              context_instance=RequestContext(request))


@login_required
def group_invite(request, token):
    inv_list = Invitation.objects.filter(token_uuid=token)
    if len(inv_list) == 0:
        return render_to_response(
            'core/group_invite.html',
            {
                'site': get_current_site(request),
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
                'site': get_current_site(request),
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
            'site': get_current_site(request),
            'message': '%s has been added to the group %s.' %
                       (user.username, ext_group.name),
            'user': user,
            'ext_group': ext_group
        },
        context_instance=RequestContext(request))


def custom_error_page(request, template, context_dict):
    temp_loader = loader.get_template(template)
    context = RequestContext(request, context_dict)
    return temp_loader.render(context)


@login_required()
def user(request, query):
    try:
        user = User.objects.get(username=query)
    except User.DoesNotExist:
        user = get_object_or_404(UserProfile, uuid=query).user

    return render_to_response('core/user.html', {'profile_user': user},
                              context_instance=RequestContext(request))


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


def project_slug(request, slug):
    p = get_object_or_404(Project, slug=slug)
    return project(request, p.uuid)


def project(request, uuid):
    project = get_object_or_404(Project, uuid=uuid)
    public_group = ExtendedGroup.objects.public_group()

    if not request.user.has_perm('core.read_project', project):
        if 'read_project' not in get_perms(public_group, project):
            if request.user.is_authenticated():
                return HttpResponseForbidden(
                    custom_error_page(
                        request, '403.html', {
                            user: request.user,
                            'msg': "view this project"
                        }))
            else:
                return HttpResponse(
                    custom_error_page(
                        request, '401.html', {'msg': "view this project"}),
                    status='401')
    analyses = project.analyses.all()
    return render_to_response('core/project.html',
                              {'project': project, "analyses": analyses},
                              context_instance=RequestContext(request))


@login_required()
def project_new(request):
    if request.method == "POST":  # If the form has been submitted
        form = ProjectForm(request.POST)  # A form bound to the POST data
        if form.is_valid():  # All validation rules pass
            project = form.save()
            project.set_owner(request.user)
            # Process the data in form.cleaned_data
            return HttpResponseRedirect(
                reverse('project', args=(project.uuid,))
            )  # Redirect after POST
    else:
        form = ProjectForm()  # An unbound form
    return render_to_response("core/project_new.html", {'form': form},
                              context_instance=RequestContext(request))


@login_required()
def project_edit(request, uuid):
    project = get_object_or_404(Project, uuid=uuid)

    if not request.user.has_perm('core.change_project', project):
        return HttpResponseForbidden(
            custom_error_page(request, '403.html',
                              {user: request.user, 'msg': "edit this project"})
        )
    if request.method == "POST":  # If the form has been submitted
        # A form bound to the POST data
        form = ProjectForm(data=request.POST, instance=project)
        if form.is_valid():  # All validation rules pass
            form.save()
            # Process the data in form.cleaned_data
            return HttpResponseRedirect(
                reverse('core.views.project', args=(uuid,)))
    else:
        form = ProjectForm(instance=project)  # An unbound form
    return render_to_response("core/project_edit.html",
                              {'form': form, 'project': project},
                              context_instance=RequestContext(request))


def data_set_slug(request, slug):
    d = get_object_or_404(DataSet, slug=slug)
    return data_set(request, d.uuid)


def data_set(request, data_set_uuid, analysis_uuid=None):
    data_set = get_object_or_404(DataSet, uuid=data_set_uuid)
    public_group = ExtendedGroup.objects.public_group()

    if not request.user.has_perm('core.read_dataset', data_set):
        if 'read_dataset' not in get_perms(public_group, data_set):
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
    # TODO: catch errors
    isatab_archive = None
    pre_isatab_archive = None
    try:
        if investigation.isarchive_file is not None:
            isatab_archive = FileStoreItem.objects.get(
                uuid=investigation.isarchive_file)
    except:
        pass
    try:
        if investigation.pre_isarchive_file is not None:
            pre_isatab_archive = FileStoreItem.objects.get(
                uuid=investigation.pre_isarchive_file)
    except:
        pass
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
            "isatab_archive": isatab_archive,
            "pre_isatab_archive": pre_isatab_archive,
        },
        context_instance=RequestContext(request))


def data_set2(request, data_set_uuid, analysis_uuid=None):
    data_set = get_object_or_404(DataSet, uuid=data_set_uuid)
    public_group = ExtendedGroup.objects.public_group()

    if not request.user.has_perm('core.read_dataset', data_set):
        if 'read_dataset' not in get_perms(public_group, data_set):
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
    # TODO: catch errors
    isatab_archive = None
    pre_isatab_archive = None
    try:
        if investigation.isarchive_file is not None:
            isatab_archive = FileStoreItem.objects.get(
                uuid=investigation.isarchive_file)
    except:
        pass
    try:
        if investigation.pre_isarchive_file is not None:
            pre_isatab_archive = FileStoreItem.objects.get(
                uuid=investigation.pre_isarchive_file)
    except:
        pass
    return render_to_response(
        'core/data_set2.html',
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
            "isatab_archive": isatab_archive,
            "pre_isatab_archive": pre_isatab_archive,
        },
        context_instance=RequestContext(request))


def data_set_edit(request, uuid):
    data_set = get_object_or_404(DataSet, uuid=uuid)

    if not request.user.has_perm('core.change_dataset', data_set):
        if request.user.is_authenticated():
            return HttpResponseForbidden(
                custom_error_page(request, '403.html',
                                  {user: request.user,
                                   'msg': "edit this data set"})
            )
        else:
            return HttpResponse(
                custom_error_page(request, '401.html',
                                  {'msg': "edit this data set"}),
                status='401'
            )
    # get studies
    investigation = data_set.get_investigation()
    studies = investigation.study_set.all()
    study_uuid = studies[0].uuid
    assay_uuid = studies[0].assay_set.all()[0].uuid
    # TODO: catch errors
    isatab_archive = None
    pre_isatab_archive = None

    try:
        if investigation.isarchive_file is not None:
            isatab_archive = FileStoreItem.objects.get(
                uuid=investigation.isarchive_file
            )
    except:
        pass
    try:
        if investigation.pre_isarchive_file is not None:
            pre_isatab_archive = FileStoreItem.objects.get(
                uuid=investigation.pre_isarchive_file)
    except:
        pass

    if request.method == "POST":  # If the form has been submitted
        # A form bound to the POST data
        form = DataSetForm(data=request.POST, instance=data_set)
        if form.is_valid():  # All validation rules pass
            form.save()
            # Process the data in form.cleaned_data
            # Redirect after POST
            return HttpResponseRedirect(
                reverse('core.views.data_set', args=(uuid,)))
    else:
        form = DataSetForm(instance=data_set)  # An unbound form
    return render_to_response('core/data_set_edit.html',
                              {
                                  'data_set': data_set,
                                  "studies": studies,
                                  "study_uuid": study_uuid,
                                  "assay_uuid": assay_uuid,
                                  "isatab_archive": isatab_archive,
                                  "pre_isatab_archive": pre_isatab_archive,
                                  'form': form
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


def graph_node_shape(node_type):
    if node_type == "input":
        return ">"

    if node_type == "tool":
        return "<"

    return "o"


@login_required()
def workflow_edit(request, uuid):
    workflow = get_object_or_404(Workflow, uuid=uuid)
    if not request.user.has_perm('core.change_workflow', workflow):
        return HttpResponseForbidden(
            custom_error_page(request, '403.html',
                              {user: request.user,
                               'msg': "edit this workflow"}))
    if request.method == "POST":  # If the form has been submitted...
        # A form bound to the POST data
        form = WorkflowForm(data=request.POST, instance=workflow)
        if form.is_valid():  # All validation rules pass
            form.save()
            # Process the data in form.cleaned_data
            return HttpResponseRedirect(
                reverse('core.views.workflow', args=(uuid,)))
    else:
        form = WorkflowForm(instance=workflow)  # An unbound form
    return render_to_response('core/workflow_edit.html',
                              {'workflow': workflow, 'form': form},
                              context_instance=RequestContext(request))


def workflow_engine(request, uuid):
    workflow_engine = get_object_or_404(WorkflowEngine, uuid=uuid)
    public_group = ExtendedGroup.objects.public_group()

    if not request.user.has_perm('core.read_workflowengine', workflow_engine):
        if 'read_workflowengine' not in get_perms(public_group,
                                                  workflow_engine):
            if request.user.is_authenticated():
                return HttpResponseForbidden(
                    custom_error_page(request, '403.html',
                                      {user: request.user,
                                       'msg': "view this workflow engine"}))
            else:
                return HttpResponse(
                    custom_error_page(request, '401.html',
                                      {'msg': "view this workflow engine"}),
                    status='401')
    return render_to_response('core/workflow_engine.html',
                              {'workflow_engine': workflow_engine},
                              context_instance=RequestContext(request))


def analyses(request, project_uuid):
    project = Project.objects.get(uuid=project_uuid)
    analyses = project.analyses.all()
    return render_to_response('core/analyses.html',
                              {"project": project, "analyses": analyses},
                              context_instance=RequestContext(request))


@login_required()
def analysis(request, analysis_uuid):
    # TODO: handle DoesNotExist and MultipleObjectsReturned
    analysis = Analysis.objects.get(uuid=analysis_uuid)
    # project associated with this Analysis
    project = analysis.project
    # list of analysis inputs
    data_inputs = analysis.workflow_data_input_maps.order_by('pair_id')
    # list of analysis results
    analysis_results = analysis.results
    workflow = analysis.workflow
    # getting file_store references
    file_all = []
    for i in analysis_results.all():
        file_store_uuid = i.file_store_uuid
        fs = FileStoreItem.objects.get(uuid=file_store_uuid)
        file_all.append(fs)
    # NG: get file_store items for inputs
    input_filenames = []
    for workflow_input in data_inputs.all():
        file_uuid = Node.objects.get(uuid=workflow_input.data_uuid).file_uuid
        file_store_item = FileStoreItem.objects.get_item(uuid=file_uuid)
        if file_store_item:
            file_path = file_store_item.get_absolute_path()
            if file_path:
                file_name = os.path.basename(file_path)
                input_filenames.append(file_name)
    return render_to_response('core/analysis.html',
                              {
                                  "analysis": analysis,
                                  "analysis_results": analysis_results,
                                  "inputs": data_inputs,
                                  "input_filenames": input_filenames,
                                  "project": project,
                                  "workflow": workflow,
                                  "fs_files": file_all
                              },
                              context_instance=RequestContext(request))


def visualize_genome(request):
    """Provide IGV.js visualization of requested species + file nodes

    Looks up species by name, and data files by node_id,
    and passes the information to IGV.js.
    """
    species = request.GET.get('species')
    node_ids = request.GET.getlist('node_ids')

    genome = re.search(r'\(([^)]*)\)', species).group(1)
    # TODO: Better to pass genome id instead of parsing?
    url_base = "https://s3.amazonaws.com/data.cloud.refinery-platform.org" \
        + "/data/igv-reference/" + genome + "/"
    node_ids_json = json.dumps(node_ids)

    return render_to_response(
          'core/visualize/genome.html',
          {
              "fasta_url": url_base + genome + ".fa",
              "index_url": url_base + genome + ".fa.fai",
              "cytoband_url": url_base + "cytoBand.txt",
              "bed_url": url_base + "refGene.bed",
              "tbi_url": url_base + "refGene.bed.tbi",
              "node_ids_json": node_ids_json
          },
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

            response = json.dumps(response)

    return HttpResponse(response, content_type='application/json')


def solr_select(request, core):
    # core format is <name_of_core>
    # query.GET is a querydict containing all parts of the query
    url = settings.REFINERY_SOLR_BASE_URL + core + "/select"
    data = request.GET.urlencode()
    try:
        full_response = requests.get(url, params=data)
        # FIXME:
        # Solr sends back an additional 400 here in the data_sets 1 filebrowser
        # when there is only one row defined in the metadata since
        # full_response.content has no facet_fields. Handling
        # this one-off case for now since the way data_sets 2 filebrowser
        # interacts with Solr doesn't produce this extra 400 error
        if ("Pivot Facet needs at least one field name"
                not in full_response.content):
            full_response.raise_for_status()
    except HTTPError as e:
        logger.error(e)
        response = json.dumps({})
    else:
        response = full_response.content
    return HttpResponse(response, content_type='application/json')


def solr_igv(request):
    """Function for taking solr request url.
    Removes pagination, facets from input query to create multiple
    :param request: Django HttpRequest object including solr query
    :type source: HttpRequest object.
    :returns:
    """

    # copy querydict to make it editable
    if request.is_ajax():
        igv_config = json.loads(request.body)

        logger.debug(json.dumps(igv_config, indent=4))

        logger.debug('IGV data query: ' + str(igv_config['query']))
        logger.debug('IGV annotation query: ' + str(igv_config['annotation']))

        if igv_config['query'] is None:
            # generate solr_query method
            # assay uuid
            solr_query = generate_solr_params({}, igv_config['assay_uuid'])
            url_path = '/'.join(["data_set_manager", "select"])
            url = urljoin(settings.REFINERY_SOLR_BASE_URL, url_path)
            igv_config['query'] = ''.join([url, '/?', solr_query])

        # attributes associated with node selection from interface
        node_selection_blacklist_mode = igv_config[
            'node_selection_blacklist_mode']
        node_selection = igv_config['node_selection']

        solr_results = get_solr_results(
            igv_config['query'], selected_mode=node_selection_blacklist_mode,
            selected_nodes=node_selection)

        if igv_config['annotation'] is not None:
            solr_annot = get_solr_results(igv_config['annotation'])
        else:
            solr_annot = None
        # if solr query returns results
        if solr_results:
            try:
                session_urls = igv_multi_species(solr_results, solr_annot)
            except GenomeBuild.DoesNotExist:
                logger.error(
                    "Provided genome build cannot be found in the database.")
                session_urls = "Couldn't find the provided genome build."

        logger.debug("session_urls")
        logger.debug(json.dumps(session_urls, indent=4))

        return HttpResponse(json.dumps(session_urls),
                            content_type='application/json')


def get_solr_results(query, facets=False, jsonp=False, annotation=False,
                     only_uuids=False, selected_mode=True,
                     selected_nodes=None):
    """Helper function for taking solr request url.
    Removes facet requests, converts to json, from input solr query
    :param query: solr http query string
    :type query: string
    :param facets: Removes facet query from solr query string
    :type facets: boolean
    :param jsonp: Removes JSONP query from solr query string
    :type jsonp: boolean
    :param only_uuids: Returns list of file_uuids from all solr results
    :type only_uuids: boolean
    :param selected_mode: UI selection mode (blacklist or whitelist)
    :type selected_mode: boolean
    :param selected_nodes: List of UUIDS to remove from the solr query
    :type selected_nodes: array
    :returns: dictionary of current solr results
    """
    logger.debug("core.views: get_solr_results")
    if not facets:
        # replacing facets w/ false
        query = query.replace('facet=true', 'facet=false')
    if not jsonp:
        # ensuring json not jsonp response
        query = query.replace('&json.wrf=?', '')
    if annotation:
        # changing annotation
        query = query.replace('is_annotation:false', 'is_annotation:true')
    # Checks for limit on solr query
    # replaces i.e. '&rows=20' to '&rows=10000'
    m_obj = re.search(r"&rows=(\d+)", query)
    if m_obj:
        # TODO: replace 10000 with settings parameter for max solr results
        replace_rows_str = '&rows=' + str(10000)
        query = query.replace(m_obj.group(), replace_rows_str)

    try:
        # opening solr query results
        results = requests.get(query, stream=True)
        results.raise_for_status()
    except HTTPError as e:
        logger.error(e)
        return HttpResponseServerError(e)

    # converting results into json for python
    results = json.loads(results.content)

    # IF list of nodes to remove from query exists
    if selected_nodes:
        # need to iterate over list backwards to properly delete from a list
        for i in xrange(len(results["response"]["docs"]) - 1, -1, -1):
            node = results["response"]["docs"][i]

            # blacklist mode (remove uuid's from solr query)
            if selected_mode:
                if 'uuid' in node:
                    # if the current node should be removed from the results
                    if node['uuid'] in selected_nodes:
                        del results["response"]["docs"][i]
                        # num_found -= 1
            # whitelist mode (add's uuids from solr query)
            else:
                if 'uuid' in node:
                    # if the current node should be removed from the results
                    if node['uuid'] not in selected_nodes:
                        del results["response"]["docs"][i]
                        # num_found += 1
    # Will return only list of file_uuids
    if only_uuids:
        ret_file_uuids = []
        solr_results = results["response"]["docs"]
        for res in solr_results:
            ret_file_uuids.append(res["uuid"])
        return ret_file_uuids

    return results


def samples_solr(request, ds_uuid, study_uuid, assay_uuid):
    logger.debug("core.views.samples_solr called")
    data_set = get_object_or_404(DataSet, uuid=ds_uuid)
    workflows = Workflow.objects.all()
    # TODO: retrieve from Django settings
    solr_url = 'http://127.0.0.1:8983'

    return render_to_response('core/samples_solr.html',
                              {'workflows': workflows,
                               'data_set': data_set,
                               'study_uuid': study_uuid,
                               'assay_uuid': assay_uuid,
                               'solr_url': solr_url},
                              context_instance=RequestContext(request))


def doi(request, id):
    """Forwarding requests to DOI's API"""
    # Decode URL and replace dollar signs by forward slashes
    # This encoding is needed because forward slashes cause 404 errors even
    # when they are URL encoded as they are still regarded as forward
    # slashes.
    id = urllib.unquote(id).decode('utf8')
    id = id.replace('$', '/')
    url = "https://dx.doi.org/{id}".format(id=id)
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

    return HttpResponse(
        json.dumps(response_dict),
        content_type='application/json'
    )


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


def fastqc_viewer(request):
    return render_to_response('core/fastqc-viewer.html', {},
                              context_instance=RequestContext(request))


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
    http_method_names = ['get']


class NodeViewSet(viewsets.ModelViewSet):
    """API endpoint that allows Nodes to be viewed"""
    queryset = Node.objects.all()
    serializer_class = NodeSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
    # permission_classes = (IsAuthenticated,)


class DataSetsViewSet(APIView):
    """API endpoint that allows for DataSets to be deleted"""
    http_method_names = ['delete', 'patch']

    def get_object(self, uuid):
        try:
            return DataSet.objects.get(uuid=uuid)
        except DataSet.DoesNotExist as e:
            logger.error(e)
            return Response(uuid, status=status.HTTP_404_NOT_FOUND)
        except DataSet.MultipleObjectsReturned as e:
            logger.error(e)
            return Response(
                uuid, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def is_user_authorized(self, user, data_set):
        if (not user.is_authenticated() or
                not user.has_perm('core.change_dataset', data_set)):
            return False
        else:
            return True

    def delete(self, request, uuid):
        if not request.user.is_authenticated():
            return HttpResponseForbidden(
                content="User {} is not authenticated".format(request.user))
        else:
            try:
                dataset_deleted = DataSet.objects.get(uuid=uuid).delete()
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
            else:
                if dataset_deleted[0]:
                    return Response({"data": dataset_deleted[1]})
                else:
                    return HttpResponseBadRequest(content=dataset_deleted[1])

    def patch(self, request, uuid, format=None):
        data_set = self.get_object(uuid)

        # check edit permission for user
        if self.is_user_authorized(request.user, data_set):
            serializer = DataSetSerializer(
               data_set, data=request.data, partial=True
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
                data_set, status=status.HTTP_401_UNAUTHORIZED
            )


class AnalysesViewSet(APIView):
    """API endpoint that allows for Analyses to be deleted"""
    http_method_names = ['delete']

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


class CustomRegistrationView(RegistrationView):

    def register(self, request, **cleaned_data):
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
        username = cleaned_data['username']
        email = cleaned_data['email']
        password = cleaned_data['password1']
        first_name = cleaned_data['first_name']
        last_name = cleaned_data['last_name']
        affiliation = cleaned_data['affiliation']

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

    def get_success_url(self, request, user):
        """
        Return the name of the URL to redirect to after successful
        user registration.

        """
        return ('registration_complete', (), {})


class NodeGroups(APIView):
    """
    Return NodeGroups object

    ---
    #YAML

    GET:
        serializer: NodeGroupSerializer
        omit_serializer: false

        parameters:
            - name: uuid
              description: NodeGroup uuid
              paramType: query
              type: string
              required: false

            - name: assay
              description: Assay uuid or ids
              paramType: query
              type: string

    POST:
        consumes:
            - application/json
        produces:
            - application/json
        parameters:
            - name: name
              description: Name of node group
              paramType: form
              type: string
              required: true

            - name: study
              description: Study uuid or ids
              paramType: form
              type: string
              required: true

            - name: assay
              description: Assay uuid or ids
              paramType: form
              type: string
              required: true

            - name: is_current
              description: The "current selection" node set for the study/assay
              paramType: form
              type: boolean
              required: false

            - name: nodes
              description: uuids of nodes in group expect format uuid,uuid,uuid
              paramType: form
              type: array
              required: false

            - name: use_complement_nodes
              description: True will subtract nodes from all assay file nodes
              paramType: form
              type: boolean
              require: false

            - name: filter_attribute
              description: Filters for attributes fields {solr_name:[field]}
              paramType: form
              type: string
              required: false


    PUT:
        parameters_strategy:
        form: replace
        query: merge

        parameters:
            - name: uuid
              description: Node Group Uuid
              paramType: form
              type: string
              required: true

            - name: is_current
              description: The "current selection" node set for the study/assay
              paramType: form
              type: boolean
              required: false

            - name: nodes
              description: Uuids of nodes in group expect format uuid,uuid,uuid
              paramType: form
              type: array
              required: false

            - name: use_complement_nodes
              description: True will subtract nodes from all assay file nodes
              paramType: form
              type: boolean
              require: false

            - name: filter_attribute
              description: Filters for attributes fields {solr_name:[field]}
              paramType: form
              type: string
              required: false
    ...
    """

    def get_object(self, uuid):
        try:
            return NodeGroup.objects.get(uuid=uuid)
        except (NodeGroup.DoesNotExist,
                NodeGroup.MultipleObjectsReturned) as e:
            raise Http404(e)

    def get(self, request, format=None):
        # Expects a uuid or assay uuid.
        if request.query_params.get('uuid'):
            node_group = self.get_object(request.query_params.get('uuid'))
            serializer = NodeGroupSerializer(node_group)
        elif request.query_params.get('assay'):
            assay_uuid = request.query_params.get('assay')
            node_groups = NodeGroup.objects.filter(assay__uuid=assay_uuid)
            # If filter returns empty response
            if not node_groups:
                # Returns Response: created current_selection group or errors
                return create_current_selection_node_group(assay_uuid)
            # Serialize list of node_groups
            serializer = NodeGroupSerializer(node_groups, many=True)
            # Move current_selection to front of the list, if not already
            if serializer.data[0].get('name') != 'Current Selection':
                # Helper method returns array with current selection node first
                return Response(move_obj_to_front(serializer.data, 'name',
                                                  'Current Selection'))
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Return node_group or list of assay's node_groups
        return Response(serializer.data)

    def post(self, request, format=None):
        # Swagger issue: put/post queryDict, make data mutable to update nodes
        # Convert to dict for ease
        if 'form-urlencoded' in request.content_type:
            param_dict = {}
            for key in request.data:
                if key == 'nodes':
                    param_dict[key] = request.data.get(
                        key).replace(' ', '').split(',')
                elif key == 'use_complement_nodes':
                    # correct type to boolean, used in conditional below
                    param_dict[key] = json.loads(request.data.get(key))
                else:
                    param_dict[key] = request.data.get(key)
        else:
            param_dict = request.data

        # Nodes list updated with remaining nodes after subtraction
        if param_dict.get('use_complement_nodes'):
            filtered_uuid_list = filter_nodes_uuids_in_solr(
                param_dict.get('assay'),
                param_dict.get('nodes'),
                param_dict.get('filter_attribute')
            )
            param_dict['nodes'] = filtered_uuid_list

        serializer = NodeGroupSerializer(data=param_dict)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, format=None):
        try:
            uuid = request.data.get('uuid')
        except:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Swagger issue: put/post queryDict, make data mutable to update nodes
        # Convert to dict for ease
        if 'form-urlencoded' in request.content_type:
            param_dict = {}
            for key in request.data:

                if key == 'nodes':
                    param_dict[key] = request.data.get(
                        key).replace(' ', '').split(',')
                elif key == 'use_complement_nodes':
                    # correct type to boolean, used in conditional below
                    param_dict[key] = json.loads(request.data.get(key))
                else:
                    param_dict[key] = request.data.get(key)
        else:
            param_dict = request.data

        # Nodes list updated with remaining nodes after subtraction
        if param_dict.get('use_complement_nodes'):
            filtered_uuid_list = filter_nodes_uuids_in_solr(
                param_dict.get('assay'),
                param_dict.get('nodes'),
                param_dict.get('filter_attribute')
            )
            param_dict['nodes'] = filtered_uuid_list
        node_group = self.get_object(uuid)
        serializer = NodeGroupSerializer(node_group, data=param_dict,
                                         partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
