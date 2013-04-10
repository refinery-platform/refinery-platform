'''
Created on Jan 11, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

from datetime import datetime
import ast
import copy
import logging
import matplotlib.pyplot as plt
import networkx as nx
import simplejson


# get module logger
logger = logging.getLogger(__name__)

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
    logger.debug("galaxy_workflow.createStepsAnnot called")
    
    """
    Replicates an input dictionary : "X" number of times depending on value of repeat_num 
    """
    
    updated_dict = {};
    temp_steps = workflow["steps"];
    repeat_num = len(file_list);
    history_download = []
    map = workflowMap(workflow);
    
    # connections between workflow inputs and nodes
    connections = []
    
    #print "map"
    #print map
    #print "file_list"
    #print file_list
            
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
            input_type = map[int(curr_step)];    
            if (len(curr_workflow_step['inputs']) == 0):
                tool_name = parse_tool_name(curr_workflow_step["tool_id"]);
                
                # getting current filename for workflow
                curr_filename = ''
                
                if input_type in file_list[i].keys():
                    curr_filename = removeFileExt(file_list[i][input_type]['node_uuid'])
                else:
                    curr_filename = ''
                    curr_nodelist = []
                    for itypes in file_list[i].keys():
                        temp_name = removeFileExt(file_list[i][itypes]['node_uuid'])
                        # array of node_uuids associated with the current toolset
                        curr_nodelist.append(temp_name)
                        
                        if curr_filename == '':
                            curr_filename += temp_name
                        else:
                            curr_filename += ','+ temp_name
               
                # getting "keep" flag to keep track of files to be saved from workflow
                # parsing annotation field in galaxy workflows to parse output files to keep: "keep=output_file, keep=output_file2" etc..
                step_annot = curr_workflow_step['annotation']
                
                #step_annot2 = getStepOptions(curr_workflow_step['annotation'])
                keep_files = {}
                
                # Update with added JSON to define description and new names of files 
                if curr_workflow_step['annotation']:
                    #print "FOUND refinery_files"
                    try:
                        #keep_files = ast.literal_eval(step_annot2['refinery_files'][0])
                        keep_files = ast.literal_eval(curr_workflow_step['annotation'])
                        #print keep_files
                    except Exception:
                        logger.error("Malformed String in Galaxy Workflow: " + str(curr_workflow_step['annotation']))
                
                # creates list of output names from specified tool to rename
                output_names = [];
                output_list = curr_workflow_step['outputs']
                if (len(output_list) > 0):
                    for ofiles in output_list:
                        output_names.append(ofiles['name'])
                                
                # uses renamedataset action to rename output of specified tool
                if "post_job_actions" in curr_workflow_step:
                    pja_dict = curr_workflow_step["post_job_actions"]
                    
                    for ofiles in output_list:
                        oname = str(ofiles['name'])
                        # galaxy output file type 
                        otype = str(ofiles['type'])
                        temp_key = 'RenameDatasetAction' + oname
                        #new_output_name = tool_name + ',' + input_type + ',' + str(oname) + ',' + curr_filename
                        new_output_name =  curr_filename + ","  + tool_name + ',' + input_type + ',' + oname
                        new_tool_name = str(curr_id) + "_" + oname
                        
                        # store information about the output files of this tools
                        analysis_node_connection = {}
                        analysis_node_connection['filename'] = oname
                        analysis_node_connection['name'] = oname
                        analysis_node_connection['subanalysis'] = i
                        analysis_node_connection['step'] = curr_id
                        analysis_node_connection['filetype'] = otype
                        analysis_node_connection['direction'] = 'out'
                        analysis_node_connection['node_uuid'] = None # setting to none will trigger creation of a new Node                                                 
                        analysis_node_connection['is_refinery_file'] = False
                        
                        # if the output name is being tracked and downloaded for Refinery
                        if str(oname) in keep_files.keys():
                            #print "KEY FOUND: refinery_files = " + str(oname)
                            analysis_node_connection['is_refinery_file'] = True
                            
                            if input_type in file_list[i].keys():
                                curr_pair_id = file_list[i][input_type]['pair_id']
                                curr_pair_id = str((i)-1+int(curr_pair_id)) 
                            else:
                                curr_pair_id = ''
                                for itypes in file_list[i].keys():
                                    
                                    if curr_pair_id == '':
                                        curr_pair_id += str(file_list[i][itypes]['pair_id'])
                                    else:
                                        curr_pair_id += "," + str(file_list[i][itypes]['pair_id'])
                           
                            curr_result = {}
                            curr_result["step_id"] = new_tool_name
                            curr_result["pair_id"] = curr_pair_id
                            user_output_name = str(i+1) + '_' + keep_files[str(oname)]['name']
                            curr_result["name"] = user_output_name
                            analysis_node_connection['name'] = user_output_name
                            
                            
                            try:
                                # Using Refinery defined tool filetype
                                curr_result["type"] = keep_files[str(oname)]['type']
                                analysis_node_connection['filetype'] = curr_result["type"]
                            except KeyError:
                                logger.error("Current Galaxy Tool: %s is missing 'type' definition" % curr_workflow_step['name'])
                            
                            #print "curr_result"
                            #print curr_result
                            
                            history_download.append(curr_result)
                            
                        # store information about this output file    
                        connections.append(analysis_node_connection)
                        
                        # if rename dataset action already exists for this tool output
                        if temp_key in pja_dict:
                            # renaming output files according with step_id of workflow
                            #pja_dict[temp_key]['action_arguments']['newname'] = new_output_name;
                            pja_dict[temp_key]['action_arguments']['newname'] = curr_id;
                        
                        # whether post_job_action,RenameDatasetAction exists or not
                        else:
                            # renaming output files according with step_id of workflow  
                            #new_rename_action =  '{ "action_arguments": { "newname": "%s" }, "action_type": "RenameDatasetAction", "output_name": "%s"}' % (new_output_name, oname);
                            new_rename_action =  '{ "action_arguments": { "newname": "%s" }, "action_type": "RenameDatasetAction", "output_name": "%s"}' % (new_tool_name, oname);
                            
                            new_rename_dict = ast.literal_eval(new_rename_action);
                            pja_dict[temp_key] = new_rename_dict;
                                        
            # 5. adding node uuid for each input step
            elif (len(curr_workflow_step['inputs']) > 0):
                #print file_list
                
                # adding node uuid to input description field 
                if input_type in file_list[i].keys():
                    curr_node = str(removeFileExt(file_list[i][input_type]['node_uuid']))
                    curr_workflow_step['inputs'][0]['description'] = str(curr_node)
                    curr_workflow_step['annotation'] = str(curr_node)
                                        
                    connections.append({ 'node_uuid': curr_node,
                                         'step': int(curr_workflow_step['id']),
                                         'filename': curr_workflow_step['inputs'][0]['name'],
                                         'name': curr_workflow_step['inputs'][0]['name'], 
                                         'subanalysis': i,
                                         'filetype': None,
                                         'direction': 'in',
                                         'is_refinery_file': True })  
                
                    
            # Adds updated module 
            updated_dict[curr_id] = curr_workflow_step;
    
    #print "history_download"
    #print simplejson.dumps(history_download, indent=4)
    
    return updated_dict, history_download, connections;

def createStepsCompact(file_list, workflow):
    # Deals with the case where we want multiple inputs to propogate into a single tool i.e. bulk downloader
    logger.debug("galaxy_workflow.createStepsCompact called")
    
    
    updated_dict = {};
    temp_steps = workflow["steps"];
    repeat_num = len(file_list);
    history_download = []
    map = workflowMap(workflow);
    
    # connections between workflow inputs (and outputs) and node uuids
    connections = []
    
    print "file_list"
    print file_list
    
    counter = 0
    edge_ids = []
    check_step = ''
    for j in range(0, len(temp_steps)):
        curr_step = str(j);
        curr_workflow_step = copy.deepcopy(temp_steps[curr_step])
        curr_step_name = curr_workflow_step['name']
        
        # Looking for workflow_tags in galaxy i.e "repeat_for=\"Bulk Download Zipper\"",
        curr_step_annot = curr_workflow_step['annotation']
        #step_opt = getStepOptions(curr_workflow_step['annotation'])
        
        input_type = map[int(curr_step)];    
        keep_files = {}   
        
        # Update with added JSON to define description and new names of files 
        if curr_step_annot:
            #print "FOUND refinery_files"
            try:
                keep_files = ast.literal_eval(curr_step_annot)
                #print keep_files
            except Exception:
                logger.error("Malformed String in Galaxy Workflow: " + str(curr_workflow_step['annotation']))
        
        
        # creates list of output names from specified tool to rename
        output_names = [];
        output_list = curr_workflow_step['outputs']
        if (len(output_list) > 0):
            for ofiles in output_list:
                output_names.append(ofiles['name'])
        
        # uses renamedataset action to rename output of specified tool
        if "post_job_actions" in curr_workflow_step:
            pja_dict = curr_workflow_step["post_job_actions"]
            
            for oname in output_names:
                oname = str(oname)
                temp_key = 'RenameDatasetAction' + oname
                new_tool_name = str(1) + "_" + oname
                #new_output_name = tool_name + ',' + input_type + ',' + str(oname) + ',' + curr_filename
                
                # store information about the output files of this tools
                analysis_node_connection = {}
                analysis_node_connection['filename'] = oname
                analysis_node_connection['name'] = oname
                analysis_node_connection['subanalysis'] = 1
                analysis_node_connection['step'] = counter
                # TODO: set file type
                analysis_node_connection['filetype'] = None
                analysis_node_connection['direction'] = 'out'
                analysis_node_connection['node_uuid'] = None # setting to none will trigger creation of a new Node                                                 
                analysis_node_connection['is_refinery_file'] = False
                    
                if str(oname) in keep_files.keys():
                    #print "KEY FOUND: refinery_files = " + str(oname)    
                    analysis_node_connection['is_refinery_file'] = True
                    
                    # TODO: fix references to i here
                    curr_pair_id = 1
                    curr_result = {}
                    curr_result["step_id"] = new_tool_name
                    curr_result["pair_id"] = curr_pair_id
                    #curr_result["name"] = new_output_name
                    user_output_name = str(1) + '_' + keep_files[str(oname)]['name']
                    curr_result["name"] = user_output_name
                    analysis_node_connection['name'] = user_output_name
                    
                    try:
                        # Using Refinery defined tool filetype
                        curr_result["type"] = keep_files[str(oname)]['type']
                        analysis_node_connection['filetype'] = curr_result["type"]
                    except KeyError:
                        logger.error("Current Galaxy Tool: %s is missing 'type' definition" % curr_workflow_step['name'])

                    history_download.append(curr_result)
                    
                # store information about this output file    
                connections.append(analysis_node_connection)
                
                # if rename dataset action already exists for this tool output
                if temp_key in pja_dict:
                    # renaming output files according with step_id of workflow
                    pja_dict[temp_key]['action_arguments']['newname'] = new_output_name;
                    #pja_dict[temp_key]['action_arguments']['newname'] = str(counter);
                
                # whether post_job_action,RenameDatasetAction exists or not
                else:
                    # renaming output files according with step_id of workflow  
                    new_rename_action =  '{ "action_arguments": { "newname": "%s" }, "action_type": "RenameDatasetAction", "output_name": "%s"}' % (new_tool_name, oname);
                    new_rename_dict = ast.literal_eval(new_rename_action);
                    pja_dict[temp_key] = new_rename_dict;
        
        # checking to see if repeat_for tag exists for current tool            
        if "repeat_for" in keep_files:
            check_step = keep_files["repeat_for"]
            
            for i in range(0, len(file_list)):
                new_step = copy.deepcopy(temp_steps[curr_step])
                
                # updating step_id for new workflow step
                new_step['id'] = counter
                
                # keeping track of which ids to enter into connecting step
                edge_ids.append(counter)
                
                updated_dict[str(counter)] = new_step
                counter += 1
                
                # iterating through all input files to be zipped
                # adding node uuid for each input step
                if (len(new_step['inputs']) > 0):
                    # adding node uuid to input description field 
                    curr_node = str(removeFileExt(file_list[i][input_type]['node_uuid']))
                    curr_workflow_step['inputs'][0]['description'] = str(curr_node)
                    curr_workflow_step['annotation'] = str(curr_node)
                                        
                    connections.append({ 'node_uuid': curr_node,
                                         'step': int(new_step['id']),
                                         'filename': new_step['inputs'][0]['name'],
                                         'name': new_step['inputs'][0]['name'], 
                                         'subanalysis': i,
                                         'filetype': None,
                                         'direction': 'in',
                                         'is_refinery_file': True })  
            
        # creating edges between repeated segments of the workflow w/ connecting tool  
        elif (check_step != '' and check_step == curr_step_name ):
            #print ">>>>>>>> in creating edges to bulk tool"
            curr_connections = curr_workflow_step['input_connections']
            new_connections = {}
            tcount = 0
            key_tool_state = ''
            key_tool_val = ''
            for k,v in curr_connections.iteritems():
                if tcount < 1:
                    tindex = 0
                    for ei in edge_ids:
                        k2 = k.split("|")
                        new_edge = copy.deepcopy(v)

                        # file type
                        k_type = k2[1]
                        
                        # new key for dictionary i.e. files_to_zip_0|file to files_to_zip_
                        k3 = k2[0].split("_")
                        k_key = k3[len(k3)-1]
                        k_key = k2[0].rstrip(k_key)
                        
                        # new key
                        new_key = k_key + str(ei) + '|' + k_type
                        new_edge['id'] = ei
                        
                        # updated key for reinserting funky index value back into galaxy workflow tool_state
                        key_tool_state = k_key.rstrip('_')
                        new_connections[new_key] = new_edge
                        
                        temp_tool_val = '{"__index__": %s, "%s": null}' % (str(tindex),k_type)
                        
                        if (key_tool_val):
                            key_tool_val += ',' + temp_tool_val
                        else:
                            key_tool_val = temp_tool_val
                        
                        #'[{"__index__": 0, "file": null}]'
                        #"tool_state": "{\"__page__\": 0, \"files_to_zip\": \"[{\\\"__index__\\\": 0, \\\"file\\\": null}, {\\\"__index__\\\": 1, \\\"file\\\": null}, {\\\"__index__\\\": 2, \\\"file\\\": null}]\"}", 
                        tindex += 1
                
                tcount += 1 
            
            # convert tool_state into python dictionary
            temp = ast.literal_eval(curr_workflow_step['tool_state'])
            key_tool_val = '[' + key_tool_val + ']'
            temp[key_tool_state] = key_tool_val
            
            # dump the dictionary as string before putting it back into workflow
            curr_workflow_step['tool_state'] = simplejson.dumps(temp)
                                    
            # add updated connections back to galaxy workflow step
            curr_workflow_step['input_connections'] = new_connections
            
            curr_workflow_step['id'] = counter
            updated_dict[str(counter)] = curr_workflow_step
            counter += 1
        else:
            curr_workflow_step['id'] = counter
            updated_dict[str(counter)] = curr_workflow_step
            counter += 1

    #print "updated_dict"
    #print simplejson.dumps(updated_dict, indent=4);
    return updated_dict, history_download, connections;
    
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

def getStepOptions(step_annot):
    "Helper function: convert galaxy workflow step annotations into lookup dictionary"
    #logger.debug("galaxy_connector.galaxy_workflow getStepOptions called")     
    #logger.debug( step_annot )
    
    ret_dict = {}
        
    step_annot = step_annot.strip()
    
    if (step_annot):
        # splitting multiple options based on ';'
        step_split = step_annot.strip().split(';')
        for st in step_split:
            st_opts = st.strip().split('=')
            if len(st_opts) > 1:
                temp_key = st_opts[0].lstrip('\n').strip()
                temp_val = str(st_opts[1]).lstrip('\n').strip('"')
                # if key already exists in return dictionary
                if temp_key in ret_dict:
                    ret_dict[temp_key].append(temp_val)
                else:
                    ret_dict[temp_key] = [temp_val]
   
    #logger.debug(ret_dict)     
    return ret_dict

def countWorkflowSteps(workflow):
    """
    Helper function for counting number of workflow steps from a galaxy workflow. Number of steps in workflow is not reflective of the actual number of workflows created by galaxy when run
    """
    logger.debug("galaxy_connector.galaxy_workflow countWorkflowSteps called") 
    
    workflow_steps = workflow["steps"]
    total_steps = 0
    
    for j in range(0, len(workflow["steps"])):
        curr_step_id = str(j);
        curr_step = workflow_steps[curr_step_id]
        
        # count number of output files
        output_num = len(curr_step['outputs'])
        #print "############### output_num"
        #print output_num
        #print curr_step_id
        #print simplejson.dumps(curr_step, indent=4)
        
        if (output_num > 0):
            # check to see if HideDatasetActionoutput_ keys exist in current step
            if 'post_job_actions' in curr_step.keys():
                pja_step = curr_step['post_job_actions']
                pja_hide_count = 0
                pja_hide = False
                
                # if using HideDatasetActions from older versions of galaxy
                for k,v in pja_step.iteritems():
                    if (k.find('HideDatasetActionoutput_') > -1):
                        pja_hide_count += 1
                        pja_hide = True
                
                diff_count = output_num - pja_hide_count
                #print "DIFF COUNT: " + str(diff_count)
                
                # add one step if HideDatasetActionoutput_ = outputs for file
                if diff_count == 0:
                    total_steps += 1
                # add total number of steps for this defined step in galaxy workflow    
                else:
                    total_steps += diff_count
                    
                
        # case where their are no outputs associated with step
        elif (curr_step['type'] == 'data_input' ):
            total_steps += 1
            
        #print "\t\t TOTAL:STEPS= " + str(total_steps)
        
    #print "workflow_steps: " + str(len(workflow["steps"]))
    #print "total_steps: " + str(total_steps)
    
    return total_steps

def parse_tool_name(toolname):
    """ Creates a simpler tool name when dealing with Galaxy Toolshed tool names 
    
    :param toolname: Tool name defined from Galaxy i.e. toolshed.g2.bx.psu.edu/repos/jjohnson/igvtools/igvtools_tile/1.0
    :type toolname: string.
    :returns: parsed tool name i.e. igvtools 
    """
    temp = toolname.split("/")
    if len(temp) > 1:
        return temp[len(temp)-2]
    else:
        return toolname 
    
    
def create_workflow_graph(dictionary):
    graph = nx.MultiDiGraph()
    
    steps = dictionary["steps"];
    
    # iterate over steps to create nodes        
    for current_node_id, step in steps.iteritems():
        
        # ensure node id is an integer
        current_node_id = int(current_node_id)
        
        # create node
        graph.add_node(current_node_id)
        
        # add node attributes
        graph.node[current_node_id]['name'] = str(current_node_id) + ": " + step['name'];
        graph.node[current_node_id]['tool_id'] = step['tool_id'];
        graph.node[current_node_id]['type'] = step['type'];
        graph.node[current_node_id]['position'] = ( int(step['position']['left']), -int(step['position']['top']) );
        graph.node[current_node_id]['outputs'] = {}

        output_counter = 1
        
        for output in step['outputs']:
            output_counter += 1
            output_id = current_node_id*100 + output_counter
            output_name = str(output_id) + ": " + output["name"] + "(" + output["type"] + ")"
            
            graph.add_node(output_id)
            graph.add_edge(current_node_id,output_id)

            graph.node[output_id]['name'] = output_name;
            graph.node[output_id]['tool_id'] = "";
            graph.node[output_id]['type'] = "output";
            graph.node[output_id]['position'] = ( int(step['position']['left']), -int(step['position']['top'])-(20*output_counter) );
            graph.node[current_node_id]['outputs'][output['name']] = output_id;
            graph[current_node_id][output_id]['name'] = ""

                    
    # iterate over steps to create edges        
    for current_node_id, step in steps.iteritems():
        # ensure node id is an integer
        current_node_id = int(current_node_id)
        
        for edge_name, input_connection in step['input_connections'].iteritems():            
            parent_node_id = input_connection["id"]
            parent_node_output_name = input_connection["output_name"]
            # create edge from current node to input
            
            # basic edge
            print str( parent_node_id ) + " -> " + str( current_node_id )
            #graph.add_edge(parent_node_id,current_node_id)
            #graph[parent_node_id][current_node_id]['name'] = edge_name
            
            # find output (node) of parent node to which this input edge needs to be attached (based on name)
            try:
                parent_node_output_id = graph.node[parent_node_id]['outputs'][parent_node_output_name]
            except:
                parent_node_output_id = parent_node_id
            print str( parent_node_output_id ) + " -> " + str( current_node_id )
            graph.add_edge(parent_node_output_id,current_node_id)
            graph[parent_node_output_id][current_node_id]['name'] = edge_name
    
    return graph    


def create_expanded_workflow_graph(dictionary):
    graph = nx.MultiDiGraph()
    
    steps = dictionary["steps"];
    
    # iterate over steps to create nodes        
    for current_node_id, step in steps.iteritems():
        
        # ensure node id is an integer
        current_node_id = int(current_node_id)
        
        # create node
        graph.add_node(current_node_id)
        
        # add node attributes
        graph.node[current_node_id]['name'] = str(current_node_id) + ": " + step['name'];
        graph.node[current_node_id]['tool_id'] = step['tool_id'];
        graph.node[current_node_id]['type'] = step['type'];
        graph.node[current_node_id]['position'] = ( int(step['position']['left']), -int(step['position']['top']) );
        graph.node[current_node_id]['node'] = None
                    
    # iterate over steps to create edges (this is done by looking at input_connections, i.e. only by looking at tool nodes)        
    for current_node_id, step in steps.iteritems():
        # ensure node id is an integer
        current_node_id = int(current_node_id)
        
        for current_node_input_name, input_connection in step['input_connections'].iteritems():            
            parent_node_id = input_connection["id"]
            
            # test if parent node is a tool node or an input node to pick the right name for the outgoing edge
            if graph.node[parent_node_id]['type'] == 'data_input':
                parent_node_output_name = steps[str(parent_node_id)]['inputs'][0]['name']
            else:
                parent_node_output_name = input_connection['output_name']
            
            edge_output_id = str(parent_node_id) + '_' + parent_node_output_name;
            edge_input_id = str(current_node_id) + '_' + current_node_input_name
            edge_id = edge_output_id + '___' + edge_input_id  
            graph.add_edge(parent_node_id,current_node_id,key=edge_id)
            graph[parent_node_id][current_node_id]['output_id'] = str(parent_node_id) + '_' + parent_node_output_name              
            graph[parent_node_id][current_node_id]['input_id'] = str(current_node_id) + '_' + current_node_input_name
    
    return graph    
    
    