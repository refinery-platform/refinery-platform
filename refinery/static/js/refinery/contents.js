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

	var fieldNames = [];
	for ( var field in fields ) {
		if ( fields.hasOwnProperty( field ) )
		{			
			if ( fields[field].isVisible ) {				
				var fieldName = fields[field];
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
	
	$( "#url-view" ).html( "" );
	$( "<a/>", { href: url + "&indent=on", html: "Solr Query" } ).appendTo( "#url-view" );

	return ( url );
}

function prettifyFieldName( name )
{
	var position = name.indexOf( "_Characteristics_s" );
	if ( position != -1 ) {
		return name.substr( 0, position );
	}	

	var position = name.indexOf( "_Factor_s" );
	if ( position != -1 ) {
		return name.substr( 0, position );
	}
	
	return name;	

	/*
	var position = name.indexOf( "_Comment_s" );
	if ( position != -1 ) {
		return name.substr( 0, position );
	}
	*/	

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
		    		selectedItems.push("<li class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "&nbsp;<i class=\"icon-remove\"/>" + "</li>");					
				}
				else {
	    			unselectedItems.push("<li class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "</li>");					
				}
				
								
			}
			
			$('<h3/>', { 'class': 'facet-title', html: prettifyFieldName( facet ) }).appendTo('#facet-view');
			$('<ul/>', { 'class': 'facet-value-list', html: selectedItems.join('') + "" + unselectedItems.join('') }).appendTo('#facet-view');
			
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
	var visibleItems = []
	var invisibleItems = []
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible ) {
				visibleItems.push("<span class=\"field-name\" id=\"" + composeFieldNameId( field ) + "\">" + "<i class=\"icon-minus-sign\"/>&nbsp;" + prettifyFieldName( field ) + "</span>" );				
			}
			else {
				invisibleItems.push("<span class=\"field-name\" id=\"" + composeFieldNameId( field ) + "\">" + "<i class=\"icon-plus-sign\"/>&nbsp;" + prettifyFieldName( field ) + "</span>" );								
			}
		}
	}

	$("#field-view").html("" );
	$('<p/>', { 'class': 'field-name-list', html: visibleItems.join(' / ') + "<br>" + invisibleItems.join(' / ') }).appendTo('#field-view');
	
   	$(".field-name").click( function() {
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


