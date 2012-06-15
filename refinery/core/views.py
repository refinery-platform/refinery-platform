from core.models import *
from core.forms import ProjectForm
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from guardian.shortcuts import get_objects_for_user
from guardian.shortcuts import get_objects_for_group
from guardian.shortcuts import get_perms
from django.core.urlresolvers import resolve
from file_store.models import FileStoreItem
from data_set_manager.models import *
from collections import defaultdict

def home(request):
    
    if request.user.is_superuser:
        users = User.objects.all()
    else:
        users = []

    if not request.user.is_authenticated():
        # TODO: formalize "Public" group
        groups = ExtendedGroup.objects.filter( name__exact="Public" )
        
        if len( groups ) == 1:
            group = groups[0]        
            projects = get_objects_for_group( group, "core.read_project" ).filter( is_catch_all=False )
            workflow_engines = get_objects_for_group( group, "core.read_workflowengine" )
            data_sets = get_objects_for_group( group, "core.read_dataset" )
            workflows = get_objects_for_group( group, "core.read_workflow" )
            unassigned_analyses = []
        else:
            projects = []
            workflow_engines = []
            data_sets = []
            workflows = []
            unassigned_analyses = []
    else:
        projects = get_objects_for_user( request.user, "core.read_project" ).filter( is_catch_all=False )
        unassigned_analyses = request.user.get_profile().catch_all_project.analyses
        workflow_engines = get_objects_for_user( request.user, "core.read_workflowengine" )
        workflows = get_objects_for_user( request.user, "core.read_workflow" )
        data_sets = get_objects_for_user( request.user, "core.read_dataset" )
            
    return render_to_response('core/home.html', {'users': users, 'projects': projects, 'unassigned_analyses': unassigned_analyses, 'workflow_engines': workflow_engines, 'workflows': workflows, 'data_sets': data_sets }, context_instance=RequestContext( request ) )


def about(request):
    return render_to_response('core/about.html', {}, context_instance=RequestContext( request ) )

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
        
    if not request.user.id == user.id:
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view the profile of user " + user.username + ".</h1>" )

    # TODO: get list of ExtendedGroups for this user
    groups = []
                            
    return render_to_response('core/user.html', {'user': user, "groups": groups }, context_instance=RequestContext( request ) )


@login_required()
def group(request, query):
    
    group = get_object_or_404( ExtendedGroup, uuid=query )

    # only group members are allowed to see group pages
    if not group.id in request.user.groups.values_list('id', flat=True):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view group " + group.name + ".</h1>" )
                        
    return render_to_response('core/group.html', {'group': group }, context_instance=RequestContext( request ) )


def project(request, uuid):
    project = get_object_or_404( Project, uuid=uuid )
    public_group = ExtendedGroup.objects.get( name__exact="Public")
    
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
            return HttpResponseRedirect( "/" ) # Redirect after POST
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

def valid_dataset(data_set, request):
    public_group = ExtendedGroup.objects.get(name__exact="Public")
    if not request.user.has_perm('core.read_dataset', data_set):
        if not 'read_dataset' in get_perms(public_group, data_set):
            return False
    return True
        

def data_sets(request):
    all_datasets = DataSet.objects.all()
    data_sets = list()
    investigations = list()
    studies = list()
    assays = list()

    for data_set in all_datasets:
        #add data_set to the data_sets list if the user has explicit  
        #permission to read data_set or if data_set is public
        if valid_dataset(data_set, request):
            data_sets.append(data_set)
            investigationlink = data_set.get_investigation()
            if investigationlink:
                investigation = investigationlink.investigation
                study_set = investigation.study_set.all()
                num_assays = 0
                for study in study_set:
                    num_assays += len(study.assay_set.all())
                #assign values to proper lists
                investigations.append(investigation.get_title())
                
                num_studies = len(study_set)
                if num_studies > 1:
                    studies.append("%d studies" % num_studies)
                else:
                    studies.append("1 study")
                    
                if num_assays > 1:
                    assays.append("%d assays" % num_assays)
                else:
                    assays.append("1 assay")
            else:
                investigations.append("--")
                studies.append("0 studies")
                assays.append("0 assays")
            
    
    #zip everything together
    datasets = zip(data_sets, investigations, studies, assays)
    print datasets

    return render_to_response('core/data_sets.html', {'datasets': datasets},
                              context_instance=RequestContext(request))

def data_set(request,uuid):    
    data_set = get_object_or_404( DataSet, uuid=uuid )
    public_group = ExtendedGroup.objects.get(name__exact="Public")
        
    if not request.user.has_perm( 'core.read_dataset', data_set ):
        if not 'read_dataset' in get_perms( public_group, data_set ):
            return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this data set.</h1>" )
        
    permissions = get_users_with_perms( data_set, attach_perms=True )
    
    return render_to_response('core/data_set.html', { 'data_set': data_set, "permissions": permissions }, context_instance=RequestContext( request ) )


def workflow(request,uuid):
    workflow = get_object_or_404( Workflow, uuid=uuid )
    public_group = ExtendedGroup.objects.get( name__exact="Public")
    
    if not request.user.has_perm('core.read_workflow', workflow ):
        if not 'read_workflow' in get_perms( public_group, workflow ):
            return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this workflow.</h1>" )
        
    permissions = get_users_with_perms( workflow, attach_perms=True )
    
    return render_to_response('core/workflow.html', { 'workflow': workflow, "permissions": permissions }, context_instance=RequestContext( request ) )


def workflow_engine(request,uuid):  
    workflow_engine = get_object_or_404( WorkflowEngine, uuid=uuid )
    public_group = ExtendedGroup.objects.get( name__exact="Public")
    
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
                { "name": "Public",
                  "members": [ ".nils", ".richard", ".psalm", ".ilya", ".shannan" ]
                },
             ]
    
    group_objects = []

    # create groups
    for group in groups:
        
        # delete if exists
        try:
            group_object = ExtendedGroup.objects.get( group["name"] )            
            #if group_object.is_managed():
            #    print( group_object.manager_group )
            #    group_object.manager_group.delete()
            group_object.delete()
        except:
            pass

        group_object = ExtendedGroup.objects.create( name=group["name"] )
        manager_group_object = ExtendedGroup.objects.create( name=str( group["name"] + " Managers" ) )
        
        group_object.manager_group = manager_group_object
        group_object.save()

        # Add users to group
        for username in group["members"]:
            user_object = User.objects.get( username__exact=username )
            user_object.groups.add( group_object )
        
        # Add first two members of each group to the manager group    
        User.objects.get( username__exact=group["members"][0] ).groups.add( manager_group_object )
        User.objects.get( username__exact=group["members"][1] ).groups.add( manager_group_object )
                    
        group_objects.append( group_object )
        
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
        group_object = ExtendedGroup.objects.get( name__exact="Public" )
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
        group_object = ExtendedGroup.objects.get( name__exact="Public" )
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
        workflow_engine_object.set_manager_group( ExtendedGroup.objects.get( name__exact="Public Managers" ) )
                
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
    
    return render_to_response('core/analysis.html',
                              {
                               "analysis": analysis,
                               "analysis_results": analysis_results,
                               "inputs": data_inputs,
                               "project": project,
                               "workflow": workflow
                               },
                              context_instance=RequestContext(request))

"""
def analysis_redirect(request, project_uuid, analysis_uuid):
    statuses = AnalysisStatus.objects.get(analysis_uuid=analysis_uuid)
    return HttpResponseRedirect(reverse('analysis_manager.views.analysis', args=(analysis_uuid,)))
"""