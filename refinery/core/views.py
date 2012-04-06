from core.models import *
from django.contrib.auth.models import User 
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from guardian.shortcuts import get_objects_for_user, get_perms, get_users_with_perms


@login_required()
def index(request):
    
    if request.user.is_superuser:
        users = User.objects.all()
    else:
        users = []

    projects = get_objects_for_user( request.user, "core.read_project" )
    workflow_engines = get_objects_for_user( request.user, "core.read_workflow_engine" )
    data_sets = get_objects_for_user( request.user, "core.read_data_set" )
            
    return render_to_response('core/index.html', {'users': users, 'projects': projects, 'workflow_engines': workflow_engines, 'data_sets': data_sets }, context_instance=RequestContext( request ) )

@login_required()
def user(request,query):
    
    try:
        user = User.objects.get( username=query )
    except User.DoesNotExist:
        user = get_object_or_404( UserProfile, uuid=query ).user
        
    if not request.user.id == user.id:
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view the profile of user " + user.username + ".</h1>" )
                        
    return render_to_response('core/user.html', {'user': user }, context_instance=RequestContext( request ) )


def project(request,uuid):
    project = get_object_or_404( Project, uuid=uuid )
    
    if not request.user.has_perm('core.read_project', project ):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this project.</h1>" )
            
    permissions = get_users_with_perms( project, attach_perms=True )
    
    return render_to_response('core/project.html', { 'project': project, "permissions": permissions }, context_instance=RequestContext( request ) )


def data_set(request,uuid):
    
    data_set = get_object_or_404( DataSet, uuid=uuid )
    
    if not request.user.has_perm('core.read_data_set', data_set ):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this data set.</h1>" )
        
    permissions = get_users_with_perms( data_set, attach_perms=True )
    
    return render_to_response('core/data_set.html', { 'data_set': data_set, "permissions": permissions }, context_instance=RequestContext( request ) )


def workflow(request,uuid):
    
    workflow = get_object_or_404( Workflow, uuid=uuid )
    
    if not request.user.has_perm('core.read_workflow', workflow ):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this workflow.</h1>" )
        
    permissions = get_users_with_perms( workflow, attach_perms=True )
    
    return render_to_response('core/workflow.html', { 'workflow': workflow, "permissions": permissions }, context_instance=RequestContext( request ) )


def workflow_engine(request,uuid):
    
    workflow_engine = get_object_or_404( WorkflowEngine, uuid=uuid )
    
    if not request.user.has_perm('core.read_workflow_engine', workflow_engine ):
        return HttpResponseForbidden("<h1>User " + request.user.username + " is not allowed to view this workflow engine.</h1>" )
        
    permissions = get_users_with_perms( workflow_engine, attach_perms=True )
    
    return render_to_response('core/workflow_engine.html', { 'workflow_engine': workflow_engine, "permissions": permissions }, context_instance=RequestContext( request ) )