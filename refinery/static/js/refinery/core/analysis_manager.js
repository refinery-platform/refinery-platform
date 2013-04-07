/*
 * analysis_manager.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 6 April 2013
 * 
 * This provides a UI and REST API interactions to allow users to work with analysis objects associated with a data set.
 */


/*
 * Dependencies:
 * - JQuery
 * - JQueryUI
 * - underscore.js
 * - Refinery Solr Utilities
 */


AnalysisManager = function( dataSetUuid, elementId, apiBaseUrl, crsfMiddlewareToken ) {
  	
  	var self = this;

  	// API related properties
  	self.apiEndpoint = "analysis";
  	self.apiBaseUrl = apiBaseUrl;
  	self.crsfMiddlewareToken = crsfMiddlewareToken;  
  	
  	// data set to configure
  	self.dataSetUuid = dataSetUuid;

	// parent element for UI 
  	self.elementId = elementId;
  	
  	// current list
  	self.list = null  	  	  	
};	


AnalysisManager.prototype.initialize = function () {
	var self = this;
	
	self.getList( function() { self.renderList(); }, function() { /* do nothing in case of error */ } );
	 
	return null;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
AnalysisManager.prototype.renderList = function () {
	var self = this;  		
};


AnalysisManager.prototype.makeClickEvent = function( uuid, callback ) {
	var self = this; 
	$( "#" + uuid ).click( function() { 
		console.log( event );
		callback();
	});
};
