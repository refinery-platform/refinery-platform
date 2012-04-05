from celery.task import task
from celery.task.sets import subtask
from galaxy_connector.models import DataFile
from galaxy_connector.galaxy_workflow import createBaseWorkflow, createSteps, createStepsAnnot, combineInputExp
from datetime import datetime
from refinery_repository.models import Investigation, Assay, RawData
from refinery_repository.tasks import download_http_file
from core.models import *
import os
from celery import Celery
from celery import states
import time
from django.conf import settings


def searchInput(input_string):
    """
    Searches to test if its a chip-seq input file
    """
    ret_string = input_string.lower();
    ret_status = ret_string.find('input');
    return ret_status;


def getInputExp(input1, exp1):
    ret_dict = {};
    ret_dict['input_file'] = {};
    ret_dict['input_file']['id'] = input1['file_id'];
    input_name = input1['path'].split( '/');
    input_name = input_name[len(input_name)-1]
    ret_dict['input_file']['filename'] = str(input_name);
    
    ret_dict['exp_file'] = {};
    ret_dict['exp_file']['id'] = exp1['file_id'];
    exp_name = exp1['path'].split('/');
    exp_name = exp_name[len(exp_name)-1]
    ret_dict['exp_file']['filename'] = str(exp_name);
        
    return ret_dict;
    

def configWorkflowInput(in_list):
    """
    TODO:: Need to figure out generic way of matching input to experiment for chip-seq pipeline
    """
    ret_list = [];
    ret_list.append(getInputExp(in_list[0], in_list[1]));
    ret_list.append(getInputExp(in_list[2], in_list[3]));
    
    return ret_list;
    
@task()
def monitor_workflow( instance, connection, interval=5.0 ):
    '''
    Run and monitor a test workflow in Galaxy. 
    '''

    # create library and history
    library_id = connection.create_library( "Refinery Test Library - " + str( datetime.now() ) )    
    history_id = connection.create_history( "Refinery Test History - " + str( datetime.now() ) )
    
    workflow_task = subtask( run_workflow ).delay( instance, connection, library_id, history_id )
    
    while True:
        progress = connection.get_progress( history_id )
        monitor_workflow.update_state( state="PROGRESS", meta=progress )
        print  "Sleeping ..."
        time.sleep( interval );
        print  "Awake ..."
        print  "Workflow Task State: " + workflow_task.state + "\n"
        print  "Workflow State: " + progress["workflow_state"] + "\n"
                
        if workflow_task.state == "SUCCESS":
            print "Workflow task finished successfully."
            
            if progress["workflow_state"] == "ok":
                print "Workflow finished successfully. Stopping monitor ..."
                break

            if progress["workflow_state"] == "error":
                print "Workflow failed. Stopping monitor ..."
                break
             
            if progress["workflow_state"] == "queued":
                print "Workflow running."

            if progress["workflow_state"] == "new":
                print "Workflow being prepared."

        
        if workflow_task.state == "FAILURE":
            print "Workflow task failed . Stopping monitor ..."
            break
    
    # return the final state information  
    return progress


@task()
def run_workflow( instance, connection, library_id, history_id ):
    # TO DEBUG PYTHON WEBAPPS ##
    #import pdb; pdb.set_trace()
    
    #print "From run_workflow: calling monitor_progress subtask"
    #subtask( monitor_progress ).delay( connection, history_id, run_workflow.task_id ) 
    #print "From run_workflow: calling monitor_progress subtask: DONE"
    
    #run_workflow.update_state( state="PROGRESS", meta={ "history_id": history_id, "library_id": library_id } )
    #monitor_task = monitor_history.delay( connection, history_id )
    
    #------------ IMPORT FILES -------------------------- #   
    # get all data file entries from the database
    all_data_files = DataFile.objects.all()
    current_path = all_data_files[0].path;
    annot = []; # remembers associated meta data with each file to determine if file is an chip-seq input file
    
    if len( all_data_files ) < 1:
        return 'No data files available in database. Create at least one data file object using the admin interface.'
    else:
        for i in range(len(all_data_files)):
            #print "i: " + str(i);
            # Importing file into galaxy library
            file_id = connection.put_into_library( library_id, instance.staging_path + "/" + all_data_files[i].path )
            #print( "file id: " + file_id);
            
            a_dict = {};
            a_dict['path'] = all_data_files[i].path;
            a_dict['kind'] = all_data_files[i].kind;
            a_dict['description'] = all_data_files[i].description;
            a_dict['file_id'] = file_id;
            
            test_path = searchInput(all_data_files[i].path);
            test_kind = searchInput(all_data_files[i].kind);
            test_descr = searchInput(all_data_files[i].description);
            
            if (test_path > 0 or test_kind > 0 or test_descr > 0):
                a_dict['input'] = True;
            else:
                a_dict['input'] = False;
            
            annot.append(a_dict);
    
    #print "annot"
    #print annot
    
    #------------ WORKFLOWS -------------------------- #   
    ret_list = configWorkflowInput(annot);
    
    #workflow_id = connection.get_workflow_id("Workflow: spp + bam")[0];
    workflow_id = connection.get_workflow_id("Workflow: spp + bam2")[0];
    
    workflow_dict = connection.get_workflow_dict(workflow_id);
    
    # creating base workflow to replicate input workflow
    new_workflow = createBaseWorkflow(workflow_dict["name"])
        
    # Updating steps in imported workflow X number of times
    new_workflow["steps"] = createStepsAnnot(ret_list, workflow_dict);
    
    # import newly generated workflow 
    new_workflow_info = connection.import_workflow(new_workflow);
    
    # Running workflow 
    result = connection.run_workflow2(new_workflow_info['id'], ret_list, history_id )    
    
    #------------ DELETE WORKFLOW -------------------------- #   
    del_workflow_id = connection.delete_workflow(new_workflow_info['id']);
    

@task()
def run_workflow_ui(connection, workflow_uuid, run_info):
    """
    Runs Galaxy workflow through django web interface
    """
    print "\ngalaxy_connector.tasks.run_workflow_ui called\n"

    # creates new library in galaxy
    library_id = connection.create_library( "UI Refinery Test Library - " + str( datetime.now() ) );
    
    # creates new history in galaxy
    history_id = connection.create_history( "UI Refinery Test History - " + str( datetime.now() ) )
    #run_workflow_ui.update_state( state="PROGRESS", meta={ "history_id": history_id, "library_id": library_id } )
            
    # retrieving workflow based on input workflow_uuid
    curr_workflow = Workflow.objects.filter(uuid=workflow_uuid)[0]
    # gets galaxy internal id for specified workflow
    workflow_galaxy_id = curr_workflow.internal_id
    # gets dictionary version of workflow
    workflow_dict = connection.get_workflow_dict(workflow_galaxy_id);
    
    # getting distinct workflow inputs
    annot_inputs = {};
    for data_input in curr_workflow.data_inputs.all():
        input_type = data_input.name
        annot_inputs[input_type] = [];
    
    # ----------------------------------------------------------------#
    # Importing file(s) into galaxy library
    for file in run_info:
        for k,v in file.items():
            cur_file = file[k];
            file_path = cur_file["filepath"]
            file_name = cur_file["filename"] 
            
            ###############################################################
            ### TODO :: ### call datastore and download files automatically
            ###############################################################
               
            # Check that file exists
            if(os.path.exists(file_path)): 
               # insert data into galaxy library
               file_id = connection.put_into_library( library_id, file_path )
               cur_file["id"] = file_id
               #print( "file id: " + file_id);
            else:
                print "FILE DOES NOT EXIST, please download and try again"
            
            # keeping track of inputs based on input_type i.e. exp_file vs input_file
            annot_inputs[k].append(cur_file);
    
    # ----------------------------------------------------------------#
    ### REFINERY WORKFLOW UPDATES ###
    
    # number of times to expand the selected workflow
    repeat_num = int(len(run_info) / len(workflow_data_inputs))
    
    # creating input list to create expanded workflow      
    ret_list = combineInputExp(annot_inputs, repeat_num)
          
    # creating base workflow to replicate input workflow
    new_workflow = createBaseWorkflow( (workflow_dict["name"]) )
          
    # Updating steps in imported workflow X number of times
    new_workflow["steps"] = createStepsAnnot(ret_list, workflow_dict);
    new_workflow_steps = len(new_workflow["steps"])
          
    # import newly generated workflow 
    new_workflow_info = connection.import_workflow(new_workflow);
          
    # Running workflow 
    result = connection.run_workflow2(new_workflow_info['id'], ret_list, history_id )    
          
    #------------ DELETE WORKFLOW -------------------------- #   
    del_workflow_id = connection.delete_workflow(new_workflow_info['id']);
         
    """ 
    print "\nannot_inputs"
    print annot_inputs
    print "run_info"
    print run_info
    print "data"
    print data;
    print "ret_list"
    print ret_list
    print "num_steps"
    print new_workflow_steps
    """
    
    ### ----------------------------------------------------------------#
    ### REFINERY MODEL UPDATES ###
    # core.models (updating states for refinery 
    users = User.objects.all()
    projects = Project.objects.all()
    data_sets = DataSet.objects.all()
    
    # How to create a simple analysis object
    analysis = Analysis( creator=users[0], summary="Adhoc test analysis: " + str( datetime.now()), version=1, project=projects[0], data_set=data_sets[0], workflow=curr_workflow, workflow_copy=new_workflow, workflow_steps_num=new_workflow_steps )
    analysis.save()
    
    # Updating Refinery Models for updated workflow input (galaxy worfkflow input id & assay_uuid 
    count = 0;
    for samp in ret_list:
        count += 1
        for k,v in samp.items():
            temp_input =  WorkflowDataInputMap( workflow_data_input_name=k, data_uuid=samp[k]["assay_uuid"], pair_id=count)
            temp_input.save() 
            analysis.workflow_data_input_maps.add( temp_input ) 
            analysis.save() 
    
    ### ----------------------------------------------------------------#
    # Downloading results from history
    download_history_files(history_id)
    
    #{'workflow_id': '1cd8e2f6b131e891', 'ds_map': {'50': {'src': 'ld', 'id': 'a799d38679e985db'}, '52': {'src': 'ld', 'id': '33b43b4e7093c91f'}}, 'history': 'Test API'}
    #data["ds_map"][in_key] = { "src": "ld", "id": winput_id }

@task
def download_history_files(connection, history_id) :
    """
    Download entire histories from galaxy. Getting files out of history to file store
    """
    download_list = connection.get_history_file_list(history_id)
    
    for results in download_list:
        # download file if result state is "ok"
        if results['state'] == 'ok':
            file_type = results["type"]
            
            # checks to see if history file is raw fastq file, excluding from download
            check_fastq = file_type.lower().find('fastq')
            check_sam = file_type.lower().find('sam')
            
            if (check_fastq < 0 and check_sam < 0):
                # name of file
                result_name = results['name'] + '.' + file_type
                # size of file defined by galaxy
                file_size = results['file_size']
                # URL to download
                download_url = connection.make_url(str(results['dataset_id']), is_data=True)
                
                #####################################
                # TODO: change location results being downloaded too
                #####################################
                
                # location to download to 
                loc_url = settings.DOWNLOAD_BASE_DIR;
                
                id = download_http_file.delay(download_url, loc_url, "analyze_test", new_name=result_name, galaxy_file_size=file_size) 
