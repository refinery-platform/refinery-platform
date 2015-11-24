/*
 * data_set_configurator.js
 *
 * Author: Nils Gehlenborg
 * Created: 2 December 2012
 *
 * This provides a UI and REST API interactions to allow data set owners configure how a data set is presented:
 * order of facets/table column, which attributes are facets, always ignored or initially hidden.
 */


/*
 * Dependencies:
 * - JQuery
 * - JQueryUI
 * - underscore.js
 * - Refinery Solr Utilities
 */


DataSetConfigurator = function( studyUuid, assayUuid, elementId, apiBaseUrl, crsfMiddlewareToken ) {

  	var self = this;

  	// API related properties
  	self.apiEndpoint = "attributeorder";
  	self.apiBaseUrl = apiBaseUrl;
  	self.crsfMiddlewareToken = crsfMiddlewareToken;

  	// data set to configure
  	self.studyUuid = studyUuid;
  	self.assayUuid = assayUuid;

	// parent element for UI
  	self.elementId = elementId;

  	// current state (read/written from/to REST API)
  	self.state = null

};


DataSetConfigurator.prototype.initialize = function( callback ) {
	var self = this;

	self.getState( function() {
		self.render();

		if ( typeof callback !== 'undefined' ) {
			callback();
		}
	 } );

	return null;
};


/*
 * Render the user interface components into element defined by self.elementId.
 */
DataSetConfigurator.prototype.render = function () {
	var self = this;

	$( "#" + self.elementId ).html("");

	var code = "";
	code += "<table id=\"attribute-table\" class=\"table table-striped table-condensed\">";

	code += "<thead>";
	code += "<tr>";

	code += "<th class='attribute-header'>";
	code +=  "";
	code += "</th>";

	code += "<th class='attribute-header'>";
	code +=  "Attribute";
	code += "</th>";

	code += "<th class='attribute-header'>";
	code += "Expose to User";
	code += "</th>";

	code += "<th class='attribute-header'>";
	code += "Use as Facet";
	code += "</th>";

	code += "<th class='attribute-header'>";
	code += "Show by Default";
	code += "</th>";

	code += "</tr>";
	code += "</thead>";

	code += "<tbody>";

	for ( var i = 0; i < self.state.objects.length; ++i ) {
		var object = self.state.objects[i];

		if ( object.is_internal ) {
			continue;
		}

		code += "<tr class=\"\" data-id=\"" + object.id + "\" data-resource_uri=\"" + object.resource_uri + "\" id=\"attributeorder_" + object.id + "\">";

		code += "<td class=\"\">";
		code += "<span class=\"refinery-dnd-handle\">" +
			"<i class=\"fa fa-bars\"></i></span>";
		code += "</td>";

		code += "<td class=\"\">";
		code +=  prettifySolrFieldName( object.solr_field, true );
		code += "</td>";

		code += "<td class=\"\">";
		code += "<label>"
		if ( isRequiredFacet( object.solr_field ) ) {
	  		code += "";
		}
		else {
  			code += "<input id=\"attributeorder_" + object.id + "_exposed\" type=\"checkbox\" value=\"\"" + ( object.is_exposed ? "checked" : "" ) + ">";
		}
		code += "</label>"
		code += "</td>";

		code += "<td class=\"\">";
		code += "<label>"
		if ( isRequiredFacet( object.solr_field ) ) {
	  		code += "";
		}
		else {
  			code += "<input id=\"attributeorder_" + object.id + "_facet\" type=\"checkbox\" value=\"\"" + ( object.is_facet ? "checked" : "" ) + ">";
  		}
		code += "</label>"
		code += "</td>";

		code += "<td class=\"\">";
		code += "<label>"
  		code += "<input id=\"attributeorder_" + object.id + "_active\" type=\"checkbox\" value=\"\"" + ( object.is_active ? "checked" : "" ) + ">";
		code += "</label>"
		code += "</td>";

		code += "</tr>";
	}

	code += "</tbody>";
	code += "</table>";

	$( "#" + self.elementId ).html( code );

	// update database when user selects/deselects checkboxes
	for ( var i = 0; i < self.state.objects.length; ++i ) {
		var id = self.state.objects[i].id;
		var flag;
		var callback = function() { /* TODO: cancel spinner? */ };

		flag = "facet";
		self.makeFlagClickEvent( flag, id, callback );

		flag = "exposed";
		self.makeFlagClickEvent( flag, id, callback );

		flag = "active";
		self.makeFlagClickEvent( flag, id, callback );
	}

	// implement drag and drop
	$("#attribute-table tbody").sortable({
		// inspiration for helper: http://www.foliotek.com/devblog/make-table-rows-sortable-using-jquery-ui-sortable/
    	helper: self.fixHelperModified,
    	// bulk update: https://django-tastypie.readthedocs.org/en/latest/interacting.html#bulk-operations
    	update: function( event, ui ) {
    			var array = $( "#attribute-table tbody" ).sortable( "toArray" );

    			var rank = 1;
    			var ranks = array.map( function(id) {
	    				return { "id": $( "#" + id ).data().id, "rank": rank++, "resource_uri": $( "#" + id ).data().resource_uri };
    				});

    			self.updateState( ranks, function() { alert( "Callback!"); } );
    		}
	}).disableSelection();
};


DataSetConfigurator.prototype.makeFlagClickEvent = function( flag, id, callback ) {
	var self = this;
	$( "#" + "attributeorder_" + id + "_" + flag ).click( function() {
		// get data attributes from parent tr
		var data = $(this).closest('tr').data();
		var flags = { "id": data.id, "resource_uri": data.resource_uri };
		flags["is_" + flag] = $(this).prop( "checked" );
		self.updateState( [ flags ], callback );
	});
}


DataSetConfigurator.prototype.fixHelperModified = function(e, tr) {
    var $originals = tr.children();
    var $helper = tr.clone();
    $helper.children().each(function(index)
    {
      $(this).width($originals.eq(index).width())
    });
    return $helper;
};


DataSetConfigurator.prototype.createUpdateUrl = function() {
	var self = this;

	var url = self.apiBaseUrl + self.apiEndpoint + "/";
	// console.log( url );
	return url;
};



DataSetConfigurator.prototype.updateState = function( state, callback ) {
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

	// console.log( data );

	$.ajax({
     url: self.createUpdateUrl(),
     type: "PATCH",
     data: JSON.stringify( data ),
	 contentType: "application/json",
	 dataType: "application/json",
  	 processData:  false,
     success: function( result ) {
     		// console.log( result );
     		alert( "Patch successful!" );
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	}
    	}
	});
};


DataSetConfigurator.prototype.createGetUrl = function() {
	var self = this;

	var url = self.apiBaseUrl + self.apiEndpoint + "/" +
		"?" + "format=json" +
		"&" + "limit=0" +
		"&" + "study__uuid=" + self.studyUuid +
		"&" + "assay__uuid=" + self.assayUuid;

	// console.log( url );
	return url;
};


DataSetConfigurator.prototype.getState = function( callback ) {
	var self = this;

	$.ajax({
     url: self.createGetUrl(),
     type: "GET",
     dataType: "json",
     data: { csrfmiddlewaretoken: self.crsfMiddlewareToken },
     success: function( result ) {
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	}

	     	self.state = result;

			// callback
			callback( result );
    	}
	});
};
