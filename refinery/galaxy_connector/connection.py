'''
Created on Jan 5, 2012

@author: nils
'''

import urllib2
import simplejson


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
        except simplejson.decoder.JSONDecodeError, e:
            return simplejson.loads( "{}" )
                    
    def histories( self ):            
        return self.get( "histories" )
            
    def history( self, history_id ):            
        return self.get( "histories" + "/" + history_id )

    def history_contents( self, history_id ):            
        return self.get( "histories" + "/" + history_id + "/" + "contents" )

    def history_content( self, history_id, content_id ):            
        return self.get( "histories" + "/" + history_id + "/" + "contents" + "/" + content_id )

    def workflows( self ):            
        return self.get( "workflows" )

    def workflow( self, id ):            
        return self.get( "workflow" + "/" + id )

