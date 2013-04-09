/*
 * analysis_api_client.js
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


AnalysisApiClient = function( dataSetUuid, elementId, apiBaseUrl, crsfMiddlewareToken ) {
  	
  	var self = this;

  	// API related properties
  	self.apiEndpointList = "analysis";
  	self.apiBaseUrl = apiBaseUrl;
  	self.crsfMiddlewareToken = crsfMiddlewareToken;  
  	
  	// data set to configure
  	self.dataSetUuid = dataSetUuid;

	// parent element for UI 
  	self.elementId = elementId;
  	
  	// current list
  	self.list = null  	
  	
  	// callbacks
  	self.changeAnalysisCallback = null  	  	
};	


AnalysisApiClient.prototype.setChangeAnalysisCallback = function ( callback ) {
	var self = this;
	
	self.changeAnalysisCallback = callback;
};


AnalysisApiClient.prototype.initialize = function () {
	var self = this;
	
	self.getList( function() { self.renderList(); }, function() { /* do nothing in case of error */ } );
	 
	return null;	
};
	
	


/*
 * Render the user interface components into element defined by self.elementId.
 */
AnalysisApiClient.prototype.renderList = function () {
	var self = this;

	// to get the bubble arrow back see here: http://www.eichefam.net/?p=4395  
	var analysisListElementStyle = "max-height: 300px; overflow: hidden; overflow-y: auto;"
	var analysisListElementId = "analysis-list";

	$( "#" + self.elementId ).html("");
	
	var code = ""; 

	code += '<div class="btn-group">';
    
    if (  self.list.objects.length > 0 ) {	
  		code += '<a class="btn btn-warning dropdown-toggle" id="show-analyses-button" data-toggle="dropdown" href="#">';    	
    }
    else {
  		code += '<a class="btn btn-warning disabled dropdown-toggle" id="show-analyses-button" data-toggle="dropdown" href="#">';    	    	
    }
    
    code += 'Select&nbsp;';
    code += '<span class="caret"></span>';
  	code += '</a>';
  	code += '<ul id="' + analysisListElementId + '" class="dropdown-menu" style="' +  analysisListElementStyle + '">';
	
	for ( var i = 0; i < self.list.objects.length; ++i ) {
		var object = self.list.objects[i];
		
		code += '<li><a id="' + object.uuid + '" data-uuid="' + object.uuid + '" data-resource-uri="' + object.resource_uri + '">';
		code += object.name + ' (' + object.node_count + ')';								
		code += "</a></li>";
	}	

	code += '</ul>'
	code += '</div>'		
	
	$( "#" + self.elementId ).html( code );		
	
	$( "#" + analysisListElementId ).children().click( function(event) {
   		var analysisUuid = $( "#" + event.target.id ).data().uuid;
   		alert( "selected " + analysisUuid )   		   		
   		//self.getDetail( analysisUuid, self.loadSelectionCallback )   		   		
   	} );   	
};


AnalysisApiClient.prototype.makeClickEvent = function( uuid, callback ) {
	var self = this; 
	$( "#" + uuid ).click( function() { 
		console.log( event );
		callback();
	});
};


AnalysisApiClient.prototype.createGetListUrl = function() {
	var self = this;
		
	var url = self.apiBaseUrl + self.apiEndpointList +
		"?" + "format=json" +
		"&" + "limit=0" +
		"&" + "order_by=creation_date" +
		"&" + "data_set__uuid=" + self.dataSetUuid;
		
	return url;		
};


AnalysisApiClient.prototype.getList = function( callback, errorCallback ) {
	var self = this;

	$.ajax({
     url: self.createGetListUrl(),
     type: "GET",
     dataType: "json",
     data: { csrfmiddlewaretoken: self.crsfMiddlewareToken },
     success: function( result ) {     	
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	} 
	     	
	     	self.list = result;    	     	     	
			// callback
			callback( result );										
    	},
    error: function ( result ) {
    		if ( errorCallback ) {
				errorCallback( result );    			
    		}
    	}
	});
};