'''
Created on April 6, 2012

@author: nils
'''

from django.http import HttpResponse
from galaxy_connector.connection import Connection
from core.models import Workflow
from core.models import WorkflowEngine
from workflow_manager.tasks import get_workflows
from django.contrib.auth.decorators import login_required
import simplejson


@login_required()
def import_workflows(request):
    
    workflow_engines = WorkflowEngine.objects.all()
    
    for engine in workflow_engines:
        current_workflow_count = engine.workflow_set.all().count()    
        get_workflows( engine );
        new_workflow_count = engine.workflow_set.all().count()
        print "Engine: " + engine.name + " - " + str( ( current_workflow_count ) ) + ' workflows before.'
        print "Engine: " + engine.name + " - " + str( ( new_workflow_count ) ) + ' workflows after.'
    
    return HttpResponse( str( ( new_workflow_count - current_workflow_count ) ) + ' workflows imported.' ) 


def download_workflow ( request, workflow_uuid ):
    """
    Returns a specified workflow_id as a dictionary object.
    Requires simplejson
    """
    
    workflow = Workflow.objects.filter( uuid=workflow_uuid ).get()
    
    connection = Connection( workflow.workflow_engine.instance.base_url,
                             workflow.workflow_engine.instance.data_url,
                             workflow.workflow_engine.instance.api_url,
                             workflow.workflow_engine.instance.api_key )

    result = connection.get_workflow_dict( workflow.internal_id );

    return HttpResponse( simplejson.dumps(result) ) 
