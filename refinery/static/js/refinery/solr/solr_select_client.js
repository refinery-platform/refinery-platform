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


SolrSelectClient = function( apiBaseUrl, apiEndpoint, crsfMiddlewareToken ) {  	
  	var self = this;

  	// API related properties
  	self.apiBaseUrl = apiBaseUrl;
  	self.apiEndpoint = apiEndpoint;
  	self.crsfMiddlewareToken = crsfMiddlewareToken;  
};	


SolrSelectClient.prototype.initialize = function () {
	var self = this;	 
	return null;
};


/*
 * Initializes a DataSetSolrQuery: retrieves field names, facets, etc.
 */
SolrSelectClient.prototype.initializeDataSetQuery = function ( query, configurator, callback ) {
	var self = this;	
	var url = self.apiBaseUrl + self.apiEndpoint + "?" + query.create( 0, 1, DATA_SET_INITIALIZATION_QUERY );
	
	$.ajax( { type: "GET", dataType: "jsonp", url: url, success: function(data) {
				
		query.setTotalNodeCount( data.response.numFound );		
		query.setSelectedNodeCount( data.response.numFound );
		
		var defaultSortFieldFound = false;
		
		for ( var i = 0; i < configurator.state.objects.length; ++i ) {
			var attribute = configurator.state.objects[i];
			
			if ( attribute.is_facet && attribute.is_exposed && !attribute.is_internal ) {
				query.addFacet( attribute.solr_field );
			}											
												
			// fields
			if ( query.isIgnoredField( attribute.solr_field ) ) {
				if ( attribute.is_internal ) {
						query.addField( attribute.solr_field, false, true, "" );					
				}
				else {
					if ( attribute.is_exposed && attribute.is_active ) {
						
						if ( !defaultSortFieldFound ) {
							query.addField( attribute.solr_field, true, false, "asc" );					
							defaultSortFieldFound = true;
						}
						else {
							query.addField( attribute.solr_field, true, false, "" );
						}
					}
					else {
						if ( attribute.is_exposed && !attribute.is_active ) {
							query.addField( attribute.solr_field, false, false, "" );					
						}					
					}
				}					
			}
		}
		
		if ( typeof callback !== 'undefined' ) {			
			callback( query );
		}
		
		return query;
	}});
};


/*
 * Executes a DataSetSolrQuery: can be a DATA_SET_FULL_QUERY or a DATA_SET_PIVOT_QUERY or any other combination 
 */
SolrSelectClient.prototype.executeDataSetQuery = function ( query, queryComponents, start, rows, callback ) {
	var self = this;
	
	var url = self.apiBaseUrl + self.apiEndpoint + "?" + query.create( start, rows, queryComponents );
	
	$.ajax( { type: "GET", dataType: "jsonp", url: url, success: function(data) {
		
		query.setSelectedNodeCount( data.response.numFound );
		
		if ( typeof callback !== 'undefined' ) {			
			query.process( data );
		}
		
		return data;
	}});		
};