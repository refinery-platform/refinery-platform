'''
Created on Jan 11, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

import simplejson
import copy

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
    base_dict["name"] = workflow_name;
    base_dict["steps"] = {};
    return base_dict;

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
            
            # 4. if an input module
            #print len(curr_workflow_step['inputs'])
           # if len(curr_workflow_step['inputs']) ==1:
            #    curr_workflow_step["inputs"][0]['repeat'] = i;
                #print curr_workflow_step["name"];
                #print curr_workflow_step['inputs']
                #print curr_workflow_step["name"];
            
            # Adds updated module 
            updated_dict[curr_id] = curr_workflow_step;
            
    return updated_dict;