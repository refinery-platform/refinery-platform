from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from galaxy_connector.connection import Connection
from galaxy_connector.models import Instance
from galaxy_connector.models import DataFile
from galaxy_connector.galaxy_workflow import createBaseWorkflow, createSteps, createStepsAnnot
import simplejson
import os


def index(request):
    return HttpResponse("Refinery Galaxy Connector")

def api(request, api_key):
    return HttpResponse("Refinery Galaxy Connector<br><br>API Key: %s" % api_key )

def checkActiveInstance(req):
    if not 'active_galaxy_instance' in req.session:
        return HttpResponse( 'Unable to fulfill request. No Galaxy instance is available. You need to log in first.' )
    else:
        instance = req.session['active_galaxy_instance']
        connection = Connection( instance.base_url, instance.data_url, instance.api_url, instance.api_key )
        return instance, connection
        

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
    instance, connection = checkActiveInstance(request);
    return render_to_response( "galaxy_connector/histories.html", { "histories": connection.get_complete_histories(), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url }, context_instance=RequestContext( request ) )


def libraries(request):    
    instance, connection = checkActiveInstance(request);
    return render_to_response( "galaxy_connector/libraries.html", { "libraries": connection.get_complete_libraries(), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url }, context_instance=RequestContext( request ) )


def history(request, history_id):    
    instance, connection = checkActiveInstance(request);
    # create a new history!
    #connection.create_history( "Nils' New History!" )
    return render_to_response( "galaxy_connector/history.html", { "history": connection.get_history( history_id ), "contents": connection.get_history_contents( history_id ), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url }, context_instance=RequestContext( request ) )


def history_content(request, history_id, content_id ):    
    instance, connection = checkActiveInstance(request);
    return render_to_response( "galaxy_connector/history_content.html", { "history": connection.get_history( history_id ), "contents": connection.get_history_contents( history_id ), "content": connection.get_history_content( history_id, content_id ), "instance": instance.description, "data_url": instance.base_url + "/" + instance.data_url}, context_instance=RequestContext( request ) )


def workflows(request):    
    instance, connection = checkActiveInstance(request);
    return render_to_response( "galaxy_connector/workflows.html", { "workflows": connection.get_complete_workflows(), "instance": instance.description }, context_instance=RequestContext( request ) )


def run(request):    

    instance, connection = checkActiveInstance(request);

    # get all data file entries from the database
    all_data_files = DataFile.objects.all()
    
    if len( all_data_files ) < 1:
        return HttpResponse( 'No data files available in database. Create at least one data file object using the admin interface.' )
    
    library_id = connection.create_library( "ABC" );
    history_id = connection.create_history( "ABC" );
    workflow_id = connection.get_workflow_id( "Simple Input Test Workflow" )[0];
    file_id = connection.put_into_library( library_id, instance.staging_path + "/" + all_data_files[0].path )
    
    # TO DEBUG PYTHON WEBAPPS ##
    #import pdb; pdb.set_trace()
        
    result = connection.run_workflow(workflow_id, [file_id], history_id )    
    
    return ( history( request, result["history"] ) )


def run2(request):
    from galaxy_connector.tasks import run_workflow 
    """
    Test function for running spp workflow for multiple inputs
    """
    instance, connection = checkActiveInstance(request);
    
    workflow_task = run_workflow.delay(instance, connection)
    
    
    return HttpResponse("OK")


def workflow_content(request, workflow_id):
    """
    Returns a specified workflow_id as a dictionary object 
    Requires simplejson
    """
    instance, connection = checkActiveInstance(request);

    result = connection.get_workflow_dict(workflow_id);
    #import pdb; pdb.set_trace()
    
    #return HttpResponse( 'Workflow Content called' ) 
    return HttpResponse( simplejson.dumps(result) ) 


def searchInput(input_string):
    """
    Searches to test if its a chip-seq input file
    """
    ret_string = input_string.lower();
    ret_status = ret_string.find('input');
    return ret_status;


def getInputExp(input1, exp1):
    ret_dict = {};
    ret_dict['input'] = {};
    ret_dict['input']['id'] = input1['file_id'];
    input_name = input1['path'].split( '/');
    input_name = input_name[len(input_name)-1]
    ret_dict['input']['filename'] = str(input_name);
    
    ret_dict['exp'] = {};
    ret_dict['exp']['id'] = exp1['file_id'];
    exp_name = exp1['path'].split('/');
    exp_name = exp_name[len(exp_name)-1]
    ret_dict['exp']['filename'] = str(exp_name);
    
    return ret_dict;
    

def configWorkflowInput(in_list):
    """
    
    TODO:: Need to figure out generic way of matching input to experiment for chip-seq pipeline
    
    """
    
    ret_list = [];
    ret_list.append(getInputExp(in_list[0], in_list[1]));
    ret_list.append(getInputExp(in_list[2], in_list[3]));
    
    return ret_list;
    
    """
    ret_list = [];
    cur_dict = {};
    for j in range(len(in_list)):
        print j;
        if (in_list[j]['input']):
            print "I AM INPUT FILE"
            cur_dict['input'] = file_id;
    """
