'''
Created on Jan 11, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

class GalaxyHistory( object ):
    '''
    classdocs
    '''

    def __init__(self, name, identifier ):
        '''
        Constructor
        '''
        self.name = name
        self.identifier = identifier
        self.items = []
        self.state = ""
        self.state_details = {}       
        
    def __unicode__(self):
        return self.name + " (" + self.identifier + "): " + str( len( self.items ) ) + " items"      

    # =========================================================================================================
                
    def add_item( self, history_item ):
        self.items.append( history_item )
        


class GalaxyHistoryItem( object ):
    
    def __init__(self, name, identifier ):
        '''
        Constructor
        '''
        self.name = name
        self.identifier = identifier
        self.file_type = ""
        self.file_size = 0
        self.state = ""        
        
    def __unicode__(self):
        return self.name + " (" + self.identifier + "): " + self.data_type        
