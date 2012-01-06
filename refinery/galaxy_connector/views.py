from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from galaxy_connector.connection import Connection
from galaxy_connector.models import Instance


def index(request):
    return HttpResponse("Refinery Galaxy Connector")

def api(request, api_key):
    return HttpResponse("Refinery Galaxy Connector<br><br>API Key: %s" % api_key )

def obtain_instance(request):
    # NOTE: this is no a real login - all one needs to do is to is call this url to add a Galaxy instance object to the session 
    # create an instance
    if not 'active_galaxy_instance' in request.session:
        # get all instances from the database
        all_instances = Instance.objects.all()
        
        request.session['active_galaxy_instance'] = all_instances[0]
         
        return HttpResponse( 'New Galaxy instance obtained: ' + all_instances[0].description )
    else:
        return HttpResponse( 'A Galaxy instance has already been obtained.' ) 

def release_instance(request):
    # NOTE: this is no a real logout - all one needs to do is to log in
    # create an instance
    if 'active_galaxy_instance' in request.session:
        del request.session['active_galaxy_instance'] 
        return HttpResponse( 'Unable to release Galaxy instance because no instance has been obtained.' )
    else:
        return HttpResponse( 'Galaxy instance released.' ) 


def histories(request):    

    if not 'active_galaxy_instance' in request.session:
        return HttpResponse( 'Unable to fulfill request. No Galaxy instance is available. You need to log in first.' )
    else:
        instance = request.session['active_galaxy_instance'] 
        
    connection = Connection( instance.base_url, instance.data_url, instance.api_url, instance.api_key )
     
    return render_to_response( "galaxy_connector/histories.html", { "histories": connection.histories(), "instance": instance.description }, context_instance=RequestContext( request ) )


def history(request, history_id):    
    if not 'active_galaxy_instance' in request.session:
        return HttpResponse( 'Unable to fulfill request. No Galaxy instance is available. You need to log in first.' )
    else:
        instance = request.session['active_galaxy_instance'] 
        
    connection = Connection( instance.base_url, instance.data_url, instance.api_url, instance.api_key )
     
    return render_to_response( "galaxy_connector/history.html", { "history": connection.history( history_id ), "contents": connection.history_contents( history_id ), "instance": instance.description }, context_instance=RequestContext( request ) )


def history_content(request, history_id, content_id ):    
    if not 'active_galaxy_instance' in request.session:
        return HttpResponse( 'Unable to fulfill request. No Galaxy instance is available. You need to log in first.' )
    else:
        instance = request.session['active_galaxy_instance'] 
        
    connection = Connection( instance.base_url, instance.data_url, instance.api_url, instance.api_key )
     
    return render_to_response( "galaxy_connector/history_content.html", { "history": connection.history( history_id ), "contents": connection.history_contents( history_id ), "content": connection.history_content( history_id, content_id ), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url}, context_instance=RequestContext( request ) )



def workflows(request):    

    if not 'active_galaxy_instance' in request.session:
        return HttpResponse( 'Unable to fulfill request. No Galaxy instance is available. You need to log in first.' )
    else:
        instance = request.session['active_galaxy_instance'] 
        
    connection = Connection( instance.base_url, instance.data_url, instance.api_url, instance.api_key )
     
    return render_to_response( "galaxy_connector/workflows.html", { "workflows": connection.workflows(), "instance": instance.description }, context_instance=RequestContext( request ) )
