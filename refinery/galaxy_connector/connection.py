'''
Created on Jan 5, 2012

A class that talks to Galaxy. Most of the basic API call code (get, post, put, delete) is derived from the common.py file found
in the Galaxy API example directory.

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

import httplib
import logging
import requests
import urllib2
import simplejson
import core
from galaxy_connector.exceptions import *
from galaxy_connector.galaxy_workflow import GalaxyWorkflow
from galaxy_connector.galaxy_workflow import GalaxyWorkflowInput
from galaxy_connector.galaxy_history import GalaxyHistory
from galaxy_connector.galaxy_history import GalaxyHistoryItem
from galaxy_connector.galaxy_library import GalaxyLibrary
from galaxy_connector.galaxy_library import GalaxyLibraryItem


logger = logging.getLogger(__name__)


class Connection(object):
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
                
    def make_url( self, command, args=None, is_data=False, key=True ):
        # Adds the API Key to the URL if it's not already there.
        if args is None:
            args = []
        argsep = '?'
        args.insert( 0, ( 'key', self.api_key ) )
        if (is_data):
            if key:
                return self.base_url + '/' + self.data_url + '/' + command + argsep + '&'.join( [ '='.join( t ) for t in args ] )
            else:
                return self.base_url + '/' + self.data_url + '/' + command  + argsep + "to_ext=txt"
        else:
            return self.base_url + '/' + self.api_url + '/' + command + argsep + '&'.join( [ '='.join( t ) for t in args ] )

    def get(self, command):
        '''Make a GET request to the current Galaxy instance.

        '''
        url = self.make_url(command)
        # check for connection errors
        try:
            response = requests.get(url)
        except requests.exceptions.ConnectionError as e:
            logger.error(e.message.message)
            raise ConnectionError()
        except requests.exceptions.Timeout as e:
            logger.error(e.message)
            raise TimeoutError()
        except httplib.IncompleteRead as e:
            logger.error(e)
            raise ResponseError()
        # check for HTTP errors
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logger.error(e.message + ' - ' + e.response.url)
            if e.response.status_code == 400:
                raise ResourceError()
            elif response.status_code == 403:
                raise AuthError()
            elif response.status_code == 404:
                raise ResourceNameError()
            elif response.status_code == 416:
                raise DatasetError()
            elif response.status_code == 500:
                raise ServerError()
            elif response.status_code == 503:
                raise ServiceError()
            else:
                raise UnknownResponseError()
        # check for response content errors
        try:
            return response.json()
        except simplejson.decoder.JSONDecodeError as e:
            logger.error(e.msg)
            raise InvalidResponseError()

    def post(self, command, data):
        url = self.make_url(command)
        # check for connection errors
        try:
            response = requests.post(
                                     url,
                                     data=simplejson.dumps(data),
                                     headers={'Content-Type': 'application/json'}
                                     )
        except requests.exceptions.ConnectionError as e:
            logger.error(e.message.message)
            raise ConnectionError()
        except requests.exceptions.Timeout as e:
            logger.error(e.message)
            raise TimeoutError()
        except httplib.IncompleteRead as e:
            logger.error(e)
            raise ResponseError()
        # check for HTTP errors
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logger.error(e.message + ' - ' + e.response.url)
            if e.response.status_code == 400:
                raise ResourceError()
            elif response.status_code == 403:
                raise AuthError()
            elif response.status_code == 404:
                raise ResourceNameError()
            elif response.status_code == 416:
                raise DatasetError()
            elif response.status_code == 500:
                raise ServerError()
            elif response.status_code == 503:
                raise ServiceError()
            else:
                raise UnknownResponseError()
        # check for response content errors
        try:
            return response.json()
        except simplejson.decoder.JSONDecodeError as e:
            logger.error(e.msg)
            raise InvalidResponseError()

    def delete(self, command, data):
        url = self.make_url(command)
        # check for connection errors
        try:
            response = requests.delete(url, data=simplejson.dumps(data),
                                       headers={'Content-Type': 'application/json'})
        except requests.exceptions.ConnectionError as e:
            logger.error(e.message.message)
            raise ConnectionError()
        except requests.exceptions.Timeout as e:
            logger.error(e.message)
            raise TimeoutError()
        # check for HTTP errors
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logger.error(e.message + ' - ' + e.response.url)
            if e.response.status_code == 400:
                raise ResourceError()
            elif response.status_code == 403:
                raise AuthError()
            elif response.status_code == 404:
                raise ResourceNameError()
            elif response.status_code == 416:
                raise DatasetError()
            elif response.status_code == 500:
                raise ServerError()
            else:
                raise UnknownResponseError()
        # check for response content errors
        try:
            return response.json()
        except simplejson.decoder.JSONDecodeError as e:
            logger.error(e.msg)
            raise InvalidResponseError()

    # =========================================================================================================

    def get_histories(self):
        return self.get("histories")

    def get_history_id(self, history_name):
        '''Returns zero or more identifiers for histories with the provided name.

        '''
        histories = self.get_histories()
        identifiers = []

        for history in histories:
            if history['name'] == history_name:
                identifiers.append(history['id'])

        return identifiers

    def get_history(self, history_id):
        try:
            return self.get("histories/" + history_id)
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(history_id)

    def get_history_contents(self, history_id):
        try:
            return self.get("histories/" + history_id + "/contents")
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(history_id)

    def get_history_content(self, history_id, content_id):
        try:
            return self.get("histories/" + history_id + "/contents/" + content_id)
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(history_id)

    def get_history_file_type( self, history_id, content_id ):
        '''
        Content is expected to be of type "file".
        Returns the history content data_type, i.e. the file type of a content item in the history.
        '''
        history_content = self.get_history_content(history_id, content_id)

        if "data_type" not in history_content:
            return None
        else:
            return history_content["data_type"]


    def get_history_file_list(self, history_id):
        '''Returns a list of dictionaries that contain the name, type, state and
        download URL of all _files_ in a history.

        '''        
        files = []

        for history_content_entry in self.get_history_contents(history_id):

            if "type" not in history_content_entry:
                continue
            
            if history_content_entry["type"] != "file":
                continue

            file_info = {}
            file_info["name"] = history_content_entry["name"]
            file_info["url"] = history_content_entry["url"]

            history_content = self.get_history_content(
                history_id, history_content_entry["id"])

            if "data_type" not in history_content:
                file_info["type"] = None
            else:
                file_info["type"] = history_content["data_type"]

            if "state" not in history_content:
                file_info["state"] = None
            else:
                file_info["state"] = history_content["state"]

            if "id" not in history_content:
                file_info["dataset_id"] = None
            else:
                file_info["dataset_id"] = history_content["id"]

            if "file_size" not in history_content:
                file_info["file_size"] = None
            else:
                file_info["file_size"] = history_content["file_size"]

            if "visible" not in history_content:
                file_info["visible"] = None
            else:
                file_info["visible"] = history_content["visible"]

            if "file_name" not in history_content:
                file_info["file_name"] = None
            else:
                file_info["file_name"] = history_content["file_name"]

            if "genome_build" not in history_content:
                file_info["genome_build"] = None
            else:
                file_info["genome_build"] = history_content["genome_build"]   

            if "misc_info" not in history_content:
                file_info["misc_info"] = None
            else:
                file_info["misc_info"] = history_content["misc_info"]

            if "misc_blurb" not in history_content:
                file_info["misc_blurb"] = None
            else:
                file_info["misc_blurb"] = history_content["misc_blurb"]

            files.append(file_info)

        return files    
        
        
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
        
        
    def create_history(self, name):
        data = {}
        data['name'] = name
        return self.post("histories", data)["id"]

    def delete_history(self, history_id):
        """DELETE /api/histories/{history_id}
        Deletes a specified history

        """
        data = {}
        data['purge'] = True
        try:
            url = "histories/" + history_id
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(history_id)
        return self.delete(url, data)

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

    def get_library_item_id(self, library_id, item_name, item_type=None):
        items = self.get_library_contents(library_id)
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

    def get_library_contents(self, history_id):
        try:
            return self.get("libraries/" + history_id + "/contents")
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(history_id)

    def get_library_content(self, library_id, content_id):
        try:
            url = "libraries/" + library_id
        except TypeError:
            raise MalformedResourceID(library_id)
        try:
            url += "/contents/" + content_id
        except TypeError:
            raise MalformedResourceID(content_id)
        return self.get(url)

    def create_library(self, name):
        logger.debug("library name: '{}'".format(name))
        data = {}
        data['name'] = name
        ret_val = self.post("libraries", data)
        # Older galaxy versions return an array,
        # newer galaxy api's return a single dictionary
        if type(ret_val) == dict:
            return ret_val["id"]
        else:
            return ret_val[0]["id"]

    def put_into_library( self, library_id, filepath ):
        data = {}
        data['folder_id'] = self.get_library_item_id(library_id, "/", "folder")[0]
        data['file_type'] = 'auto'
        data['dbkey'] = ''
        data['upload_option'] = 'upload_paths'
        data['filesystem_paths'] = filepath
        data['create_type'] = 'file'
        url = "libraries/" + library_id + "/contents"
        return self.post(url, data)[0]["id"]

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

    def delete_library(self, library_id):
        """DELETE /api/library/{library_id}
        Deletes a specified library

        """
        data = {}
        data['purge'] = True
        # TODO: Figure out way to purge data library
        try:
            url = "libraries/" + library_id
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(library_id)
        return self.delete(url, data)

    # =========================================================================================================

    def get_progress(self, history_id):            
        history = self.get_history(history_id)
        if "state_details" not in history:
            return ({"percent_complete": 0,
                     "workflow_state": history["state"],
                     "message": "Preparing ..." })
        else:
            return ({"percent_complete": 100,
                     "workflow_state": history["state"],
                     "message": history["state_details"]})

    # =========================================================================================================

    def get_workflows(self):            
        return self.get("workflows")

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

    def get_workflow(self, workflow_id):
        try:
            return self.get("workflows/" + workflow_id)
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(workflow_id)
    
    def get_complete_workflows(self):
        workflows = []
        for workflow_entry in self.get_workflows():
            workflow = GalaxyWorkflow(workflow_entry['name'], workflow_entry['id'])
            # get workflow inputs
            for i in range(len(self.get_workflow(workflow.identifier)['inputs'])):
                input_identifier = \
                    self.get_workflow(workflow.identifier)['inputs'].keys()[i]
                workflow_input = GalaxyWorkflowInput(
                    self.get_workflow(workflow.identifier)['inputs'][input_identifier]['label'],
                    input_identifier)
                workflow.add_input(workflow_input)
            workflows.append(workflow)
        return workflows

    def run_workflow( self, workflow_id, input_map, history_id, workflow_uuid ):
        workflow = self.get_workflow(workflow_id)
        data = {}
        data["workflow_id"] = workflow_id
        data["history"] = "hist_id=%s" % ( history_id )
        data["ds_map"] = {}

        # retrieving workflow based on input workflow_uuid
        #TODO: handle DoesNotExist and MultipleObjectsReturned exceptions
        curr_workflow = core.models.Workflow.objects.get(uuid=workflow_uuid)
        # getting distinct workflow inputs
        workflow_data_inputs = curr_workflow.data_inputs.all()
        annot_inputs = {}
        annot_counts = {}
        for data_input in workflow_data_inputs:
            input_type = data_input.name
            annot_inputs[input_type] = []
            annot_counts[input_type] = 0
        #------------ CONFIGURE INPUT FILES -------------------------- #   
        for in_key, input_details in workflow["inputs"].iteritems():
            inType = workflow['inputs'][in_key]['label'];

            if inType in annot_inputs:
                temp_count = annot_counts[inType]
                winput_id = input_map[temp_count][inType]['id']
                annot_counts[inType] = temp_count + 1
            
            data["ds_map"][in_key] = { "src": "ld", "id": winput_id }

        return self.post("workflows", data)

    def run_workflow3(self, data):
        """
        Run galaxy workflow with preconfigured inputs (ds_map)
        """
        try:            
            return self.post( "workflows", data )
        except urllib2.HTTPError, e:
            print str( e.read( 1024 ) )
            return "Error. " + str( e.read( 1024 ) )

    def get_workflow_dict(self, workflow_id):
        """GET /api/workflows/download/{encoded_workflow_id}
        Returns a selected workflow as a json dictionary.

        """
        try:
            return self.get("workflows/download/" + workflow_id)
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(workflow_id)

    def delete_workflow(self, workflow_id):
        """DELETE /api/workflows/{encoded_workflow_id}
        Deletes a specified workflow

        """
        data = {}
        data['purge'] = True
        try:
            url = "workflows/" + workflow_id
        except TypeError:
            # avoid using ID that's not a string
            raise MalformedResourceID(workflow_id)
        return self.delete(url, data)

    def import_workflow(self, data):
        """POST /api/workflows
        Importing dynamic workflows from the api. Return newly generated workflow id.
        # currently assumes payload['workflow'] is a json representation of a workflow to be inserted into the database
        """
        wdata = {};
        wdata['workflow'] = data;
        return self.post("workflows/upload", wdata);
