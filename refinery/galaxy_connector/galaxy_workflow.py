'''
Created on Jan 11, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

import simplejson
import copy
import ast
from datetime import datetime


class GalaxyWorkflow( object ):
    '''
    classdocs
    '''

    def __init__(self, name, identifier ):
        '''
        Constructor
        '''
        self.name = name
        self.identifier = identifier
        self.inputs = []
        
    def __unicode__(self):
        return self.name + " (" + self.identifier + "): " + str( len( self.inputs ) ) + " inputs"      

                
    def add_input( self, workflow_input ):
        self.inputs.append( workflow_input )
        


class GalaxyWorkflowInput( object ):
    
    def __init__(self, name, identifier ):
        '''
        Constructor
        '''
        self.name = name
        self.identifier = identifier
        
    def __unicode__(self):
        return self.name + " (" + self.identifier + ")"        


# =========================================================================================================
# Helper functions 
# =========================================================================================================
def combineInputExp(in_list, repeat_num):
    """
    combineInputExp function for generating combined list for workflow configuration
    """
    
    ret_list = [];
    
    input_list = in_list['input_file']
    exp_list = in_list['exp_file']
    
    for i in range(0, repeat_num):
        temp_dict = {}; 
        temp_dict['input_file'] = input_list[i]
        temp_dict['exp_file'] = exp_list[i]
        ret_list.append(temp_dict)
    
    return ret_list

def openWorkflow(in_file):   
    """
    Opens a workflow file 
    """     
    with open(in_file) as f:
        temp_data = simplejson.load(f)
    return temp_data;

def createBaseWorkflow(workflow_name):
    """
    # Creates base template workflow # 
    """
    base_dict = {};
    base_dict["a_galaxy_workflow"] = "true";
    base_dict["annotation"] = "";
    base_dict["format-version"] = "0.1"
    base_dict["name"] = workflow_name + "-" + str( datetime.now() );
    base_dict["steps"] = {};
    return base_dict;

def workflowMap(workflow):
    """
    Returns a dict of mapped workflow
    
    """
    map = {};
    temp_steps = workflow["steps"];
    
    # finds input files ("exp_file" or "input_file") read from galaxy
    for j in range(0, len(temp_steps)):
        curr_workflow_step = temp_steps[str(j)]
        input_id = curr_workflow_step["id"]
        input_dict = curr_workflow_step["inputs"];
        
        if (len(input_dict) > 0):
            map[input_id] = input_dict[0]["name"] 
            
    # mapping rest of workflow to either "input_file" or "exp_file"
    for k in range(0, len(temp_steps)):
        curr_workflow_step = temp_steps[str(k)]
        input_id = curr_workflow_step["id"]
        connect_dict = curr_workflow_step["input_connections"];
        if (len(connect_dict)) == 1:
            for keys, val in connect_dict.iteritems():
                if "id" in connect_dict[keys]:
                    step_input_id = connect_dict[keys]['id'];
                    map[input_id] = map[step_input_id];
        elif (len(connect_dict)) > 1:
             map[input_id] = "all"
    
    return map;

def removeFileExt(file_name):
    """
    function for removing file extension from filename
    i.e. returns "test" from "test.fastq" 
    """
    split_num = file_name.strip().split('.');
    if len(split_num) > 0:
        return split_num[0];
    else:
        return file_name;


def createStepsAnnot(file_list, workflow):
    #print "createStepsAnnot called"
    """
    Replicates an input dictionary : "X" number of times depending on value of repeat_num 
    """
    
    updated_dict = {};
    temp_steps = workflow["steps"];
    repeat_num = len(file_list);
    
    map = workflowMap(workflow);
    
    for i in range(0, repeat_num):
        for j in range(0, len(temp_steps)):
            curr_id = str(len(temp_steps)*i+j);
            curr_step = str(j);
            curr_workflow_step = copy.deepcopy(temp_steps[curr_step])
            
            # 1. Update steps: id
            curr_workflow_step["id"] = int(curr_id);
            
            # 2. Update any connecting input_ids
            input_dict = curr_workflow_step["input_connections"];
            num_inputs = len(input_dict);
            if (input_dict):
                for key in input_dict.keys():
                    if input_dict[key]['id'] is not None:
                        input_id_old = input_dict[key]['id']
                        input_id_new = (len(temp_steps)*i+int(input_id_old));
                        input_dict[key]['id'] = input_id_new;
            
            # 3. Update positions 
            pos_dict = curr_workflow_step["position"];
            if pos_dict:
                top_pos = pos_dict["top"];
                left_pos = pos_dict["left"]
                # TODO: find a better way of defining positions 
                pos_dict["top"] = top_pos * (i+1);
           
           
            # 4. Updating post job actions for renaming datasets
            if (len(curr_workflow_step['inputs']) == 0):
                tool_name = curr_workflow_step["tool_id"];
                input_type = map[int(curr_step)];
                
                # getting current filename for workflow
                curr_filename = '';
                
                if input_type in file_list[i].keys():
                    curr_filename = removeFileExt(file_list[i][input_type]['assay_uuid'])
                elif input_type == 'all':
                    curr_filename = removeFileExt(file_list[i]['exp_file']['assay_uuid']) + ',' + removeFileExt(file_list[i]['input_file']['assay_uuid']);
                #### TODO ###
                # deal with over input_types from various workflows
                #else:
                
                # creates list of output names from specified tool to rename
                output_names = [];
                output_list = curr_workflow_step['outputs']
                if (len(output_list) > 0):
                    for ofiles in output_list:
                        output_names.append(ofiles['name']);
                
                # uses renamedataset action to rename output of specified tool
                if "post_job_actions" in curr_workflow_step:
                    pja_dict = curr_workflow_step["post_job_actions"];
                    
                    for oname in output_names:
                        temp_key = 'RenameDatasetAction' + str(oname);
                        #new_output_name = tool_name + ',' + input_type + ',' + str(oname) + ',' + curr_filename
                        new_output_name =  curr_filename + ","  + tool_name + ',' + input_type + ',' + str(oname)
                        
                        # if rename dataset action already exists for this tool output
                        if temp_key in pja_dict:
                            pja_dict[temp_key]['action_arguments']['newname'] = new_output_name;
                        # whether post_job_action,RenameDatasetAction exists or not
                        else:
                            new_rename_action =  '{ "action_arguments": { "newname": "%s" }, "action_type": "RenameDatasetAction", "output_name": "%s"}' % (new_output_name, oname);
                            new_rename_dict = ast.literal_eval(new_rename_action);
                            pja_dict[temp_key] = new_rename_dict;

            # Adds updated module 
            updated_dict[curr_id] = curr_workflow_step;
            
    return updated_dict;

def createSteps(repeat_num, workflow):
    #print "createSteps called"
    """
    Replicates an input dictionary : "X" number of times depending on value of repeat_num 
    """
    
    updated_dict = {};
    temp_steps = workflow["steps"];
    
    for i in range(0, repeat_num):
        for j in range(0, len(temp_steps)):
            curr_id = str(len(temp_steps)*i+j);
            curr_step = str(j);
            curr_workflow_step = copy.deepcopy(temp_steps[curr_step])
            
            # 1. Update steps: id
            curr_workflow_step["id"] = int(curr_id);
            
            # 2. Update any connecting input_ids
            input_dict = curr_workflow_step["input_connections"];
            if (input_dict):
                for key in input_dict.keys():
                    if input_dict[key]['id'] is not None:
                        input_id_old = input_dict[key]['id']
                        input_id_new = (len(temp_steps)*i+int(input_id_old));
                        input_dict[key]['id'] = input_id_new;
            
            # 3. Update positions 
            pos_dict = curr_workflow_step["position"];
            if pos_dict:
                top_pos = pos_dict["top"];
                left_pos = pos_dict["left"]
                # TODO: find a better way of defining positions 
                pos_dict["top"] = top_pos * (i+1);
            
            # Adds updated module 
            updated_dict[curr_id] = curr_workflow_step;
            
    return updated_dict;