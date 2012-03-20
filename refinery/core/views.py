from core.models import *
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404

def index(request):
    users = User.objects.all()
    projects = Project.objects.all()
    workflows = Workflow.objects.all()
    data_sets = DataSet.objects.all()
    analyses = Analysis.objects.all()

    return render_to_response('core/index.html', {'users': users, 'projects': projects, 'workflows': workflows, 'data_sets': data_sets, 'analyses': analyses }, context_instance=RequestContext( request ) )

def user(request,query):
    
    try:
        user = User.objects.get( name=query )
    except User.DoesNotExist:
        user = get_object_or_404( User, uuid=query )
            
    project_rels = ProjectUserRelationship.objects.filter( user=user )
    print project_rels
    
    return render_to_response('core/user.html', {'user': user, 'project_rels': project_rels }, context_instance=RequestContext( request ) )

def project(request,uuid):
    project = get_object_or_404( Project, uuid=uuid )
    user_rels = ProjectUserRelationship.objects.filter( resource=project )
    
    return render_to_response('core/project.html', { 'project': project, 'project_rels': user_rels }, context_instance=RequestContext( request ) )