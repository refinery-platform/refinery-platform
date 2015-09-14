import json
import os
import re
import urllib
import xmltodict

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.sites.models import get_current_site
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.urlresolvers import reverse
from django.http import (
    HttpResponse, HttpResponseForbidden, HttpResponseRedirect
)
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext, loader

from guardian.shortcuts import (
    get_objects_for_group, get_objects_for_user, get_perms
)
import requests

from core.forms import (
    ProjectForm, UserForm, UserProfileForm, WorkflowForm, DataSetForm
)
from core.models import (
    ExtendedGroup, Project, DataSet, Workflow, UserProfile, WorkflowEngine,
    Analysis, get_shared_groups, Invitation
)
from data_set_manager.models import *
from galaxy_connector.models import Instance
from visualization_manager.views import igv_multi_species
from annotation_server.models import GenomeBuild
from file_store.models import FileStoreItem


logger = logging.getLogger(__name__)


def home(request):
    return render_to_response(
        'core/home.html',
        {
            'public_group_id': settings.REFINERY_PUBLIC_GROUP_ID,
            'main_container_no_padding': True
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
            'message': '%s has been added to the group %s!' %
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

    if (len(get_shared_groups(request.user, user)) == 0 and
            user != request.user):
        return HttpResponseForbidden(
            custom_error_page(
                request, '403.html',
                {'user': request.user,
                 'msg': "view the profile of user %s" % user.username}
            )
        )
    return render_to_response('core/user.html', {'profile_user': user},
                              context_instance=RequestContext(request))


@login_required()
def user_profile(request):
    return user(request, request.user.get_profile().uuid)


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
    return user_edit(request, request.user.get_profile().uuid)


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


def data_set_edit(request, uuid):
    data_set = get_object_or_404(DataSet, uuid=uuid)
    public_group = ExtendedGroup.objects.public_group()

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


def solr_core_search(request):
    """Augmenting Solr queries to ensure only allowed access, is currently only
    available for querying core indexes
    """
    url = settings.REFINERY_SOLR_BASE_URL + "core/select"
    data = request.GET.dict()
    # Generate access list
    if not request.user.is_superuser:
        if request.user.id is None:
            access = ['g_{}'.format(settings.REFINERY_PUBLIC_GROUP_ID)]
        else:
            access = ['u_{}'.format(request.user.id)]
            for group in request.user.groups.all():
                access.append('g_{}'.format(group.id))
        data['fq'] = data['fq'] + ' AND access:({})'.format(
            ' OR '.join(access))
    req = urllib2.Request(url, urllib.urlencode(data))
    f = urllib2.urlopen(req)
    response = f.read()
    f.close()
    return HttpResponse(response, mimetype='application/json')


def solr_select(request, core):
    # core format is <name_of_core>
    # query.GET is a querydict containing all parts of the query
    # TODO: handle runtime errors when making GET request
    url = settings.REFINERY_SOLR_BASE_URL + core + "/select"
    data = request.GET.urlencode()
    req = urllib2.Request(url, data)  # {'Content-Type': 'application/json'})

    f = urllib2.urlopen(req)

    response = f.read()
    f.close()
    return HttpResponse(response, mimetype='application/json')


def solr_igv(request):
    """Function for taking solr request url.
    Removes pagination, facets from input query to create multiple
    :param request: Django HttpRequest object including solr query
    :type source: HttpRequest object.
    :returns:
    """

    # copy querydict to make it editable
    if request.is_ajax():
        igv_config = simplejson.loads(request.body)

        logger.debug(simplejson.dumps(igv_config, indent=4))

        logger.debug('IGV data query: ' + str(igv_config['query']))
        logger.debug('IGV annotation query: ' + str(igv_config['annotation']))

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
        logger.debug(simplejson.dumps(session_urls, indent=4))

        return HttpResponse(simplejson.dumps(session_urls),
                            mimetype='application/json')


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

    # proper url encoding
    query = urllib2.quote(query, safe="%/:=&?~#+!$,;'@()*[]")

    # opening solr query results
    results = urllib2.urlopen(query).read()

    # converting results into json for python
    results = simplejson.loads(results)

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
    response = requests.get(url, headers=headers)
    return HttpResponse(response, mimetype='application/json')


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

    response = requests.get(url, params=params, headers=headers)
    return HttpResponse(
        json.dumps(xmltodict.parse(response.text)),
        mimetype='application/json'
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

    response = requests.get(url, params=params, headers=headers)
    return HttpResponse(response, mimetype='application/json')


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

    response = requests.get(url, params=params, headers=headers)
    return HttpResponse(response, mimetype='application/json')


def fastqc_viewer(request):
    return render_to_response('core/fastqc-viewer.html', {},
                              context_instance=RequestContext(request))
