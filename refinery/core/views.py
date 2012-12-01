from collections import defaultdict
from core.forms import ProjectForm, UserForm, UserProfileForm
from core.models import ExtendedGroup, Project, DataSet, Workflow, UserProfile, \
    WorkflowEngine, Analysis, get_shared_groups
from data_set_manager.models import *
from data_set_manager.utils import get_matrix
from datetime import datetime
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User, Group
from django.contrib.sites.models import get_current_site
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.urlresolvers import resolve, reverse
from django.http import HttpResponse, HttpResponseForbidden, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.utils import simplejson
from file_store.models import FileStoreItem, FileStoreItem
from galaxy_connector.models import Instance
from guardian.shortcuts import get_objects_for_group, get_objects_for_user, \
    get_perms, get_objects_for_group, get_objects_for_user, get_perms, \
    get_users_with_perms
from haystack.query import SearchQuerySet
import logging
import urllib2
from visualization_manager.views import igv_multi_species


logger = logging.getLogger(__name__)

def home(request):
    if request.user.is_superuser:
        users = User.objects.all()
    else:
        users = []

    if not request.user.is_authenticated():
        group = ExtendedGroup.objects.public_group()
        
        projects = get_objects_for_group( group, "core.read_project" ).filter( is_catch_all=False )
        workflow_engines = get_objects_for_group( group, "core.read_workflowengine" )
        data_sets = get_objects_for_group( group, "core.read_dataset" )
        workflows = get_objects_for_group( group, "core.read_workflow" )
        unassigned_analyses = []
    else:
        projects = get_objects_for_user( request.user, "core.read_project" ).filter( is_catch_all=False )
        unassigned_analyses = request.user.get_profile().catch_all_project.analyses.all().order_by( "-time_start" )
        workflow_engines = get_objects_for_user( request.user, "core.read_workflowengine" )
        workflows = get_objects_for_user( request.user, "core.read_workflow" )
        data_sets = get_objects_for_user( request.user, "core.read_dataset" )
            
    return render_to_response('core/home.html', {'users': users, 'projects': projects, 'unassigned_analyses': unassigned_analyses, 'workflow_engines': workflow_engines, 'workflows': workflows, 'data_sets': data_sets }, context_instance=RequestContext( request ) )


def about(request):
    return render_to_response('core/about.html', {'site_name': get_current_site(request).name}, context_instance=RequestContext( request ) )

def contact(request):
    return render_to_response('core/contact.html', {}, context_instance=RequestContext( request ) )

def statistics(request):
    users = User.objects.count()
    groups = Group.objects.count()
    projects = Project.objects.count()
    data_sets = DataSet.objects.count()
    workflows = Workflow.objects.count()
    files = FileStoreItem.objects.count()

    uri = request.build_absolute_uri()
    base_url = uri.split( request.get_full_path() )[0]
    
    return render_to_response('core/statistics.html', { "users": users, "groups": groups, "projects": projects, "workflows": workflows, "data_sets": data_sets, "files": files, "base_url": base_url }, context_instance=RequestContext( request ) )


@login_required()
def user(request, query):
    
    try:
        user = User.objects.get( username=query )
    except User.DoesNotExist:
        user = get_object_or_404( UserProfile, uuid=query ).user
        
    if len( get_shared_groups( request.user, user ) ) == 0 and user != request.user:
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view the profile of user " + user.username + ".</h1>" )

    return render_to_response('core/user.html', {'profile_user': user }, context_instance=RequestContext( request ) )


@login_required()
def user_profile(request):
    return user(request, request.user.get_profile().uuid)

@login_required()
def user_edit(request, uuid):
    profile_object = UserProfile.objects.get(uuid=uuid)
    user_object = profile_object.user
    if request.method == "POST":
        uform = UserForm(data=request.POST, instance=user_object)
        pform = UserProfileForm(data=request.POST, instance=profile_object)
        if uform.is_valid() and pform.is_valid():
            user = uform.save()
            profile = pform.save(commit = False)
            profile.user = user
            profile.save()
            return HttpResponseRedirect(reverse('core.views.user', args=(uuid,)))
    else:
        uform = UserForm(instance=user_object)
        pform = UserProfileForm(instance=profile_object)
        
    return render_to_response('core/edit_user.html', {'profile_user': user_object, 'uform': uform, 'pform': pform}, context_instance=RequestContext(request))

@login_required()
def user_profile_edit(request):
    return user_edit(request, request.user.get_profile().uuid)

@login_required()
def group(request, query):
    
    group = get_object_or_404( ExtendedGroup, uuid=query )

    # only group members are allowed to see group pages
    if not group.id in request.user.groups.values_list('id', flat=True):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view group " + group.name + ".</h1>" )
                        
    return render_to_response('core/group.html', {'group': group }, context_instance=RequestContext( request ) )


def project_slug(request,slug):
    p = get_object_or_404( Project, slug=slug )    
    return project(request,p.uuid)


def project(request, uuid):
    project = get_object_or_404( Project, uuid=uuid )
    public_group = ExtendedGroup.objects.public_group()
    
    print get_perms( public_group, project )
    
    if not request.user.has_perm('core.read_project', project ):
        if not 'read_project' in get_perms( public_group, project ):
            return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this project.</h1>" )
            
    permissions = get_users_with_perms( project, attach_perms=True )
    
    accessors = project.get_groups()
    print accessors
    
    analyses = project.analyses.all()
    
    return render_to_response('core/project.html', { 'project': project, "permissions": permissions, "analyses": analyses }, context_instance=RequestContext( request ) )


@login_required()
def project_new(request):
    if request.method == "POST": # If the form has been submitted...
        form = ProjectForm( request.POST ) # A form bound to the POST data
        if form.is_valid(): # All validation rules pass
            
            project = form.save()
            project.set_owner( request.user )
            # Process the data in form.cleaned_data
            # ...
            return HttpResponseRedirect( reverse('project', args=(project.uuid,)) ) # Redirect after POST
    else:
        form = ProjectForm() # An unbound form

    return render_to_response( "core/project_new.html", {
        'form': form
        },
        context_instance=RequestContext( request )
    )    


@login_required()
def project_edit(request,uuid):
    project = get_object_or_404( Project, uuid=uuid )
        
    if not request.user.has_perm('core.change_project', project ):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to edit this project.</h1>" )
            
    if request.method == "POST": # If the form has been submitted...
        form = ProjectForm( request.POST, instance=project ) # A form bound to the POST data
        if form.is_valid(): # All validation rules pass            
            form.save()
            # Process the data in form.cleaned_data
            # ...
            return HttpResponseRedirect( "/" ) # Redirect after POST
    else:
        form = ProjectForm( instance=project ) # An unbound form

    return render_to_response( "core/project_edit.html", {
        'form': form,
        'project': project
        },
        context_instance=RequestContext( request )
    )    



def data_sets(request):
    if not request.user.is_authenticated():
        group = ExtendedGroup.objects.public_group()
        dataset_list = get_objects_for_group( group, "core.read_dataset" )
    else:
        dataset_list = get_objects_for_user(request.user, 'core.read_dataset')

    investigation_titles = list()
    studies = list()
    assays = list()
    for dataset in dataset_list:
        try:
            investigation = dataset.get_investigation()
            investigation_titles.append(investigation.get_title())
            
            study_count = investigation.get_study_count()
            if study_count > 1:
                studies.append("%d studies" % study_count)
            else:
                studies.append("1 study")

            assay_count = investigation.get_assay_count()
            if assay_count > 1:
                assays.append("%d assays" % assay_count)
            else:
                assays.append("1 assay")
        except:
            investigation_titles.append("--")
            studies.append("0 studies")
            assays.append("0 assays")
        
    datasets_info = zip(dataset_list, investigation_titles, studies, assays)
    
    #pagination
    paginator = Paginator(datasets_info, 15)
    
    page = request.GET.get('page')
    try:
        datasets = paginator.page(page)
    except PageNotAnInteger:
        datasets = paginator.page(1)
    except EmptyPage:
        datasets = paginator.page(paginator.num_pages)
    except TypeError:
        datasets = paginator.page(1)
        
    return render_to_response("core/data_sets.html", 
                              {'datasets': datasets},
                              context_instance=RequestContext(request))
    

def data_set_slug(request,slug):
    d = get_object_or_404( DataSet, slug=slug )    
    return data_set(request,d.uuid)


def data_set(request,uuid):    
    data_set = get_object_or_404( DataSet, uuid=uuid )
    public_group = ExtendedGroup.objects.public_group()
        
    if not request.user.has_perm( 'core.read_dataset', data_set ):
        if not 'read_dataset' in get_perms( public_group, data_set ):
            return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this data set.</h1>" )
        
    permissions = get_users_with_perms( data_set, attach_perms=True )
    
    #get studies
    investigation = data_set.get_investigation()
    studies = investigation.study_set.all()
    workflows = Workflow.objects.all()
    
    study_uuid = studies[0].uuid
    assay_uuid = studies[0].assay_set.all()[0].uuid
    
    # TODO: catch errors
    isatab_archive = None
    pre_isatab_archive = None
    
    try:
        if investigation.isarchive_file is not None:
            isatab_archive = FileStoreItem.objects.get( uuid=investigation.isarchive_file )
    except:
        pass

    try:
        if investigation.pre_isarchive_file is not None:
            pre_isatab_archive = FileStoreItem.objects.get( uuid=investigation.pre_isarchive_file )
    except:
        pass
    
    return render_to_response('core/data_set.html', 
                              {
                                'data_set': data_set, 
                                "permissions": permissions,
                                "studies": studies,
                                "study_uuid": study_uuid,
                                "assay_uuid": assay_uuid,
                                "workflows": workflows,
                                "isatab_archive": isatab_archive,
                                "pre_isatab_archive": pre_isatab_archive,                             
                              },
                              context_instance=RequestContext( request ) )


def samples(request, ds_uuid, study_uuid, assay_uuid):
    print "core.views.samples called"
    data_set = get_object_or_404( DataSet, uuid=ds_uuid )
    
    # getting current workflows
    workflows = Workflow.objects.all();

    start = datetime.now()    
    node_matrix = get_matrix(node_type="Raw Data File", 
                                                  study_uuid=study_uuid, 
                                                  assay_uuid=assay_uuid
                                                  )
    end = datetime.now()
    print( "Time to retrieve node matrix: " + str(end - start))

    #import json
    #print json.dumps(node_matrix, indent=4)
    
    return render_to_response('core/samples.html', {'workflows': workflows, 'data_set': data_set, "matrix": node_matrix}, 
                              context_instance=RequestContext(request))


def workflow_slug(request,slug):
    w = get_object_or_404( Workflow, slug=slug )    
    return workflow(request,w.uuid)


def workflow(request, uuid):
    workflow = get_object_or_404( Workflow, uuid=uuid )
    public_group = ExtendedGroup.objects.public_group()
    
    if not request.user.has_perm('core.read_workflow', workflow ):
        if not 'read_workflow' in get_perms( public_group, workflow ):
            return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this workflow.</h1>" )
        
    permissions = get_users_with_perms( workflow, attach_perms=True )
    
    return render_to_response('core/workflow.html', { 'workflow': workflow, "permissions": permissions }, context_instance=RequestContext( request ) )


def workflow_engine(request,uuid):  
    workflow_engine = get_object_or_404( WorkflowEngine, uuid=uuid )
    public_group = ExtendedGroup.objects.public_group()
    
    if not request.user.has_perm('core.read_workflowengine', workflow_engine ):
        if not 'read_workflowengine' in get_perms( public_group, workflow_engine ):
            return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this workflow engine.</h1>" )
        
    permissions = get_users_with_perms( workflow_engine, attach_perms=True )
    
    return render_to_response('core/workflow_engine.html', { 'workflow_engine': workflow_engine, "permissions": permissions }, context_instance=RequestContext( request ) )


def admin_test_data( request ):
    '''
    This function creates test data for Refinery:
    - user accounts:
    - groups:
    - projects:
    - workflow engines:
    - workflows:
    - analyses
    '''
    
    users = [ 
             { "username": ".nils",
               "password": "test",
               "first_name": "Nils",
               "last_name": "Gehlenborg",
               "email": "nils@hms.harvard.edu",
               "affiliation": "Harvard Medical School"
             },
             { "username": ".richard",
               "password": "test",
               "first_name": "Richard",
               "last_name": "Park",
               "email": "rpark@bu.edu",
               "affiliation": "Boston University"
             },
             { "username": ".psalm",
               "password": "test",
               "first_name": "Psalm",
               "last_name": "Haseley",
               "email": "psm3426@gmail.com",
               "affiliation": "Brigham & Women's Hospital"
             },
             { "username": ".ilya",
               "password": "test",
               "first_name": "Ilya",
               "last_name": "Sytchev",
               "email": "isytchev@hsph.harvard.edu",
               "affiliation": "Harvard School of Public Health"
             },
             { "username": ".shannan",
               "password": "test",
               "first_name": "Shannan",
               "last_name": "Ho Sui",
               "email": "shosui@hsph.harvard.edu",
               "affiliation": "Harvard School of Public Health"
             }
            ]
    
    user_objects = []
    
    # create user accounts
    for user in users:
        
        # delete if exists
        user_object = User.objects.filter( username__exact=user["username"] )
        if user_object is not None:
            user_object.delete()
    
        user_object = User.objects.create_user( user["username"], email=user["email"], password=user["password"] )
        user_object.first_name = user["first_name"]
        user_object.last_name = user["last_name"]
        user_object.get_profile().affiliation = user["affiliation"]
        user_object.save() 
    
        user_objects.append( user_object )
        
    groups = [ 
                { "name": ".Park Lab",
                  "members": [ ".nils", ".richard", ".psalm" ]
                },
                { "name": ".Hide Lab",
                  "members": [ ".ilya", ".shannan" ]
                },
                { "name": ".Refinery Project",
                  "members": [ ".nils", ".shannan", ".richard", ".psalm", ".ilya" ]
                },
             ]
    
    group_objects = []

    # create groups
    for group in groups:
        
        # delete if exists
        try:
            group_object = ExtendedGroup.objects.get( name__exact=group["name"] )            
            if group_object.is_managed():
                print( group_object.manager_group )
                group_object.manager_group.delete()
            else:
                group_object.delete()
        except:
            pass

        group_object = ExtendedGroup.objects.create( name=group["name"] )
        #manager_group_object = ExtendedGroup.objects.create( name=str( group["name"] + " Managers" ) )        
        #group_object.manager_group = manager_group_object
        #group_object.save()

        # Add users to group
        for username in group["members"]:
            user_object = User.objects.get( username__exact=username )
            user_object.groups.add( group_object )
        
        # Add first two members of each group to the manager group    
        User.objects.get( username__exact=group["members"][0] ).groups.add( group_object.manager_group )
        User.objects.get( username__exact=group["members"][1] ).groups.add( group_object.manager_group )
                    
        group_objects.append( group_object )
        
        
    public_members = [ ".nils", ".richard", ".psalm", ".ilya", ".shannan" ]    
    for username in public_members:
        user_object = User.objects.get( username__exact=username )
        print "username"
        print username
        print ExtendedGroup.objects.public_group()
        user_object.groups.add( ExtendedGroup.objects.public_group() )
        
    """
    # disk quotas (for each user) 
    for user_object in user_objects:
                
        ## PRIVATE PROJECT
        quota_name = user_object.first_name + "\'s Quota"
        quota_summary = "Initial user quota."
        
        # delete if exists
        quota_object = DiskQuota.objects.filter( name__exact=quota_name )
        if quota_object is not None:
            quota_object.delete()
    
        quota_object = DiskQuota.objects.create( name=quota_name, summary=quota_summary, maximum=20*1024*1024*1024, current=20*1024*1024*1024 )
        quota_object.set_owner( user_object )

    
    # disk quotas (for each user) 
    for group_object in group_objects:
                
        ## PRIVATE PROJECT
        quota_name = group_object.name + "\'s Quota"
        quota_summary = "Initial group quota."
        
        # delete if exists
        quota_object = DiskQuota.objects.filter( name__exact=quota_name )
        if quota_object is not None:
            quota_object.delete()
    
        quota_object = DiskQuota.objects.create( name=quota_name, summary=quota_summary, maximum=100*1024*1024*1024, current=100*1024*1024*1024 )
        quota_object.set_manager_group( group_object.manager_group )
        quota_object.share( group_object, readonly=False )
    """


    project_objects = []

    # create projects (for each user: private, lab shared read/write, project group shared read-only, public shared) 
    for user_object in user_objects:
                
        ## PRIVATE PROJECT
        project_name = user_object.first_name + "\'s Private Project"
        project_summary = "A project that is only visible to " + user_object.first_name + "."
        
        # delete if exists
        project_object = Project.objects.filter( name__exact=project_name )
        if project_object is not None:
            project_object.delete()
    
        project_object = Project.objects.create( name=project_name, summary=project_summary )
        project_object.set_owner( user_object )
        
        project_objects.append( project_object )
        
    
        ## PUBLIC PROJECT
        project_name = user_object.first_name + "\'s Public Project" 
        project_summary = "A project that is owned by " + user_object.first_name + " and shared for reading with the general public."
        
        # delete if exists
        project_object = Project.objects.filter( name__exact=project_name, summary=project_summary )
        if project_object is not None:
            project_object.delete()
    
        project_object = Project.objects.create( name=project_name, summary=project_summary )
        project_object.set_owner( user_object )
        group_object = ExtendedGroup.objects.public_group()
        project_object.share( group_object )
    
        project_objects.append( project_object )
            
    
        ## PROJECT GROUP READ-ONLY PROJECT
        project_name = user_object.first_name + "\'s Refinery Project" 
        project_summary = "A project that is owned by " + user_object.first_name + " and shared for reading with the \'Refinery Project\' ExtendedGroup."
        
        # delete if exists
        project_object = Project.objects.filter( name__exact=project_name )
        if project_object is not None:
            project_object.delete()
    
        project_object = Project.objects.create( name=project_name, summary=project_summary )
        project_object.set_owner( user_object )
        group_object = ExtendedGroup.objects.get( name__exact=".Refinery Project" )
        project_object.share( group_object )
    
        project_objects.append( project_object )
    
    
        ## LAB READ/WRITE PROJECT
        project_name = user_object.first_name + "\'s Lab Project" 
        project_summary = "A project that is owned by " + user_object.first_name + " and shared for reading and writing their lab ExtendedGroup."
        
        # delete if exists
        project_object = Project.objects.filter( name__exact=project_name )
        if project_object is not None:
            project_object.delete()
    
        project_object = Project.objects.create( name=project_name, summary=project_summary )
        project_object.set_owner( user_object )
        group_object = user_object.groups.get( name__endswith="Lab" )
        project_object.share( group_object, readonly=False )
        project_objects.append( project_object )


    data_set_objects = []

    # create data_sets (for each user: private, lab shared read/write, data_set group shared read-only, public shared) 
    for user_object in user_objects:
        
        ## PRIVATE data_set
        data_set_name = user_object.first_name + "\'s Private Data Set"
        data_set_summary = "A data set that is only visible to " + user_object.first_name + "."
        
        # delete if exists
        data_set_object = DataSet.objects.filter( name__exact=data_set_name )
        if data_set_object is not None:
            data_set_object.delete()

        data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
        data_set_object.set_owner( user_object )
        data_set_objects.append( data_set_object )
        

        ## PUBLIC data_set
        data_set_name = user_object.first_name + "\'s Public Data Set" 
        data_set_summary = "A data set that is owned by " + user_object.first_name + " and shared for reading with the general public."
        
        # delete if exists
        data_set_object = DataSet.objects.filter( name__exact=data_set_name, summary=data_set_summary )
        if data_set_object is not None:
            data_set_object.delete()

        data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
        data_set_object.set_owner( user_object )
        group_object = ExtendedGroup.objects.public_group()
        data_set_object.share( group_object )
        data_set_objects.append( data_set_object )
            

        ## data_set GROUP READ-ONLY data_set
        data_set_name = user_object.first_name + "\'s Refinery Data Set" 
        data_set_summary = "A data_set that is owned by " + user_object.first_name + " and shared for reading with the \'Refinery Project\' group."
        
        # delete if exists
        data_set_object = DataSet.objects.filter( name__exact=data_set_name )
        if data_set_object is not None:
            data_set_object.delete()

        data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
        data_set_object.set_owner( user_object )
        group_object = ExtendedGroup.objects.get( name__exact=".Refinery Project" )
        data_set_object.share( group_object )
        data_set_objects.append( data_set_object )

    
        ## LAB READ/WRITE data_set
        data_set_name = user_object.first_name + "\'s Lab Data Set"
        data_set_summary = "A data set that is owned by " + user_object.first_name + " and shared for reading and writing their lab group."
        
        # delete if exists
        data_set_object = DataSet.objects.filter( name__exact=data_set_name )
        if data_set_object is not None:
            data_set_object.delete()

        data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
        data_set_object.set_owner( user_object )
        group_object = user_object.groups.get( name__endswith="Lab" )
        data_set_object.share( group_object, readonly=False )
        data_set_objects.append( data_set_object )

    workflow_engine_objects = []
    
    WorkflowEngine.objects.all().delete()
    
    for instance in Instance.objects.all():
        workflow_engine_object = WorkflowEngine.objects.create( instance=instance, name=instance.description, summary=instance.base_url + " " + instance.api_key )
        # TODO: introduce group managers and assign ownership to them        
        workflow_engine_object.set_manager_group( ExtendedGroup.objects.public_group().manager_group )
                
        workflow_engine_objects.append( workflow_engine_object )
        
        
    template = "admin/core/test_data.html"    
    
    return render_to_response( template, { "users": user_objects, "groups": group_objects, "projects": project_objects, "data_sets": data_set_objects, "workflow_engines": workflow_engine_objects }, context_instance=RequestContext( request ) )


def analyses(request, project_uuid ):
    project = Project.objects.get(uuid=project_uuid)
    
    analyses = project.analyses.all()
    
    return render_to_response('core/analyses.html', 
                              {"project": project, "analyses": analyses},
                              context_instance=RequestContext(request))

def analysis(request, project_uuid, analysis_uuid ):
    analysis = Analysis.objects.get(uuid=analysis_uuid)
    
    project = analysis.project
    """Project associated with this Analysis"""
    data_inputs = analysis.workflow_data_input_maps.order_by('pair_id')
    """List of analysis inputs"""
    analysis_results = analysis.results
    """List of analysis results"""
    workflow = analysis.workflow
    
    # getting file_store references
    file_all = []
    for i in analysis_results.all():
      file_store_uuid = i.file_store_uuid
      fs = FileStoreItem.objects.get(uuid=file_store_uuid)
      file_all.append(fs)
    
    return render_to_response('core/analysis.html',
                              {
                               "analysis": analysis,
                               "analysis_results": analysis_results,
                               "inputs": data_inputs,
                               "project": project,
                               "workflow": workflow, 
                               "fs_files" : file_all
                               },
                              context_instance=RequestContext(request))

"""
def analysis_redirect(request, project_uuid, analysis_uuid):
    statuses = AnalysisStatus.objects.get(analysis_uuid=analysis_uuid)
    return HttpResponseRedirect(reverse('analysis_manager.views.analysis', args=(analysis_uuid,)))
"""

def solr(request):
    # copy querydict to make it editable
    query = request.GET.copy()
    
    if request.user.is_authenticated():        
        # limit query to objects owned by the current user and to
        # objects shared with groups that the user is part of who
        # have at least read permissions for this model instance 
        user_id = request.user.id
        group_ids = request.user.groups.all().values_list( "id", flat=True )    
        query.update( { "fq": "owner_id:" + str( user_id ) + " OR "  + "(group_ids:" + " OR ".join( [ str( g ) for g in group_ids ]) + ")" } )        
    else:
        # limit results to anything shared with the public group
        query.update( { "fq": "group_ids:" + str( ExtendedGroup.objects.public_group().id ) } )    
        
    return HttpResponse( urllib2.urlopen( "http://127.0.0.1:8983/solr/core/select?" + query.urlencode() ).read(), mimetype='application/json' )

def solr_igv(request):
    '''
    Function for taking solr request url. Removes pagination, facets from input query to create multiple 
    
    :param request: Django HttpRequest object including solr query 
    :type source: HttpRequest object.
    :returns: 
    '''
    
    # copy querydict to make it editable
    if request.is_ajax():
        query = request.GET.copy()
        logger.debug("solr_igv called: request is ajax")
        
        # extracting solr query from request 
        for i, val in request.POST.iteritems():
            if i == 'query':
                solr_query = val
                solr_results = get_solr_results(solr_query)
                #logger.debug("solr_results")
                #logger.debug(simplejson.dumps(solr_results, indent=4))
        
            elif i == 'annot':
                solr_annot = get_solr_results(val)
                solr_annot
                #logger.debug("solr_annot")
                #logger.debug(simplejson.dumps(solr_annot, indent=4))
        
        # if solr query returns results
        if solr_results:
            session_urls = igv_multi_species(solr_results, solr_annot)
            
        return HttpResponse(simplejson.dumps(session_urls),mimetype='application/json')
    
def get_solr_results(query, facets=False, jsonp=False, annotation=False):
    '''
    Helper function for taking solr request url. Removes facet requests, converts to json, from input solr query  
    
    :param query: solr http query string
    :type query: string
    :param facets: Removes facet query from solr query string
    :type facets: boolean
    :param jsonp: Removes JSONP query from solr query string
    :type jsonp: boolean
    :returns: dictionary of current solr results
    '''
    
    #logger.debug("core.views: get_solr_results")
    
    if not facets:
        # replacing facets w/ false 
        query = query.replace('facet=true', 'facet=false')
    
    if not jsonp:
        # ensuring json not jsonp response 
        query = query.replace('&json.wrf=?', '')
        
    if annotation:
        # changing annotation 
        query = query.replace('is_annotation:false', 'is_annotation:true')
        
    # proper url encoding                  
    query = urllib2.quote(query, safe="%/:=&?~#+!$,;'@()*[]")
    
    # opening solr query results
    results =  urllib2.urlopen( query ).read()
        
    # converting results into json for python 
    results = simplejson.loads(results)
    
    # number of results 
    num_found = int(results["response"]["numFound"])
    logger.debug("core.views: get_solr_results num_found=%s" % num_found)
    
    if num_found == 0:
        return None
    else:
        return results

def samples_solr(request, ds_uuid, study_uuid, assay_uuid):
    logger.debug("core.views.samples_solr called")
    data_set = get_object_or_404( DataSet, uuid=ds_uuid )
    
    # getting current workflows
    workflows = Workflow.objects.all();
    
    # TODO: replace from settings.py or settings_local.py
    solr_url = 'http://127.0.0.1:8983'

    return render_to_response('core/samples_solr.html', {'workflows': workflows, 'data_set': data_set, 'study_uuid':study_uuid, 'assay_uuid':assay_uuid, 'solr_url':solr_url}, 
                              context_instance=RequestContext(request))