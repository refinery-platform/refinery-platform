'''
Created on Jan 5, 2012

A class that talks to Galaxy. Most of the basic API call code (get, post, put, delete) is derived from the common.py file found
in the Galaxy API example directory.

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''

import httplib
import logging
import requests
import simplejson
import core
from galaxy_connector.exceptions import *
from galaxy_connector.galaxy_history import GalaxyHistory
from galaxy_connector.galaxy_history import GalaxyHistoryItem
from galaxy_connector.galaxy_library import GalaxyLibrary
from galaxy_connector.galaxy_library import GalaxyLibraryItem


logger = logging.getLogger(__name__)


class Connection(object):
    '''

    '''
    def __init__(self, base_url, data_url, api_url, api_key ):
        '''Constructor

        '''
        self.base_url = base_url
        self.data_url = data_url
        self.api_url = api_url
        self.api_key = api_key

    def make_url(self, command, args=None, is_data=False, key=True):
        # Adds the API Key to the URL if it's not already there.
        if args is None:
            args = []
        argsep = '?'
        args.insert( 0, ( 'key', self.api_key ) )
        if (is_data):
            if key:
                return self.base_url + '/' + self.data_url + '/' + command + argsep + '&'.join( [ '='.join( t ) for t in args ] )
            else:
                # to download HTML files and linked resources as zip archives
                return self.base_url + '/' + self.data_url + '/' + command + '/display' + argsep + "to_ext=txt"
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
            if response.status_code == 400:
                raise ResourceError()
            elif response.status_code == 401:
                raise AuthenticationError()
            elif response.status_code == 403:
                raise AuthorizationError()
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
            if response.status_code == 400:
                raise ResourceError()
            elif response.status_code == 401:
                raise AuthenticationError()
            elif response.status_code == 403:
                raise AuthorizationError()
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
            if response.status_code == 400:
                raise ResourceError()
            elif response.status_code == 401:
                raise AuthenticationError()
            elif response.status_code == 403:
                raise AuthorizationError()
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
