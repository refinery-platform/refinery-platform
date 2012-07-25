// Nils Gehlenborg, July 2012

// start scope
(function() {
// ---------------------------------
// TESTING RPARK

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
 * { "facet_name1": [ { value: "value_name", count: "count", selected: true }, ... ] },
 *   "facet_name2": [ { value: "value_name", count: "count", selected: false }, ... ] },
 * ... } 
 */
var documents = [];


function buildSolrQuery( studyUuid, assayUuid, nodeType, start, rows, facets, files ) {
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
					if ( facetValues[facetValue].selected ) {
						filterValues.push( facetValue.replace( /\ /g, "\\ " ) );
					}
				}				
			}

			// make or statement
			filter = facet.replace( /\ /g, "_" );

			if ( filterValues.length > 0 ) {
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
	
	console.log( url );
	return ( url );
}

function prettifyFacetName( name )
{
	var position = name.indexOf( "_Characteristics_s" );
	if ( position != -1 ) {
		return name.substr( 0, position );
	}	

	var position = name.indexOf( "_Factor_s" );
	if ( position != -1 ) {
		return name.substr( 0, position );
	}	

	/*
	var position = name.indexOf( "_Comment_s" );
	if ( position != -1 ) {
		return name.substr( 0, position );
	}
	*/	

}

function initializeData( studyUuid, assayUuid, nodeType ) {
	$.ajax( { type: "GET", dataType: "jsonp", url: buildSolrQuery( studyUuid, assayUuid, nodeType, 0, 1, {}, {} ), success: function(data) {
		console.log( data );
		
		var doc = data.response.docs[0];		
	
		for ( var attribute in doc ) {
			if ( doc.hasOwnProperty( attribute ) ) {
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
			}		
		}
		
		getData( studyUuid, assayUuid, nodeType )				
	} });	
}

function getData( studyUuid, assayUuid, nodeType ) {
	$.ajax( { type: "GET", dataType: "jsonp", url: buildSolrQuery( studyUuid, assayUuid, nodeType, 0, 25, facets, {} ), success: function(data) {
		processFacets( data );
		processDocs( data );
	}});	
}


function composeFacetValueId( facet, facetValue ) {
	return ( facet + "___" + facetValue );
}

function decomposeFacetValueId( facetValueId ) {
	return ( { facet: facetValueId.split( "___" )[0], facetValue: facetValueId.split( "___" )[1] } );
}

function processFacets( data ) {
	$( "#facet-view" ).html("");

	for ( var facet in data.facet_counts.facet_fields ) {
		if ( data.facet_counts.facet_fields.hasOwnProperty( facet ) ) {
			items = [];

			for ( var j = 0; j < data.facet_counts.facet_fields[facet].length; j += 2 ) {
				var facetValue = data.facet_counts.facet_fields[facet][j];
				var facetValueCount = data.facet_counts.facet_fields[facet][j+1];
				
				if ( ( facetValue === "" ) || ( facetValue === undefined ) ) {
					facetValue = "undefined";
				}
				
				if ( facets[facet][facetValue] ) {
					facets[facet][facetValue] = { count: facetValueCount, selected: facets[facet][facetValue].selected };					
				}
				else {
					facets[facet][facetValue] = { count: facetValueCount, selected: false };					
				}
				
				if ( facets[facet][facetValue].selected ) {
		    		items.push("<li class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "&nbsp;<i class=\"icon-remove\"/>" + "</li>");					
				}
				else {
	    			items.push("<li class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\">" + facetValue + " (" + facetValueCount + ")"  + "</li>");					
				}
				
								
			}
			
			$('<h3/>', { 'class': 'facet-title', html: prettifyFacetName( facet ) }).appendTo('#facet-view');
			$('<ul/>', { 'class': 'facet-value-list', html: items.join('') }).appendTo('#facet-view');
			
		}		
    }
   	
   	$(".facet-value").click( function() {
   		var facetValueId = event.target.id;
   		var facet = decomposeFacetValueId( facetValueId ).facet;
   		var facetValue = decomposeFacetValueId( facetValueId ).facetValue;
   	   		
   		facets[facet][facetValue].selected = !facets[facet][facetValue].selected;   		
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


