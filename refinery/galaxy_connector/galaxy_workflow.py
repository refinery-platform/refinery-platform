'''
Created on Jan 11, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

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

    # =========================================================================================================
                
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
