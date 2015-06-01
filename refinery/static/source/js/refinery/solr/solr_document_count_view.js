/*
 * solr_document_count_view.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 17 February 2013
 *
 * A viewer that operates on a SolrQuery and shows the number of selected documents. 
 */


/*
 * Dependencies:
 * - JQuery
 * - SolrQuery
 */


SolrDocumentCountView = function( parentElementId, idPrefix, solrQuery, commands ) {
  	
  	var self = this;
	
	// parent element for UI 
  	self._parentElementId = parentElementId;
  	
  	// id prefix for all DOM elements to create unique element ids
  	self._idPrefix = idPrefix;
  	
  	// Solr interaction 
  	self._query = solrQuery;
  	
  	// wreqr commands
  	self._commands = commands;
};	
	
	
SolrDocumentCountView.prototype.initialize = function() {
	var self = this;

	return this;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
SolrDocumentCountView.prototype.render = function ( solrResponse ) {
	var self = this;
	
	// clear parent element
	$( "#" + self._parentElementId ).html("");
	
	$( "#" + self._parentElementId ).append(
		'<b>' + self._query.getCurrentDocumentCount() + '</b>' +
		' of ' +
		'<b>' + self._query.getTotalDocumentCount() + '</b>' +
		' files selected' );
   		
	// attach event listeners
	// ..
};