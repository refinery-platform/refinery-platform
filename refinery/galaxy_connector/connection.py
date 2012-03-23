'''
Created on Jan 5, 2012

A class that talks to Galaxy. Most of the basic API call code (get, post, put, delete) is derived from the common.py file found
in the Galaxy API example directory.

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

import urllib2
import simplejson
import os
from galaxy_connector.galaxy_workflow import GalaxyWorkflow
from galaxy_connector.galaxy_workflow import GalaxyWorkflowInput
from galaxy_connector.galaxy_history import GalaxyHistory
from galaxy_connector.galaxy_history import GalaxyHistoryItem
from galaxy_connector.galaxy_library import GalaxyLibrary
from galaxy_connector.galaxy_library import GalaxyLibraryItem


class Connection( object ):
    '''
    classdocs
    '''

    def __init__(self, base_url, data_url, api_url, api_key ):
        '''
        Constructor
        '''
        self.base_url = base_url
        self.data_url = data_url
        self.api_url = api_url
        self.api_key = api_key

    # =========================================================================================================
                
    def make_url( self, command, args=None ):
        # Adds the API Key to the URL if it's not already there.
        if args is None:
            args = []
        argsep = '?'
        args.insert( 0, ( 'key', self.api_key ) )
        return self.base_url + '/' + self.api_url + '/' + command + argsep + '&'.join( [ '='.join( t ) for t in args ] )
        
    def get( self, command ):
        url = self.make_url( command )
        try:
            return simplejson.loads( urllib2.urlopen( url ).read() )
        except simplejson.decoder.JSONDecodeError:
            return simplejson.loads( "{}" )

    def post( self, command, data ):
        url = self.make_url( command )
        request = urllib2.Request( url, headers = { 'Content-Type': 'application/json' }, data = simplejson.dumps( data ) )
        return simplejson.loads( urllib2.urlopen( request ).read() )

    def put( self, command, data ):
        url = self.make_url( command )
        request = urllib2.Request( url, headers = { 'Content-Type': 'application/json' }, data = simplejson.dumps( data ))
        request.get_method = lambda: 'PUT'
        return simplejson.loads( urllib2.urlopen( request ).read() )

    def delete( self, command, data ):
        url = self.make_url( command )
        request = urllib2.Request( url, headers = { 'Content-Type': 'application/json' }, data = simplejson.dumps( data ))
        request.get_method = lambda: 'DELETE'
        return simplejson.loads( urllib2.urlopen( request ).read() )

    # =========================================================================================================
                    
    def get_histories( self ):            
        return self.get( "histories" )
    
    
    def get_history_id( self, history_name ):
        '''
        Returns zero or more identifiers for histories with the provided name.
        '''            
        histories = self.get_histories()
        identifiers = [] 
        
        for history in histories:
            if history['name'] == history_name:
                identifiers.append( history['id'] )
        
        return identifiers                
            
    def get_history( self, history_id ):            
        return self.get( "histories" + "/" + history_id )

    def get_history_state_details( self, history_id ):            
        return self.get( "histories" + "/" + history_id )["state_details"]

    def get_history_contents( self, history_id ):            
        return self.get( "histories" + "/" + history_id + "/" + "contents" )

    def get_history_content( self, history_id, content_id ):            
        return self.get( "histories" + "/" + history_id + "/" + "contents" + "/" + content_id )


    def get_complete_histories( self ):
        histories = []
        
        for history_entry in self.get_histories():
            history = GalaxyHistory( history_entry['name'], history_entry['id'] )
                
            # get state and state details        
            history.state = self.get_history( history.identifier )['state']
            
            if self.get_history( history.identifier ).has_key( 'state_details' ):
                history.state_details = self.get_history( history.identifier )['state_details']
            else:
                history.state_details = {}
                                    
            for history_content_entry in self.get_history_contents( history.identifier ):                        
                history_item = GalaxyHistoryItem( history_content_entry['name'], history_content_entry['id'] )

                history_content_item_entry = self.get_history_content( history.identifier, history_item.identifier )                                        
                history_item.state = history_content_item_entry['state']
                history_item.file_type = history_content_item_entry['data_type']
                history_item.file_size = history_content_item_entry['file_size']
                
                history.add_item(history_item)
        
            histories.append(history)
        
        return histories
        
        
    def create_history( self, name ):
        data = {}
        data['name'] = name
        try:            
            return self.post( "histories", data )["id"]
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return 'Error. '+ str( e.read( 1024 ) )
        
    def delete_history(self, history_id):
        """
        DELETE /api/histories/{history_id}
        Deletes a specified history
        """
        data = {}
        data[ 'purge' ] = True    
        try:
            return self.delete( "histories" + "/" + history_id, data )
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )

    # =========================================================================================================

    def get_libraries( self ):            
        return self.get( "libraries" )
    
    
    def get_library_id( self, library_name ):
        '''
        Returns zero or more identifiers for libraries with the provided name.
        '''            
        libraries = self.get_libraries()
        identifiers = [] 
        
        for library in libraries:
            if library['name'] == library_name:
                identifiers.append( library['id'] )
        
        return identifiers
    
    
    def get_library_item_id( self, library_id, item_name, item_type=None ):
        items = self.get_library_contents( library_id )
        identifiers = []
        
        for item in items:
            if item['name'] == item_name:
                if not type == None:
                    if item["type"] == item_type:
                        identifiers.append( item["id"] )
                else:
                    identifiers.append( item["id"] )
                    
        return identifiers
    
            
    def get_library( self, library_id ):            
        return self.get( "libraries" + "/" + library_id )


    def get_library_contents( self, history_id ):            
        return self.get( "libraries" + "/" + history_id + "/" + "contents" )


    def get_library_content( self, library_id, content_id ):            
        return self.get( "libraries" + "/" + library_id + "/" + "contents" + "/" + content_id )


    def create_library( self, name ):
        data = {}
        data['name'] = name
        try:            
            return self.post( "libraries", data )[0]["id"]
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return 'Error. '+ str( e.read( 1024 ) )


    def put_into_library( self, library_id, filepath ):
        #if not os.path.isfile( filepath ):
        #    return None
                
        data = {}
        data['folder_id'] = self.get_library_item_id( library_id, "/", "folder" )[0]
        data['file_type'] = 'auto'
        data['dbkey'] = ''
        data['upload_option'] = 'upload_paths'
        data['filesystem_paths'] = filepath
        data['create_type'] = 'file'
        
        try:            
            return self.post( "libraries/%s/contents" % library_id, data )[0]["id"]
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return 'Error. '+ str( e.read( 1024 ) )
        

    def get_complete_libraries( self ):
        libraries = []
        
        for library_entry in self.get_libraries():
            library = GalaxyLibrary( library_entry['name'], library_entry['id'] )
            
            for library_content_entry in self.get_library_contents( library.identifier ):                        
                library_item = GalaxyLibraryItem( library_content_entry['name'], library_content_entry['id'] )
                library_item.type = library_content_entry['type']

                #library_content_item_entry = self.get_library_content( library.identifier, library_item.identifier )                                        
                #library_item.type = library_content_item_entry['type']
                
                library.add_item(library_item)
        
            libraries.append(library)
        
        return libraries


    # =========================================================================================================

    def get_workflows( self ):            
        return self.get( "workflows" )

    def get_workflow_id( self, workflow_name ):
        '''
        Returns zero or more identifiers for libraries with the provided name.
        '''            
        workflows = self.get_workflows()
        identifiers = [] 
        
        for workflow in workflows:
            if workflow['name'] == workflow_name:
                identifiers.append( workflow['id'] )
        
        return identifiers

    def get_workflow( self, workflow_id ):            
        return self.get( "workflows" + "/" + workflow_id )
    
    def get_complete_workflows( self ):
        workflows = []
        
        for workflow_entry in self.get_workflows():
            workflow = GalaxyWorkflow( workflow_entry['name'], workflow_entry['id'] )
            
            # get workflow inputs
            for i in range( len( self.get_workflow( workflow.identifier )['inputs'] ) ):
                
                input_identifier = self.get_workflow( workflow.identifier )['inputs'].keys()[i]
                
                workflow_input = GalaxyWorkflowInput( self.get_workflow( workflow.identifier )['inputs'][input_identifier]['label'], input_identifier )                        
                workflow.add_input(workflow_input)
            
            workflows.append(workflow)
        
        return workflows
    
    # TODO: implement the inputs as a dictionary that maps input_identifiers (defined by workflow) to file_ids (in the library)
    def run_workflow( self, workflow_id, input_map, history_id ):
        workflow = self.get_workflow( workflow_id )
        
        data = {}
        data["workflow_id"] = workflow_id
        data["history"] = "hist_id=%s" % ( history_id )
        data["ds_map"] = {}
        
        for input_identifier, input_details in workflow["inputs"].iteritems():
            data["ds_map"][input_identifier] = { "src": "ld", "id": input_map[0] }
        
        try:            
            return self.post( "workflows", data )
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )

    
    def run_workflow2( self, workflow_id, input_map, history_id ):
        workflow = self.get_workflow( workflow_id )
        data = {}
        data["workflow_id"] = workflow_id
        data["history"] = "hist_id=%s" % ( history_id )
        data["ds_map"] = {}
        
        # TODO: NEED A MUCH BETTER WAY OF MAPPING INPUT TO EXPERIMENT #
        
        #------------ CONFIGURE INPUT FILES -------------------------- #   
        exp_count = 0;
        input_count = 0;
        
        for in_key, input_details in workflow["inputs"].iteritems():
            inType = workflow['inputs'][in_key]['label'];
            if inType == 'input_file':
                winput_id = input_map[input_count]['input']['id'];
                input_count += 1;
            else:
                winput_id = input_map[exp_count]['exp']['id'];
                exp_count += 1;
            
            data["ds_map"][in_key] = { "src": "ld", "id": winput_id }
            
        
        try:            
            return self.post( "workflows", data )
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )
   

    def get_workflow_dict(self, workflow_id):
        """
        GET /api/workflows/{encoded_workflow_id}/download
        Returns a selected workflow as a json dictionary. 
        """
        try:
            return self.get( "workflows/download/" + workflow_id )
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )
        
    def delete_workflow(self, workflow_id):
        """
        DELETE /api/workflows/{encoded_workflow_id}
        Deletes a specified workflow
        """
        
        data = {}
        data[ 'purge' ] = True
        
        try:
            return self.delete( "workflows" + "/" + workflow_id, data )
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )

    def import_workflow(self, data):
        """
        POST /api/workflows
        Importing dynamic workflows from the api. Return newly generated workflow id.
        # currently assumes payload['workflow'] is a json representation of a workflow to be inserted into the database
        """
        wdata = {};
        wdata ['workflow'] = data;
        
        try:
            return self.post("workflows/upload", wdata);
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )
            
    # =========================================================================================================    
    

