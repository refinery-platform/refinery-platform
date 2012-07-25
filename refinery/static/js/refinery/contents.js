// Nils Gehlenborg, July 2012

// start scope
(function() {
// ---------------------------------


var urlComponents = document.location.href.split("/");	
	
var solrRoot = "http://127.0.0.1:8983/solr/data_set_manager/select";
var solrQuery = "q=django_ct:data_set_manager.node";
var solrSettings = "wt=json&json.wrf=?&facet=true";
var testStudyUuid = urlComponents[urlComponents.length-2];
var testAssayUuid = urlComponents[urlComponents.length-3]; 

var testNodeType = "\"Raw Data File\"";

var facets = {};
/*
 * facets = 
 * { "facet_name1": [ { value: "value_name", count: "count", isSelected: true }, ... ] },
 *   "facet_name2": [ { value: "value_name", count: "count", isSelected: false }, ... ] },
 * ... } 
 */

var fields = {};
/*
 * fields = 
 * { "field_name1": { isVisible: true, direction: "asc" },
 *   "field_name2": { isVisible: false, direction: "desc" },
 *   "field_name3": { isVisible: true, direction: "" },
 * ... } 
 * 
 * Notes: 
 * 	- multiple fields can be used for sorting
 *  - direction will be checked for "asc" or "desc", everything else means no sorting
 *  - invisible fields can not be used for sorting (even if direction is given correctly)  
 */

var documents = [];


function buildSolrQuery( studyUuid, assayUuid, nodeType, start, rows, facets, fields, documents ) {
	var url = solrRoot
		+ "?" + solrQuery 
		+ "&" + solrSettings
		+ "&" + "start=" + start
		+ "&" + "rows=" + rows
		+ "&" + "fq="
		+ "("
			+ "study_uuid:" + studyUuid
			+ " AND " + "assay_uuid:" + assayUuid
			+ " AND " + "type:" + nodeType
	   	+ ")";
	  
	  
	// ------------------------------------------------------------------------------
	// selecting facets: facet.field, fq 	
	// ------------------------------------------------------------------------------

	for ( var facet in facets ) {
		var facetValues = facets[facet];
		var filter = null; 
		var filterValues = [];
		
		for ( var facetValue in facetValues ) {
			if ( facetValues.hasOwnProperty( facetValue ) )
			{
				if ( facetValues[facetValue].isSelected ) {
					// escape or encode special characters
					facetValue = facetValue.replace( /\ /g, "\\ " );
					facetValue = facetValue.replace( /\(/g, "\\(" );
					facetValue = facetValue.replace( /\)/g, "\\)" );
					facetValue = facetValue.replace( /\+/g, "%2B" );
					facetValue = facetValue.replace( /\:/g, "%3A" );
					filterValues.push( facetValue );
				}
			}				
		}

		if ( filterValues.length > 0 ) {
			filter = facet.replace( /\ /g, "_" );								
			console.log( filterValues );
			url += "&fq={!tag=" + filter + "}" + facet.replace( /\ /g, "\\ " ) + ":(" + filterValues.join( " OR " ) + ")";													
		}
		
		if ( facets.hasOwnProperty( facet ) )
		{
			if ( filter ) {
				url += "&facet.field={!ex=" + filter + "}" + facet;
			}
			else {
				url += "&facet.field=" + facet;					
			}
			
		}
	}


	// ------------------------------------------------------------------------------
	// selecting fields: fl 
	// ------------------------------------------------------------------------------
	
	var fieldNames = [];
	for ( var field in fields ) {
		if ( fields.hasOwnProperty( field ) )
		{			
			if ( fields[field].isVisible ) {				
				// escape or encode special characters
				field = field.replace( /\ /g, "\\ " );
				field = field.replace( /\(/g, "\\(" );
				field = field.replace( /\)/g, "\\)" );
				field = field.replace( /\+/g, "%2B" );
				field = field.replace( /\:/g, "%3A" );
				fieldNames.push( field );
			}
		}				
	}	
	url += "&fl=" + fieldNames.join( ",");

	
	// ------------------------------------------------------------------------------
	// sorting by field: sort
	// ------------------------------------------------------------------------------
 
	for ( var field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			// only sort on visible fields			
			if ( fields[field].isVisible ) {
				if ( ( fields[field].direction === "asc" ) || ( fields[field].direction === "desc" ) ) {
					var direction = fields[field].direction;  				
					
					// escape or encode special characters
					field = field.replace( /\ /g, "\\ " );
					field = field.replace( /\(/g, "\\(" );
					field = field.replace( /\)/g, "\\)" );
					field = field.replace( /\+/g, "%2B" );
					field = field.replace( /\:/g, "%3A" );
					
					url += "&sort=" + field + " " + direction;
					// only use the first field that has sorting information
					break;
				}				
			}
		}				
	}	
	
	
	$( "#url-view" ).html( "" );
	$( "<a/>", { href: url + "&indent=on", html: "Solr Query" } ).appendTo( "#url-view" );

	return ( url );
}

function prettifyFieldName( name, isTitle )
{	
	isTitle = isTitle || false;
	
	var position = name.indexOf( "_Characteristics_s" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}	

	var position = name.indexOf( "_Factor_s" );
	if ( position != -1 ) {
		name.substr( 0, position );
	}
	

	var position = name.indexOf( "_Comment_s" );
	if ( position != -1 ) {
		name.substr( 0, position );
	}

	name = name.replace( /\_/g, " " );
	
	if ( isTitle )
	{
		name = name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	return name;	
}

function initializeData( studyUuid, assayUuid, nodeType ) {
	$.ajax( { type: "GET", dataType: "jsonp", url: buildSolrQuery( studyUuid, assayUuid, nodeType, 0, 1, {}, {}, {} ), success: function(data) {
		console.log( data );
		
		var doc = data.response.docs[0];		
	
		for ( var attribute in doc ) {
			if ( doc.hasOwnProperty( attribute ) ) {
				// facets
				if ( attribute.indexOf( "Characteristics_s" ) != -1 ) {
					facets[attribute] = [];
				}
				if ( attribute.indexOf( "Factor_s" ) != -1 ) {
					facets[attribute] = [];
				}
				/*
				if ( attribute.indexOf( "Comment_s" ) != -1 ) {
					facets[attribute] = [];
				}
				*/
				
				// fields
				fields[attribute] = { isVisible: true, direction: "" };
			}		
		}
		
		getData( studyUuid, assayUuid, nodeType )				
	} });	
}

function getData( studyUuid, assayUuid, nodeType ) {
	$.ajax( { type: "GET", dataType: "jsonp", url: buildSolrQuery( studyUuid, assayUuid, nodeType, 0, 25, facets, fields, {} ), success: function(data) {
		processFacets( data );
		processFields( data );
		processDocs( data );
	}});	
}


function composeFieldNameId( fieldName ) {
	return ( "fieldname" + "___" + fieldName );
}

function decomposeFieldNameId( fieldNameId ) {
	return ( { fieldName: fieldNameId.split( "___" )[1] } );
}


function composeFacetValueId( facet, facetValue ) {
	return ( "facetvalue" + "___" + facet + "___" + facetValue );
}

function decomposeFacetValueId( facetValueId ) {
	return ( { facet: facetValueId.split( "___" )[1], facetValue: facetValueId.split( "___" )[2] } );
}

function composeFacetId( facet ) {
	return ( "facet" + "___" + facet );
}

function decomposeFacetId( facetId ) {
	return ( { facet: facetId.split( "___" )[1] } );
}


function processFacets( data ) {
	$( "#facet-view" ).html("");

	for ( var facet in data.facet_counts.facet_fields ) {
		if ( data.facet_counts.facet_fields.hasOwnProperty( facet ) ) {
			var unselectedItems = [];
			var selectedItems = [];

			for ( var j = 0; j < data.facet_counts.facet_fields[facet].length; j += 2 ) {
				var facetValue = data.facet_counts.facet_fields[facet][j];
				var facetValueCount = data.facet_counts.facet_fields[facet][j+1];
				
				if ( ( facetValue === "" ) || ( facetValue === undefined ) ) {
					facetValue = "undefined";
				}
				
				if ( facets[facet][facetValue] ) {
					facets[facet][facetValue] = { count: facetValueCount, isSelected: facets[facet][facetValue].isSelected };					
				}
				else {
					facets[facet][facetValue] = { count: facetValueCount, isSelected: false };					
				}
				
				if ( facets[facet][facetValue].isSelected ) {
		    		//selectedItems.push("<li class=\"facet-value\">" + "<span class=\"badge badge-info\" id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "&nbsp;<i class=\"icon-remove\"/>" + "</span>" +"</li>");
		    		selectedItems.push("<span class=\"facet-value badge badge-info\" id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "&nbsp;<i class=\"icon-remove\"/>" + "</span>");					
				}
				else {
	    			unselectedItems.push("<li class=\"facet-value\">" + "<span id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "</span>" + "</li>");					
				}
				
								
			}
			
			$('<div/>', { 'class': 'facet-title', 'id': composeFacetId( facet ), html: "<h3>" + prettifyFieldName( facet, true ) + "</h3>" }).appendTo('#facet-view');
			$('<div/>', { 'class': 'facet-active', html: selectedItems.join(' ') }).appendTo( "#" + composeFacetId( facet ) );
			$('<ul/>', { 'class': 'facet-value-list', html: unselectedItems.join('') }).appendTo('#facet-view');
			
		}		
    }
   	
   	$(".facet-value").click( function() {
   		var facetValueId = event.target.id;
   		var facet = decomposeFacetValueId( facetValueId ).facet;
   		var facetValue = decomposeFacetValueId( facetValueId ).facetValue;
   	   		
   		facets[facet][facetValue].isSelected = !facets[facet][facetValue].isSelected;   		
   		getData( testAssayUuid, testStudyUuid, testNodeType );
   	} );				
}


function processFields() {
	var items = []
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible ) {
				items.push("<span class=\"field-name\" id=\"" + composeFieldNameId( field ) + "\">" + "<i class=\"icon-minus-sign\"/>&nbsp;" + prettifyFieldName( field ) + "</span>" );				
			}
			else {
				items.push("<span class=\"field-name\" id=\"" + composeFieldNameId( field ) + "\">" + "<i class=\"icon-plus-sign\"/>&nbsp;" + prettifyFieldName( field ) + "</span>" );								
			}
		}
	}

	$("#field-view").html("" );
	$('<p/>', { 'class': 'field-name-list', html: items.join(' | ') }).appendTo('#field-view');
	
   	$("#field-view").children().click( function() {
   		var fieldNameId = event.target.id;
   		var fieldName = decomposeFieldNameId( fieldNameId ).fieldName;
   	   		
   		fields[fieldName].isVisible = !fields[fieldName].isVisible;   		
   		getData( testAssayUuid, testStudyUuid, testNodeType );
   	} );				
	
}


function processDocs( data ) {
	items = []
	documents = []
	for ( var i = 0; i < data.response.docs.length; ++i ) {
		documents.push( data.response.docs[i] );
		
		var document = documents[i];
		var s = "<tr>";
		for ( entry in document )
		{
			if ( document.hasOwnProperty( entry ) )
			{
				s += "<td>";
				s += document[entry];
				s += "</td>";				
			}
		}
		s += "</tr>";
		items.push( s );
    }	
    
    $( "#statistics-view" ).html("");
    $( "<h1/>", { html: data.response.numFound } ).appendTo( "#statistics-view" );
    $( "#table-view" ).html("");
	$('<table/>', { 'class': "table table-striped table-condensed table-bordered", html: "<tbody>" + items.join('\n') + "</tbody>" }).appendTo('#table-view');		
}



initializeData( testAssayUuid, testStudyUuid, testNodeType );

// ---------------------------------
})();
// end scope  


