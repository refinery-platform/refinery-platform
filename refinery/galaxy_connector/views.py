from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.sites.models import get_current_site
from galaxy_connector.models import Instance
import simplejson
from celery.result import AsyncResult


def index(request):
    return HttpResponse("%s Galaxy Connector" % (get_current_site(request).name))

def api(request, api_key):
    return HttpResponse("%s Galaxy Connector<br><br>API Key: %s" % (get_current_site(request).name, api_key))

# def checkActiveInstance(req):
#     if not 'active_galaxy_instance' in req.session:
#         return HttpResponse( 'Unable to fulfill request. No Galaxy instance is available. You need to log in first.' )
#     else:
#         instance = req.session['active_galaxy_instance']
#         connection = instance.get_galaxy_connection()
#         return instance, connection
        

def obtain_instance(request, index=0 ):
    # NOTE: this is no a real login - all one needs to do is to is call this url to add a Galaxy instance object to the session 
    # create an instance
    index = int(index)
    
    if not 'active_galaxy_instance' in request.session:
        # get all instances from the database
        all_instances = Instance.objects.all()
        request.session['active_galaxy_instance'] = all_instances[index]
        return HttpResponse( 'New Galaxy instance obtained: ' + all_instances[index].description )
    else:
        return HttpResponse( 'A Galaxy instance has already been obtained.' ) 


def release_instance(request):
    # NOTE: this is no a real logout - all one needs to do is to log in
    # create an instance
    if 'active_galaxy_instance' in request.session:
        del request.session['active_galaxy_instance'] 
        return HttpResponse( 'Galaxy instance released.' )        
    else:
        return HttpResponse( 'Unable to release Galaxy instance because no instance has been obtained.' ) 


# def histories(request):    
#     instance, connection = checkActiveInstance(request);
#     return render_to_response( "galaxy_connector/histories.html", { "histories": connection.get_complete_histories(), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url }, context_instance=RequestContext( request ) )


# def libraries(request):    
#     instance, connection = checkActiveInstance(request);
#     return render_to_response( "galaxy_connector/libraries.html", { "libraries": connection.get_complete_libraries(), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url }, context_instance=RequestContext( request ) )


# def history(request, history_id):    
#     instance, connection = checkActiveInstance(request);
#     return render_to_response( "galaxy_connector/history.html", { "history": connection.get_history( history_id ), "contents": connection.get_history_contents( history_id ), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url }, context_instance=RequestContext( request ) )


# def history_progress(request, history_id):    
#     instance, connection = checkActiveInstance(request);
#     return HttpResponse( simplejson.dumps(connection.get_progress( history_id )) ) 

# def history_file_list(request, history_id):    
#     instance, connection = checkActiveInstance(request);
#     return HttpResponse( simplejson.dumps(connection.get_history_file_list( history_id )) ) 

# def history_content(request, history_id, content_id ):    
#     instance, connection = checkActiveInstance(request);
#     return render_to_response( "galaxy_connector/history_content.html", { "history": connection.get_history( history_id ), "contents": connection.get_history_contents( history_id ), "content": connection.get_history_content( history_id, content_id ), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url}, context_instance=RequestContext( request ) )


# def workflows(request):    
#     instance, connection = checkActiveInstance(request);
#     return render_to_response( "galaxy_connector/workflows.html", { "workflows": connection.get_complete_workflows(), "instance": instance.description }, context_instance=RequestContext( request ) )


def task_progress(request, task_id ):
    task = AsyncResult( task_id )
    #instance, connection = checkActiveInstance(request)
    
    progress= None
    
    #if task.state != states.PENDING and task.result != None:
    progress = task.result
            
    return render_to_response('galaxy_connector/task_progress.html', { 'progress': progress }, context_instance=RequestContext( request ) )


# def run2(request):
#     """
#     Test function for running spp workflow for multiple inputs
#     """
#     instance, connection = checkActiveInstance(request)
#     
#     workflow_task = monitor_workflow.delay( instance, connection, 5.0 ) #, monitor_progress.subtask( (connection, ) ) )
#      
#     return HttpResponseRedirect( reverse( 'task_progress', args=(workflow_task.task_id,) ) )


# def workflow_content(request, workflow_id):
#     """
#     Returns a specified workflow_id as a dictionary object 
#     Requires simplejson
#     """
#     instance, connection = checkActiveInstance(request);
# 
#     result = connection.get_workflow_dict(workflow_id);
# 
#     return HttpResponse( simplejson.dumps(result) ) 
