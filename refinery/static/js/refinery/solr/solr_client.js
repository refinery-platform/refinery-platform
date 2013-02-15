/*
 * solr_client.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * A simple Solr client that retrieves data based on a SolrQuery object. The client
 * provides the Solr instance information (base URL, ports, etc.) whereas the query
 * provides everything else. 
 */


/*
 * Dependencies:
 * - SolrQuery
 */

SOLR_QUERY_INITIALIZED_COMMAND = 'solr_query_initialized';
SOLR_QUERY_UPDATED_COMMAND = 'solr_query_updated';

SolrClient = function( apiBaseUrl, apiEndpoint, crsfMiddlewareToken, baseQuery, baseFilter, commands ) {  	
  	var self = this;

  	// API related properties
  	self._apiBaseUrl = apiBaseUrl;
  	self._apiEndpoint = apiEndpoint;
  	self._crsfMiddlewareToken = crsfMiddlewareToken;
  	
  	self._baseQuery = baseQuery; // e.g. "q=django_ct:data_set_manager.node";
  	self._baseFilter = baseFilter; // e.g. "fq=(study_uuid:<some id> AND assay_uuid:<someotherid> AND ...)"
	self._baseSettings = "wt=json&json.wrf=?";
		
	// wreqr commands
	self._commands = commands;
};	

SolrClient.prototype._createBaseUrl = function( start, rows ) {
	
	var self = this;
	
	var url = self._apiBaseUrl + self._apiEndpoint
		+ "?" + "q=" + self._baseQuery 
		+ "&" + self._baseSettings		
		+ "&" + "start=" + start
		+ "&" + "rows=" + rows
		+ "&" + "fq=" + self._baseFilter;
		
	return url;	
} 


/*
 * Initializes a DataSetSolrQuery: retrieves field names, facets, etc.
 */
SolrClient.prototype.initialize = function ( query, callback ) {
	
	var self = this;	
	var url = self._createBaseUrl( 0, 1 );
		
	$.ajax( { type: "GET", dataType: "jsonp", url: url, success: function(data) {
		
		query.initialize();
		query.setTotalDocumentCount( data.response.numFound );
		
		self._commands.execute( SOLR_QUERY_INITIALIZED_COMMAND );
								
		if ( typeof callback !== 'undefined' ) {						
			callback( query );
		}
	}});
};


/*
 * Executes a DataSetSolrQuery: can be a DATA_SET_FULL_QUERY or a DATA_SET_PIVOT_QUERY or any other combination 
 */
SolrClient.prototype.run = function ( query, queryComponents, start, rows, callback ) {
	
	var self = this;	
	var url = self._createBaseUrl( start, rows ) + query.create( queryComponents );
	
	console.log( url );
	
	$.ajax( { type: "GET", dataType: "jsonp", url: url, success: function(data) {
				
		var response = new SolrResponse();		
		var response = response.initialize( data );
		
		self._commands.execute( SOLR_QUERY_UPDATED_COMMAND, { 'response': response } );

		if ( typeof callback !== 'undefined' ) {				
			callback( response );
		}
	}});		
};



SolrClient.prototype.getTotalDocumentCount = function() {
	
	var self = this;
	
    return ( self._totalDocumentCount ); 
};
