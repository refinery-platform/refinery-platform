from celery.task import task

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

@task()
def run_workflow(instance, connection):
    from galaxy_connector.models import DataFile
    from galaxy_connector.galaxy_workflow import createBaseWorkflow, createSteps, createStepsAnnot
    # TO DEBUG PYTHON WEBAPPS ##
    #import pdb; pdb.set_trace()
    
    #Getting working version of library 
    #library_id = connection.create_library( "TEST MY API" );
    # debug library id
    library_id = "bf60fd5f5f7f44bf";
    
    history_id = connection.create_history( "TEST MY API" );
    
    #------------ IMPORT FILES -------------------------- #   
    # get all data file entries from the database
    all_data_files = DataFile.objects.all()
    current_path = all_data_files[0].path;
    annot = []; # remembers asssociated meta data with each file to determine if file is an chip-seq input file
    
    if len( all_data_files ) < 1:
        return 'No data files available in database. Create at least one data file object using the admin interface.'
    else:
        for i in range(len(all_data_files)):
            print "i:: " + str(i);
            # Importing file into galaxy library
            file_id = connection.put_into_library( library_id, instance.staging_path + "/" + all_data_files[i].path )
            print(file_id);
            
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
    #del_workflow_id = connection.delete_workflow(new_workflow_info['id']);