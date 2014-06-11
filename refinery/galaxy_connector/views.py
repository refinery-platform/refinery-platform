from celery.result import AsyncResult
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.sites.models import get_current_site
from galaxy_connector.models import Instance


def index(request):
    return HttpResponse("%s Galaxy Connector" % (get_current_site(request).name))


def api(request, api_key):
    return HttpResponse("%s Galaxy Connector<br><br>API Key: %s" % (get_current_site(request).name, api_key))


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


def task_progress(request, task_id ):
    task = AsyncResult( task_id )
    #instance, connection = checkActiveInstance(request)
    
    progress= None
    
    #if task.state != states.PENDING and task.result != None:
    progress = task.result
            
    return render_to_response('galaxy_connector/task_progress.html', { 'progress': progress }, context_instance=RequestContext( request ) )
