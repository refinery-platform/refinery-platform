/*
 * data_set_solr_table.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * A table viewer that operates on a DataSetSolrQuery. 
 */


/*
 * Dependencies:
 * - JQuery
 * - DataSetSolrQuery
 * - SolrSelectClient
 */


DataSetSolrTable = function( parentElementId, idPrefix, solrQuery, solrClient, configurator ) {
  	
  	var self = this;
	
	// parent element for UI 
  	self.parentElementId = parentElementId;
  	
  	// id prefix for all DOM elements to create unique element ids
  	self.idPrefix = idPrefix;
  	
  	// Solr interaction 
  	self.solrQuery = solrQuery;
  	self.solrClient = solrClient;
  	
  	// data set configuration
  	self.configurator = configurator;  	
};	
	
	
DataSetSolrTable.prototype.initialize = function( callback ) {
	var self = this;

	solrClient.initializeDataSetQuery( self.solrQuery, self.configurator, function(query) {
		console.log( query );
		solrClient.executeDataSetQuery( query, DATA_SET_FULL_QUERY, 0, 10, function( data ) {
			console.log( data );
			var serializedQuery = query.serialize( DATA_SET_QUERY_NODE_SET_SERIALIZATION ); 
			console.log( serializedQuery ); 
			console.log( query.deserialize( serializedQuery ) ); 
		});
	});		

	return null;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
DataSetSolrTable.prototype.render = function () {
	var self = this;

	// clear parent element
	$( "#" + self.parentElementId ).html("");
	
	var code = "";

	$( "#" + self.elementId ).html( code );		
	
	// attach event listeners
	// ..
};