from core.models import *
from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from core.tasks import grab_workflows
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required


@login_required()
def index(request):
    users = User.objects.all()
    projects = Project.objects.all()
    workflows = Workflow.objects.all()
    data_sets = DataSet.objects.all()
    
    '''
    # How to create a simple analysis object
    analysis = Analysis( name="My Test Analysis", creator=users[0], summary="Adhoc test analysis", version=1, project=projects[0], data_set=data_sets[0], workflow=workflows[0] )
    analysis.save();
    
    input1 = WorkflowDataInputMap( workflow_data_input_internal_id=1, data_uuid="2339af14-7297-11e1-9f19-c8bcc8ed32d3" );
    input1.save();

    input2 = WorkflowDataInputMap( workflow_data_input_internal_id=3, data_uuid="1459af14-7297-11e1-9f19-c8bcc8ed32d3" );
    input2.save();

    analysis.workflow_data_input_maps.add( input1 ) 
    analysis.workflow_data_input_maps.add( input2 ) 
    '''
    
    analyses = Analysis.objects.all()
    

    return render_to_response('core/index.html', {'users': users, 'projects': projects, 'workflows': workflows, 'data_sets': data_sets, 'analyses': analyses }, context_instance=RequestContext( request ) )

@login_required()
def user(request,query):
    
    try:
        user = User.objects.get( username=query )
    except User.DoesNotExist:
        user = get_object_or_404( UserProfile, uuid=query ).user
            
    project_rels = ProjectUserRelationship.objects.filter( user=user )
    print project_rels
    
    return render_to_response('core/user.html', {'user': user, 'project_rels': project_rels }, context_instance=RequestContext( request ) )


@login_required()
def project(request,uuid):
    project = get_object_or_404( Project, uuid=uuid )
    user_rels = ProjectUserRelationship.objects.filter( resource=project )
    
    return render_to_response('core/project.html', { 'project': project, 'project_rels': user_rels }, context_instance=RequestContext( request ) )


@login_required()
def import_workflows(request):
    
    current_workflow_count = Workflow.objects.count()    
    grab_workflows();
    new_workflow_count = Workflow.objects.count()
    
    return HttpResponse( str( ( new_workflow_count - current_workflow_count ) ) + ' workflows imported.' ) 