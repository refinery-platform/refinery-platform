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
    
    workflows = 0
    
    for engine in workflow_engines:
        get_workflows( engine );
        new_workflow_count = engine.workflow_set.all().count()
        print "Engine: " + engine.name + " - " + str( ( new_workflow_count ) ) + ' workflows after.'
        workflows += new_workflow_count
    
    return HttpResponse( str( workflows ) + ' workflows imported.' ) 


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
