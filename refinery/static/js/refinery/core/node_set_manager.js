/*
 * node_set_manager.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 25 January 2013
 * 
 * This provides a UI and REST API interactions to allow users to create, edit and delete node sets
 * (representing a subset of files/samples/etc.) associated with a data set.
 */


/*
 * Dependencies:
 * - JQuery
 * - JQueryUI
 * - underscore.js
 * - Refinery Solr Utilities
 */


NodeSetManager = function( studyUuid, assayUuid, elementId, apiBaseUrl, crsfMiddlewareToken ) {
  	
  	var self = this;

  	// API related properties
  	self.apiEndpoint = "nodeset";
  	self.apiEndpointList = "nodesetlist";
  	self.apiBaseUrl = apiBaseUrl;
  	self.crsfMiddlewareToken = crsfMiddlewareToken;  
  	
  	// data set to configure
  	self.studyUuid = studyUuid;
  	self.assayUuid = assayUuid;

	// parent element for UI 
  	self.elementId = elementId;
  	
  	// current list
  	self.list = null  	
  	
  	
  	self.loadSelectionCallback = null;
  	self.saveSelectionCallback = null;
};	


NodeSetManager.prototype.setLoadSelectionCallback = function ( callback ) {
	var self = this;
	
	self.loadSelectionCallback = callback;
};

NodeSetManager.prototype.setSaveSelectionCallback = function ( callback ) {
	var self = this;
	
	self.saveSelectionCallback = callback;
};

NodeSetManager.prototype.initialize = function () {
	var self = this;
	
	self.getList( function() { self.renderList(); } );
	 
	return null;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
NodeSetManager.prototype.renderList = function () {
	var self = this;

	// to get the bubble arrow back see here: http://www.eichefam.net/?p=4395  
	var nodeSetListElementStyle = "max-height: 300px; overflow: hidden; overflow-y: auto;"
	var nodeSetListElementId = "node-set-list";
	var nodeSetSaveSelectionButtonElementId = "node-set-save-button";

	$( "#" + self.elementId ).html("");
	
	var code = ""; 

	code += '<div class="btn-group">'
  	code += '<a id="' + nodeSetSaveSelectionButtonElementId + '"class="btn btn-warning" href="#">'
    code += 'Save'
    code += '</a>'
  	code += '<a class="btn btn-warning dropdown-toggle" id="show-node-sets-button" data-toggle="dropdown" href="#">'
    code += 'Load&nbsp;'
    code += '<span class="caret"></span>'
  	code += '</a>'
  	code += '<ul id="' + nodeSetListElementId + '" class="dropdown-menu" style="' +  nodeSetListElementStyle + '">'
	
	for ( var i = 0; i < self.list.objects.length; ++i ) {
		var object = self.list.objects[i];
		
		code += '<li><a id="' + object.uuid + '" data-uuid="' + object.uuid + '" data-resource-uri="' + object.resource_uri + '">';
		code += object.name + ' (' + object.node_count + ')';								
		code += "</a></li>";
	}	

	code += '</ul>'
	code += '</div>'		
	
	$( "#" + self.elementId ).html( code );		
	
	$( "#" + nodeSetListElementId ).children().click( function(event) {
   		var nodeSetUuid = $( "#" + event.target.id ).data().uuid;   		   		
   		self.getDetail( nodeSetUuid, self.loadSelectionCallback )   		   		
   	} );
   	
	$( "#" + nodeSetSaveSelectionButtonElementId ).click( function(event) {   		   		
   		self.saveSelectionCallback();   		
   	} );   		
};


NodeSetManager.prototype.makeClickEvent = function( uuid, callback ) {
	var self = this; 
	$( "#" + uuid ).click( function() { 
		console.log( event );
		callback();
	});
};



NodeSetManager.prototype.createUpdateUrl = function() {
	var self = this;
		
	var url = self.apiBaseUrl + self.apiEndpoint + "/";		
	console.log( url );
	return url;		
};



NodeSetManager.prototype.updateState = function( state, callback ) {
	var self = this;

	// --- START: set correct CSRF token via cookie ---
	// https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/#ajax
	function getCookie(name) {
	    var cookieValue = null;
	    if (document.cookie && document.cookie != '') {
	        var cookies = document.cookie.split(';');
	        for (var i = 0; i < cookies.length; i++) {
	            var cookie = jQuery.trim(cookies[i]);
	            // Does this cookie string begin with the name we want?
	            if (cookie.substring(0, name.length + 1) == (name + '=')) {
	                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
	                break;
	            }
	        }
	    }
	    return cookieValue;
	}
	var csrftoken = getCookie('csrftoken');
	
	function csrfSafeMethod(method) {
    	// these HTTP methods do not require CSRF protection
	    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	}
	
	$.ajaxSetup({
	    crossDomain: false, // obviates need for sameOrigin test
	    beforeSend: function(xhr, settings) {
	        if (!csrfSafeMethod(settings.type)) {
	            xhr.setRequestHeader("X-CSRFToken", csrftoken);
	        }
	    }
	});
	// --- END: set correct CSRF token via cookie ---


	var data = { "objects": state };
	
	console.log( data );
	
	$.ajax({
     url: self.createUpdateUrl(),
     type: "PATCH",
     data: JSON.stringify( data ),
	 contentType: "application/json",
	 dataType: "json",
  	 processData:  false,     
     success: function( result ) {
     		console.log( result );
     		alert( "Patch successful!" );     	
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	} 
    	}
	});
};


NodeSetManager.prototype.createGetListUrl = function() {
	var self = this;
		
	var url = self.apiBaseUrl + self.apiEndpointList +
		"?" + "format=json" +
		"&" + "limit=0" +
		"&" + "order_by=name" +
		"&" + "study__uuid=" + self.studyUuid +
		"&" + "assay__uuid=" + self.assayUuid;
		
	console.log( url );
	return url;		
};


NodeSetManager.prototype.getList = function( callback ) {
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
    	}
	});
};

NodeSetManager.prototype.createGetDetailUrl = function( uuid ) {
	var self = this;
		
	var url = self.apiBaseUrl + self.apiEndpoint + "/" + uuid + "/"
		"?" + "format=json";
		
	console.log( url );
	return url;		
};


NodeSetManager.prototype.getDetail = function( uuid, callback ) {
	var self = this;

	$.ajax({
     url: self.createGetDetailUrl( uuid ),
     type: "GET",
     dataType: "json",
     data: { csrfmiddlewaretoken: self.crsfMiddlewareToken },
     success: function( result ) {     	
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	} 
	     	
	     	self.detail = result;    	
     	     	
			// callback
			self.loadSelectionCallback( result );										
    	}
	});
};


NodeSetManager.prototype.createPostUrl = function() {
	var self = this;		
	var url = self.apiBaseUrl + self.apiEndpoint + "/";
		
	return url;		
};


NodeSetManager.prototype.postState = function( name, summary, solr_query, solr_query_components, node_count, callback ) {
	var self = this;

	// --- START: set correct CSRF token via cookie ---
	// https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/#ajax
	function getCookie(name) {
	    var cookieValue = null;
	    if (document.cookie && document.cookie != '') {
	        var cookies = document.cookie.split(';');
	        for (var i = 0; i < cookies.length; i++) {
	            var cookie = jQuery.trim(cookies[i]);
	            // Does this cookie string begin with the name we want?
	            if (cookie.substring(0, name.length + 1) == (name + '=')) {
	                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
	                break;
	            }
	        }
	    }
	    return cookieValue;
	}
	var csrftoken = getCookie('csrftoken');
	
	function csrfSafeMethod(method) {
    	// these HTTP methods do not require CSRF protection
	    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	}
	
	$.ajaxSetup({
	    crossDomain: false, // obviates need for sameOrigin test
	    beforeSend: function(xhr, settings) {
	        if (!csrfSafeMethod(settings.type)) {
	            xhr.setRequestHeader("X-CSRFToken", csrftoken);
	        }
	    }
	});
	// --- END: set correct CSRF token via cookie ---

	
	var data = {
		"study": "/api/v1/study/" + self.studyUuid + "/",
		"assay": "/api/v1/assay/" + self.assayUuid + "/",
		"name": name,
		"summary": summary,
		"node_count": node_count,
		"solr_query": solr_query,
		"solr_query_components": solr_query_components,
		"uuid": null
		};
	
	console.log( data );
	
	$.ajax({
     url: self.createPostUrl(),
     type: "POST",
     data: JSON.stringify( data ),
	 contentType: "application/json",
	 dataType: "json",
  	 processData: false,     
     success: function( result, status, jqXHR ) {
     		console.log( jqXHR.getResponseHeader( "Location" ) );
     		callback();
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	}	     		     	 
    	}
	});
};