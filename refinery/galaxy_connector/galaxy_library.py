'''
Created on Jan 13, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

class GalaxyLibrary( object ):
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
        
    def __unicode__(self):
        return self.name + " (" + self.identifier + "): " + str( len( self.items ) ) + " items"      

    # =========================================================================================================
                
    def add_item( self, library_item ):
        self.items.append( library_item )
        


class GalaxyLibraryItem( object ):
    
    def __init__(self, name, identifier ):
        '''
        Constructor
        '''
        self.name = name
        self.identifier = identifier
        self.type = ""
        
    def __unicode__(self):
        return self.name + " (" + self.identifier + ")"        
