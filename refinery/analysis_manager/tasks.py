'''
Created on Apr 5, 2012

@author: nils
'''

from core.models import Analysis
from refinery_repository.models import Assay
from celery.task import task
from celery.task.sets import subtask
import time, os, copy
from django.conf import settings
from galaxy_connector.connection import Connection
from refinery_repository.tasks import download_http_file
from workflow_manager.tasks import configure_workflow
from datetime import datetime

# task: run analysis (outermost task, calls subtasks that monitor and run preprocessing, execution, postprocessing)
@task()
def run_analysis( analysis, interval=5.0 ):
    
    print "analysis_manager.tasks run_analysis called"

    # PREPROCESSING
    preprocessing_task = subtask( monitor_analysis_preprocessing ).delay( analysis )
    
    #TODO: create a function to do this
    while True:
        run_analysis.update_state( state="PREPROCESSING" )
        time.sleep( interval );
        print  "Preprocessing Task State: " + preprocessing_task.state + "\n"
                
        if preprocessing_task.state == "SUCCESS":
            print "Preprocessing task finished successfully. Stopping monitor ..."
            break;
        
        if preprocessing_task.state == "FAILURE":
            print "Preprocessing task failed . Stopping monitor ..."
            break



    # EXECUTION
    execution_task = subtask( monitor_analysis_execution ).delay( analysis )
    
    while True:
        run_analysis.update_state( state="EXECUTION" )
        time.sleep( interval );
        print  "Execution Task State: " + execution_task.state + "\n"
                
        if execution_task.state == "SUCCESS":
            print "Execution task finished successfully. Stopping monitor ..."
            break;
        
        if execution_task.state == "FAILURE":
            print "Execution task failed . Stopping monitor ..."
            break


    # POSTPROCESSING
    postprocessing_task = subtask( monitor_analysis_postprocessing ).delay( analysis )

    while True:
        run_analysis.update_state( state="POSTPROCESSING" )
        time.sleep( interval );
        print  "Postprocessing Task State: " + postprocessing_task.state + "\n"
                
        if postprocessing_task.state == "SUCCESS":
            print "Postprocessing task finished successfully. Stopping monitor ..."
            break;
        
        if postprocessing_task.state == "FAILURE":
            print "Postprocessing task failed . Stopping monitor ..."
            break
        
    return

# task: monitor preprocessing (calls subtask that does the actual work)
@task()
def monitor_analysis_preprocessing( analysis, interval=5.0 ):
    #TODO: monitor async task execution
    run_analysis_preprocessing( analysis )
    return

# task: perform postprocessing (innermost task, does the actual work)
@task()
def run_analysis_preprocessing( analysis ):
    
    print "analysis_manager.run_analysis_preprocessing called"
     
    # run two task in parallel:
    #
    # 1a. obtain files
    # 1b. put files into Galaxy
    #
    # 2. obtain expanded workflow
    connection = get_analysis_connection(analysis)
    
    # creates new library in galaxy
    library_id = connection.create_library( "Refinery Analysis - " + str( analysis.uuid ) + " (" + str( datetime.now() ) + ")" );
    
    ### generates same ret_list purely based on analysis object ###
    ret_list = get_analysis_config(analysis)

    # getting expanded workflow configured based on input: ret_list
    new_workflow = configure_workflow(analysis.workflow.uuid, ret_list, connection)
    
    # import newly generated workflow 
    new_workflow_info = connection.import_workflow(new_workflow);
    
    ######### ANALYSIS MODEL 
    new_workflow_steps = len(new_workflow["steps"])
    
     # creates new history in galaxy
    history_id = connection.create_history( "Refinery Analysis - " + str( analysis.uuid ) + " (" + str( datetime.now() ) + ")" )
    
    # updating analysis object
    analysis.workflow_copy = new_workflow
    analysis.workflow_steps_num = new_workflow_steps
    analysis.workflow_galaxy_id = new_workflow_info['id']
    analysis.library_id = library_id
    analysis.history_id = history_id
    analysis.save()
    
    return

# task: monitor workflow execution (calls subtask that does the actual work)
@task()
def monitor_analysis_execution( analysis, interval=5.0 ):    

    # required to get updated state (move out of this function) 
    analysis = Analysis.objects.filter(uuid=analysis.uuid)[0]
    
    analysis_execution_task = subtask( run_analysis_execution ).delay( analysis )
    
    connection = get_analysis_connection( analysis )
    
    while True:
        progress = connection.get_progress( analysis.history_id )
        monitor_analysis_execution.update_state( state="PROGRESS", meta=progress )
        print  "Sleeping ..."
        time.sleep( interval );
        print  "Awake ..."
        print  "Analysis Execution Task State: " + analysis_execution_task.state + "\n"
        print  "Workflow State: " + progress["workflow_state"] + "\n"
                
        if analysis_execution_task.state == "SUCCESS":
            print "Analysis Execution Task task finished successfully."
            
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

        
        if analysis_execution_task.state == "FAILURE":
            print "Analysis Execution Task failed . Stopping monitor ..."
            break    
    return

# task: perform execution (innermost task, does the actual work)
@task()
def run_analysis_execution( analysis ):
    
    analysis = Analysis.objects.filter(uuid=analysis.uuid)[0]
    
    ######################
    ### EXECUTION ###
    ######################
    connection = get_analysis_connection(analysis)
    
    ### generates same ret_list purely based on analysis object ###
    ret_list = get_analysis_config(analysis)

    #### NEED TO IMPORT TO GALAXY TO GET GALAXY_IDS ###
    ret_list = import_analysis_in_galaxy(ret_list, analysis.library_id, connection)
          
    # Running workflow 
    result = connection.run_workflow2(analysis.workflow_galaxy_id, ret_list, analysis.history_id )  
    
    return

# task: monitor postprocessing (calls subtask that does the actual work)
@task()
def monitor_analysis_postprocessing( analysis ):
    #TODO: monitor async task execution    
    run_analysis_postprocessing( analysis )    
    return


# task: perform postprocessing (innermost task, does the actual work)
@task()
def run_analysis_postprocessing( analysis ):
    
    print "analysis_manager.run_analysis_postprocessing called"
    
    ######################
    ### POSTPROCESSING ###
    ######################      
    # 1. dowloads results from history
    # 2. delete dynamic workflow in galaxy
    # 3. delete history 
    # TODO
    # 4. delete specified library
    analysis = Analysis.objects.filter(uuid=analysis.uuid)[0]
    
    connection = get_analysis_connection(analysis)
    
    ### ----------------------------------------------------------------#
    # Downloading results from history
    download_history_files(connection, analysis.history_id)
    
    #------------ DELETE WORKFLOW -------------------------- #   
    del_workflow_id = connection.delete_workflow(analysis.workflow_galaxy_id);
    
    # delete history
    connection.delete_history(analysis.history_id)
    # need to add to connection delete_library
    
    return

@task()
def get_analysis_config( analysis ):
    ###############################################################
    ### TEST RECREATING RET_LIST DICTIONARY FROM ANALYSIS MODEL ###
    curr_workflow = analysis.workflow
    
    # getting distinct workflow inputs
    workflow_data_inputs = curr_workflow.data_inputs.all()
    annot_inputs = {};
    for data_input in workflow_data_inputs:
        input_type = data_input.name
        annot_inputs[input_type] = None;
    
    ret_list = [];
    ret_item = copy.deepcopy(annot_inputs)
    
    temp_count = 0
    temp_len = len(annot_inputs)
    t2 =  analysis.workflow_data_input_maps.all().order_by('pair_id')
    for wd in t2:
        if ret_item[wd.workflow_data_input_name] is None:
            ret_item[wd.workflow_data_input_name] = {}
            ret_item[wd.workflow_data_input_name]['pair_id'] = wd.pair_id
            ret_item[wd.workflow_data_input_name]['assay_uuid'] =  wd.data_uuid
            temp_count += 1
       
        if temp_count == temp_len:
            ret_list.append(ret_item)
            ret_item = copy.deepcopy(annot_inputs)
            temp_count = 0
    
    # get filepath, filename, and associated galaxy_id
    for file_set in ret_list:
        for k,v in file_set.iteritems():
            curr_set = file_set[k]
            curr_assay = Assay.objects.filter(assay_uuid=curr_set['assay_uuid'])[0];
            curr_rawdata = curr_assay.raw_data.values()[0];
            curr_filename = curr_rawdata['file_name'];
            
            # current filepath
            curr_set['filepath'] = os.path.join(settings.DOWNLOAD_BASE_DIR, curr_assay.investigation_id, curr_filename)
            # Short file name description
            curr_set['filename'] = curr_filename.split('.')[0]
      
    return ret_list

@task()
def import_analysis_in_galaxy(ret_list, library_id, connection):
    """
    Take workflow configuration and import files into galaxy
    assign galaxy_ids to ret_list
    """
    print "analysis_manager.tasks import_analysis_in_galaxy called"
    
    for fileset in ret_list:
        for k,v in fileset.iteritems():
            cur_item = fileset[k]
            file_path = cur_item['filepath']
            
            # Check that file exists
            if(os.path.exists(file_path)): 
               # insert data into galaxy library
               file_id = connection.put_into_library( library_id, file_path )
               cur_item["id"] = file_id
               print( "file id: " + file_id);
            else:
                print "FILE DOES NOT EXIST, please download and try again"
    
    return ret_list

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

@task()
def get_analysis_connection(analysis): 
    """
    gets current connection based on workflow engine associated with imported workflows
    """
    
    cur_workflow = analysis.workflow
    
    connection = Connection( cur_workflow.workflow_engine.instance.base_url,
                             cur_workflow.workflow_engine.instance.data_url,
                             cur_workflow.workflow_engine.instance.api_url,
                             cur_workflow.workflow_engine.instance.api_key )
    return connection