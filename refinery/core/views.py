from core.models import *
from django.contrib.auth.models import User 
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from core.tasks import grab_workflows
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from guardian.shortcuts import get_objects_for_user, get_perms, get_users_with_perms


@login_required()
def index(request):
    users = User.objects.all()
    #projects = Project.objects.all()
    projects = get_objects_for_user( request.user, ["core.read_project", "core.change_project"] )
    workflows = Workflow.objects.all()
    data_sets = DataSet.objects.all()
    
    analyses = Analysis.objects.all()
    
    return render_to_response('core/index.html', {'users': users, 'projects': projects, 'workflows': workflows, 'data_sets': data_sets, 'analyses': analyses }, context_instance=RequestContext( request ) )

@login_required()
def user(request,query):
    
    try:
        user = User.objects.get( username=query )
    except User.DoesNotExist:
        user = get_object_or_404( UserProfile, uuid=query ).user
            
    projects = get_objects_for_user( request.user, ["core.read_project", "core.change_project"] )
    
    return render_to_response('core/user.html', {'user': user, 'projects': projects }, context_instance=RequestContext( request ) )


@login_required()
def project(request,uuid):
    project = get_object_or_404( Project, uuid=uuid )
    permissions = get_users_with_perms( project, attach_perms=True )
    
    print permissions
    
    return render_to_response('core/project.html', { 'project': project, "permissions": permissions }, context_instance=RequestContext( request ) )


@login_required()
def import_workflows(request):
    
    current_workflow_count = Workflow.objects.count()    
    grab_workflows();
    new_workflow_count = Workflow.objects.count()
    
    return HttpResponse( str( ( new_workflow_count - current_workflow_count ) ) + ' workflows imported.' ) 