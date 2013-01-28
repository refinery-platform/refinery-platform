// Nils Gehlenborg, July 2012
// start scope
(function() {
// ---------------------------------

var MAX_DOWNLOAD_FILES = 20;
var MESSAGE_DOWNLOAD_UNAVAILABE = "You have to be logged in<br> and selected " + MAX_DOWNLOAD_FILES + " files or less<br>to create an archive for download.";
var MESSAGE_DOWNLOAD_AVAILABLE = "Click to create<br>archive for download<br>of selected files.";

var urlComponents = document.location.href.split("/");	
	
var allowAnnotationDownload = false;

var solrRoot = "http://" + REFINERY_BASE_URL + "/solr/";
var solrSelectUrl = solrRoot + "data_set_manager/select/";
var solrIgvUrl = solrRoot + "igv/";

var solrQuery = "q=django_ct:data_set_manager.node";
var solrSettings = "wt=json&json.wrf=?&facet=true";

var itemsPerPageOptions = [10,20,50,100]; 
var currentItemsPerPage = itemsPerPageOptions[0];

var query = { total_items: 0, selected_items: 0, items_per_page: currentItemsPerPage, page: 0 };

var currentCount = 0;

var currentStudyUuid = externalStudyUuid; //urlComponents[urlComponents.length-2];
var currentAssayUuid = externalAssayUuid; //urlComponents[urlComponents.length-3]; 
var currentNodeType = "\"Raw Data File\"";


$(document).ready(function() {		
	configurator = new DataSetConfigurator( externalAssayUuid, externalStudyUuid, "configurator-panel", REFINERY_API_BASE_URL, "{{ csrf_token }}" );
	configurator.initialize()

	nodeSetManager = new NodeSetManager( externalAssayUuid, externalStudyUuid, "node-set-manager-controls", REFINERY_API_BASE_URL, "{{ csrf_token }}" );
	nodeSetManager.initialize()
	
	nodeSetManager.setLoadSelectionCallback( function( nodeSet ) {
		// reset current node selection
		nodeSelection = [];
		nodeSelectionBlacklistMode = false;
		
		// iterate over nodes in node set and extract node uuids for resource uris		
		for ( var i = 0; i < nodeSet.nodes.length; ++i ) {
			var nodeResourceUri = nodeSet.nodes[i];			
			
			var uriComponents = nodeResourceUri.split( "/" )
			
			nodeSelection.push( uriComponents[uriComponents.length-2] );
		}			
		
		getData( currentAssayUuid, currentStudyUuid, currentNodeType );				
	});
	
	nodeSetManager.setSaveSelectionCallback( function() {
		getField( currentAssayUuid, currentStudyUuid, currentNodeType, "uuid", function( uuids ) {
			nodeSetManager.postState( "" + Date(), "Summary for Node Set", uuids, function(){
				alert( "Node Set Created! Refresh node set list!!!" );
			});
		});		
	});

	configurator.getState( function() {
		initializeDataWithState( currentAssayUuid, currentStudyUuid, currentNodeType );	
	});
});    		

var showAnnotation = false;

var ignoredFieldNames = [ "django_ct", "django_id", "id" ];
var hiddenFieldNames = [ "uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ]; // TODO: make these regexes
var invisibleFieldNames = [];


var facets = {};
/*
 * facets = 
 * { "facet_name1": { "value_name": { count: "count", isSelected: true }, ...  },
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

// a list of facet names for the pivot view
var pivots = [];
var pivotMatrixData;

var documents = [];

// fine-grained selection on top of the facet selection
// a list of node uuids
var nodeSelection = [];
// if true, the nodeSelection list is to be subtracted from the Solr query results (blacklist)
// if false, the nodeSelection list is to be used instead of the Solr query results (whitelist)
var nodeSelectionBlacklistMode = true;


$(".collapse").collapse("show");

$(".annotation-buttons button").click(function () {
    if ( $(this).attr("id") == "annotation-button" ) {
    	showAnnotation = true;
    }
    else {
    	showAnnotation = false;
    }    

	initializeDataWithState( currentAssayUuid, currentStudyUuid, currentNodeType );
});	


function buildPivotQuery( studyUuid, assayUuid, nodeType, loadAnnotation ) {
	var url = solrSelectUrl
		+ "?" + solrQuery 
		+ "&" + solrSettings
		+ "&" + "start=" + 0
		+ "&" + "rows=" + 1
		+ "&" + "fq="
		+ "("
			+ "study_uuid:" + studyUuid
			+ " AND " + "assay_uuid:" + assayUuid
			+ " AND " + "is_annotation:" + loadAnnotation			
			+ " AND " + "(" + "type:" + nodeType + " OR " + "type: \"Derived Data File\"" + " OR " + "type: \"Array Data File\"" + " OR " + "type: \"Derived Array Data File\"" + ")"
	   	+ ")"
	   	+ "&" + "facet.sort=count" // sort by count, change to "index" to sort by index	   	
	   	+ "&" + "facet.limit=-1"; // unlimited number of facet values (otherwise some values will be missing)	   	


	// ------------------------------------------------------------------------------
	// pivot fields: facet.pivot 
	// ------------------------------------------------------------------------------
	if ( pivots.length > 1 ) {
		var pivotQuery = pivots.join( "," );

		if ( pivotQuery.length > 0 ) {
			url += "&facet.pivot=" + pivotQuery;
		}		
	}		
	
	return ( url );	
}
	
function buildSolrQueryFacetFields( fields ) {
	
	var url = "";
	
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
					facetValue = facetValue.replace( /\//g, "\\/" );
					facetValue = facetValue.replace( /\,/g, "\\," );									
					facetValue = facetValue.replace( /\#/g, "%23" );
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
	
	return url;
}


function buildSolrQueryFieldList( fields ) {
	
	var url = "";
	
	// ------------------------------------------------------------------------------
	// selecting fields: fl 
	// ------------------------------------------------------------------------------
	
	var fieldNames = [];
	for ( var field in fields ) {
		if ( fields.hasOwnProperty( field ) )
		{			
			if ( ( fields[field].isVisible ) || ( hiddenFieldNames.indexOf( field ) >= 0 ) ) {				
				// escape or encode special characters
				field = field.replace( /\ /g, "\\ " );
				field = field.replace( /\//g, "%2F" );
				field = field.replace( /\#/g, "%23" );
				field = field.replace( /\&/g, "%26" );
				field = field.replace( /\(/g, "\\(" );
				field = field.replace( /\)/g, "\\)" );
				field = field.replace( /\+/g, "%2B" );
				field = field.replace( /\:/g, "%3A" );
				fieldNames.push( field );
			}			
		}				
	}	
	url += "&fl=" + fieldNames.join( ",");

	return url;
}


function buildSolrQuerySortFields( fields ) {
	
	var url = "";
	
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
					field = field.replace( /\//g, "%2F" );
					field = field.replace( /\#/g, "%23" );
					field = field.replace( /\&/g, "%26" );
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
	
	return url;	
}


function buildSolrQueryPivots( pivots ) {
	var url = "";
	
	// ------------------------------------------------------------------------------
	// pivot fields: facet.pivot 
	// ------------------------------------------------------------------------------
	if ( pivots.length > 1 ) {
		var pivotQuery = pivots.join( "," );

		if ( pivotQuery.length > 0 ) {
			url += "&facet.pivot=" + pivotQuery;
		}		
	}		

	return url;	
}


function buildSolrQuery( studyUuid, assayUuid, nodeType, start, rows, facets, fields, documents, annotationParam ) {
		
	var nodeSelectionFilter;
	
	if ( nodeSelection.length > 0 ) {
		nodeSelectionFilter = ( nodeSelectionBlacklistMode ? "-" : "" ) + "uuid:" + "(" + nodeSelection.join( " OR " ) +  ")"; 
	}  
	else {
		nodeSelectionFilter = "uuid:*"
	}
	
	var url = solrSelectUrl
		+ "?" + solrQuery 
		+ "&" + solrSettings
		+ "&" + "start=" + start
		+ "&" + "rows=" + rows
		+ "&" + "fq="
		+ "("
			+ "study_uuid:" + studyUuid
			+ " AND " + "assay_uuid:" + assayUuid
			+ " AND " + "is_annotation:" + annotationParam			
		+ " AND " + "(" + "type:" + nodeType + " OR " + "type: \"Derived Data File\"" + " OR " + "type: \"Array Data File\"" + " OR " + "type: \"Derived Array Data File\"" + ")"
		+ ")"
		+ "&" + "fq=" + nodeSelectionFilter
	   	+ "&" + "facet.sort=count" // sort by count, change to "index" to sort by index	   	
	   	+ "&" + "facet.limit=-1"; // unlimited number of facet values (otherwise some values will be missing)	   	
	  	
	url += buildSolrQueryFacetFields( facets );		
	url += buildSolrQueryFieldList( fields );
	url += buildSolrQuerySortFields( fields );
	url += buildSolrQueryPivots( pivots );
	
	
	return ( url );
}


function updateSolrQueryDebugElement( elementId, query ) {
	// "#url-view"
	$( "#" + elementId ).html( "" );
	$( "<a/>", { href: query + "&indent=on", html: "Solr Query" } ).appendTo( "#" + elementId );	
}


function initializeDataWithState( studyUuid, assayUuid, nodeType ) {
	var url = buildSolrQuery( studyUuid, assayUuid, nodeType, 0, 1, {}, {}, {}, showAnnotation );
	updateSolrQueryDebugElement( "url-view", url );
	
	$.ajax( { type: "GET", dataType: "jsonp", url: url, success: function(data) {
		
		query.total_items = data.response.numFound;		
		query.selected_items = data.response.numFound;
		
		// clear facet view
		$( "#facet-view" ).html("");		
		$( "#facet-view" ).append( "<a id=\"clear-facets\" href=\"#\" class=\"btn btn-mini\" data-placement=\"bottom\" data-html=\"true\" rel=\"tooltip\" data-original-title=\"Click to clear facet selection.\"><i class=\"icon-remove-sign\"></i>&nbsp;&nbsp;Reset All</a>" );
	   	
	   	$( "#clear-facets" ).click( function( event ) {
			// clear facet selection
			var counter = clearFacets();
			
			// reload page
			if ( counter > 0 ) {
	   			getData( currentAssayUuid, currentStudyUuid, currentNodeType );				
			}
	   	});				
					

		var defaultSortFieldFound = false;
		for ( var i = 0; i < configurator.state.objects.length; ++i ) {
			var attribute = configurator.state.objects[i];
			
			if ( attribute.is_facet && attribute.is_exposed && !attribute.is_internal ) {
				facets[attribute.solr_field] = [];
				
				$('<div/>', { 'href': '#' + composeFacetId( attribute.solr_field + "___inactive" ), 'class': 'facet-title', "data-toggle": "collapse", "data-parent": "#facet-view", "data-target": "#" + composeFacetId( attribute.solr_field + "___inactive" ), 'id': composeFacetId( attribute.solr_field ), html: "<h4>" + prettifySolrFieldName( attribute.solr_field, true ) + "</h4>" }).appendTo('#facet-view');
				$('<div/>', { 'class': 'facet-value-list selected', "id": composeFacetId( attribute.solr_field + "___active" ), html: "" }).appendTo('#facet-view');							
				$('<div/>', { 'class': 'facet-value-list collapse', "id": composeFacetId( attribute.solr_field + "___inactive" ), html: "" }).appendTo('#facet-view');

			   	$("#" + composeFacetId( attribute.solr_field + "___inactive" ) ).on( "show", function( ) {
			   		attribute = decomposeFacetId( this.id ).facet;
			   		$( "#" + composeFacetId( attribute + "___active" ) ).hide(); //slideUp( "slow" );
			   	});						
	
			   	$("#" + composeFacetId( attribute.solr_field + "___inactive" ) ).on( "hide", function() {
			   		attribute = decomposeFacetId( this.id ).facet;
			   		$( "#" + composeFacetId( attribute + "___active" ) ).fadeIn( "slow" ); //slideDown( "slow");
			   	});																							
			}											
												
			// fields
			if ( ignoredFieldNames.indexOf( attribute.solr_field ) < 0 ) {
				if ( attribute.is_internal ) {
						fields[attribute.solr_field] = { isVisible: false, isInternal: true, direction: "" };					
				}
				else {
					if ( attribute.is_exposed && attribute.is_active ) {
						fields[attribute.solr_field] = { isVisible: true, isInternal: false, direction: "" };
						
						if ( !defaultSortFieldFound ) {
							fields[attribute.solr_field].direction = "asc";
							defaultSortFieldFound = true;
						}
					}
					else {
						if ( attribute.is_exposed && !attribute.is_active ) {
							fields[attribute.solr_field] = { isVisible: false, isInternal: false, direction: "" };						
						}					
					}
				}					
			}
		}
				
		pivots.push( Object.keys( facets )[0] );
		pivots.push( Object.keys( facets )[1] );
		
		getData( studyUuid, assayUuid, nodeType )				
	} });	
}


function updateSelectionCount( elementId ) {
    $( "#" + elementId ).html("");
    currentCount = ( nodeSelectionBlacklistMode ? query.selected_items - nodeSelection.length : nodeSelection.length ); 
	$( "<span/>", { style: "font-size: large;", html: "<b>" + currentCount + "</b> of <b>" + query.total_items + "</b> selected" } ).appendTo( "#" + elementId );
	
	// update viewer buttons
	if ( REFINERY_REPOSITORY_MODE ) {
		updateDownloadButton( "submitReposBtn" );
		updateIgvButton( "igv-multi-species" );	
	}
	
}


function getData( studyUuid, assayUuid, nodeType ) {	
	var url = buildSolrQuery( studyUuid, assayUuid, nodeType, currentItemsPerPage * query.page, currentItemsPerPage, facets, fields, {}, showAnnotation );
	updateSolrQueryDebugElement( "url-view", url );

	$.ajax( {
		type: "GET",
		dataType: "jsonp",
		url: url,
		success: function(data) {		
			query.selected_items = data.response.numFound;	    
		    updateSelectionCount( "statistics-view" );
	
			if (  data.response.numFound < data.response.start ) {
				// requesting data that is not available -> empty results -> rerun query			
				// determine last available page given items_per_page setting
				query.page = Math.max( 0, Math.ceil( data.response.numFound/currentItemsPerPage ) - 1 );
				getData( currentAssayUuid, currentStudyUuid, currentNodeType );
			}
			else {
				processFacets( data );
				processFields();
				processDocs( data );
				processPages( data );
				
				//processPivots( data );				
				
				if ( REFINERY_REPOSITORY_MODE ) {
					updateDownloadButton( "submitReposBtn" );
				}			
			} 
	}});	
}


function getPivotData( studyUuid, assayUuid, nodeType ) {	
	var url = buildPivotQuery( studyUuid, assayUuid, nodeType ); 
	
	$.ajax( { type: "GET", dataType: "jsonp", url: url, success: function(data) {		
			processPivots( data );				
		} 
	});	
}


function getField( studyUuid, assayUuid, nodeType, field, callback ) {
	var fieldSelection = {};
	fieldSelection[field] = { isVisible: true };
	var solr_query = buildSolrQuery( studyUuid, assayUuid, nodeType, 0, query.total_items, {}, fieldSelection, {}, showAnnotation );
		
	$.ajax( { type: "GET", dataType: "jsonp", url: solr_query, success: function(data) {
		var fieldValues = [] 
				
		for ( var i = 0; i < data.response.docs.length; ++i ) {
			fieldValues.push( data.response.docs[i][field] );
	    }
	    
	    callback( fieldValues );					
	}});	
}


function clearFacets() {
	var counter = 0;
	
	for ( var facet in facets ) {
		if ( facets.hasOwnProperty( facet ) ) {
			for ( var facetValue in facets[facet] ) {
				if ( facets[facet].hasOwnProperty( facetValue ) ) {
					if ( facets[facet][facetValue].isSelected ) {
						facets[facet][facetValue].isSelected = false;
						++counter;
					}					
				}
			}				
		}
	}
	
	return counter;
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

function updateDownloadButton( button_id ) {
	if ( currentCount > MAX_DOWNLOAD_FILES || currentCount <= 0 || !REFINERY_USER_AUTHENTICATED || ( showAnnotation && !allowAnnotationDownload ) ) {
		$("#" + button_id ).addClass( "disabled" );
		$("#" + button_id ).attr( "data-original-title", MESSAGE_DOWNLOAD_UNAVAILABE );
	} else {
		$("#" + button_id ).removeClass( "disabled" );		
		$("#" + button_id ).attr( "data-original-title", MESSAGE_DOWNLOAD_AVAILABLE );
	}
}

function updateIgvButton( button_id ) {
	if ( currentCount <= 0 ) {
		$("#" + button_id ).addClass( "disabled" );
	} else {
		$("#" + button_id ).removeClass( "disabled" );		
	}
}


function decomposeFacetId( facetId ) {
	return ( { facet: facetId.split( "___" )[1] } );
}


function processFacets( data ) {

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
		    		selectedItems.push("<tr class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\"><td>" + '<label class="checkbox"><input type="checkbox" checked></label>' + "</td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );					
	    			unselectedItems.push("<tr class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\"><td>" + '<label class="checkbox"><input type="checkbox" checked></label>' + "</td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );					
				}
				else {
	    			unselectedItems.push("<tr class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\"><td>" + '<label class="checkbox"><input type="checkbox"></label>' + "</td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td><td></td>"  + "</tr>" );					
				}												
			}
			
			$( "#" + composeFacetId( facet + "___active" ) ).html( "<table class=\"\"><tbody>" + selectedItems.join('') + "</tbody></table>" ); 
			$( "#" + composeFacetId( facet + "___inactive" ) ).html( "<table class=\"\"><tbody>" + unselectedItems.join('') + "</tbody></table>" );
		}		
    }

   	
   	$(".facet-value").on( "click", function() {
   		var facetValueId = this.id;
   		var facet = decomposeFacetValueId( facetValueId ).facet;
   		var facetValue = decomposeFacetValueId( facetValueId ).facetValue;
   	   		
   		facets[facet][facetValue].isSelected = !facets[facet][facetValue].isSelected;
   		resetNodeSelection();
   		getData( currentAssayUuid, currentStudyUuid, currentNodeType );
   	} );
   	
   	
   	// === initialize pivots ===
   	
	// make dropdown lists	
	var pivot1List = [];
	var pivot2List = [];
	
	pivot1List.push( "<option value=\"\"></option>" );
	pivot2List.push( "<option value=\"\"></option>" );
	
	for ( facet in facets ) {
		if ( facets.hasOwnProperty( facet ) ) {
			if ( pivots.length > 0 && pivots[0] === facet ) {
				pivot1List.push( "<option selected value=\"" + facet + "\">" + prettifySolrFieldName( facet ) + "</option>" );
			}
			else {
				pivot1List.push( "<option value=\"" + facet + "\">" + prettifySolrFieldName( facet ) + "</option>" );				
			}
			
			if ( pivots.length > 1 && pivots[1] === facet ) {
				pivot2List.push( "<option selected value=\"" + facet + "\">" + prettifySolrFieldName( facet ) + "</option>" );
			}
			else {
				pivot2List.push( "<option value=\"" + facet + "\">" + prettifySolrFieldName( facet ) + "</option>" );				
			}
		}
	}
	
	$( "#pivot-view" ).html( "" );
	$( "<select/>", { "class": "combobox", "id": "pivot_x1_choice", html: pivot1List.join("") } ).appendTo( "#pivot-view" );	
	$( "<select/>", { "class": "combobox", "id": "pivot_y1_choice", html: pivot2List.join("") } ).appendTo( "#pivot-view" );
		
	// events on pivot dimensions
	$( "#pivot_x1_choice" ).change( function( ) {
		pivots = []
		var pivot_x1 = this.value;
		var pivot_y1 = $( "#pivot_y1_choice option:selected" ).attr( "value" );
		
		if ( pivot_x1 !== "" )
		{
			pivots.push( pivot_x1 );
		}
				
		if ( pivot_y1 !== "" )
		{
			pivots.push( pivot_y1 );
		}
				
   		getPivotData( currentAssayUuid, currentStudyUuid, currentNodeType );
   	} );		

	$( "#pivot_y1_choice" ).change( function( ) {
		pivots = []
		var pivot_x1 = $( "#pivot_x1_choice option:selected" ).attr( "value" );
		var pivot_y1 = this.value;
		
		if ( pivot_x1 !== "" )
		{
			pivots.push( pivot_x1 );
		}
				
		if ( pivot_y1 !== "" )
		{
			pivots.push( pivot_y1 );
		}
		
   		getPivotData( currentAssayUuid, currentStudyUuid, currentNodeType );
   	} );   	
   	
   	
   	renderPivotMatrix( true, pivots[1], pivots[0] );
}


function resetNodeSelection() {
	nodeSelection = [];
   	nodeSelectionBlacklistMode = true;   		
}


function getFacetValueLookupTable( facet ) {
	// make lookup table mapping from facet values to facet value indices
	var lookup = {};
	var index = 0;
			
	for ( facetValue in facets[facet] ) {
		if ( facets[facet].hasOwnProperty( facetValue ) ) {
			lookup[facetValue] = index++;
		}
	}	
	
	return lookup;
}
	

function processPivots( data ) {
	
	if ( data.facet_counts.facet_pivot ) {
		
		// get lookup table for facets (mapping from facet value to facet value index)
		var facetValue1Lookup = getFacetValueLookupTable( pivots[0] );		
		var facetValue2Lookup = getFacetValueLookupTable( pivots[1] );		
		
		var rows = [];
		
		// make empty 2D array of the expected dimensions
		pivotMatrixData = new Array( Object.keys( facetValue1Lookup ).length );
		
		for ( var i = 0; i < pivotMatrixData.length; ++i ) {
			pivotMatrixData[i] = new Array( Object.keys( facetValue2Lookup ).length );
			
			for ( var j = 0; j < pivotMatrixData[i].length; ++j ) {
				pivotMatrixData[i][j] = { x: j, y: i, xlab: Object.keys( facetValue2Lookup )[j], xfacet: pivots[1], ylab: Object.keys( facetValue1Lookup )[i], yfacet: pivots[0], count: 0 };
			}
		}
				
		// fill 2D array
		if ( data.facet_counts.facet_pivot[pivots.join(",")] ) {			
			var tableData = data.facet_counts.facet_pivot[pivots.join(",")];
			var tableRows = [];
			
			for ( var r = 0; r < tableData.length; ++r ) {
				var facetValue1 = tableData[r].value;								 
				var facetValue1Index = facetValue1Lookup[facetValue1];
				
				for ( var c = 0; c < tableData[r].pivot.length; ++c ) {
					var facetValue2 = tableData[r].pivot[c].value;
					var facetValue2Index = facetValue2Lookup[facetValue2];
					
					pivotMatrixData[facetValue1Index][facetValue2Index].count = tableData[r].pivot[c].count; 					
				}
			}
		}
		
		// convert 2D array into table
		for ( var r = 0; r < pivotMatrixData.length; ++r ) {
			// start row
			var row = "<tr>";
			
			// row name
			row += "<td>" + Object.keys( facetValue1Lookup )[r] + "</td>";
			
			// row content
			row += "<td>" + $.map( pivotMatrixData[r], function(entry) { return( entry.count )} ).join( "</td><td>" ) + "</td>";
			
			// end row
			row += "</tr>";
			
			rows.push( row );
		}

		// build table header
		var header = "<thead><tr><th></th><th>" + Object.keys( facetValue2Lookup ).join( "</th><th>" ) + "</th></tr></thead>"; 
		
		//$( "<table/>", { 'class': "table table-striped table-condensed", html: header + "<tbody>" + rows.join("") + "</tbody>" } ).appendTo( "#pivot-view" );
		renderPivotMatrix( true, pivots[1], pivots[0] );
	}
}

function renderPivotMatrix( useGradient, xPivot, yPivot ) {
	var useGradient = useGradient || true;

	$( "#pivot-matrix" ).html( "" );		
	if ( pivotMatrixData ) {
		graph = new PivotMatrix( "pivot-matrix", {}, pivotMatrixData, facets, xPivot, yPivot, useGradient, function(){ getData( currentAssayUuid, currentStudyUuid, currentNodeType ); } );		
	}
}


function processFields() {
	var visibleItems = []
	var invisibleItems = []
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible && !fields[field].isInternal ) {
				visibleItems.push("<a class=\"field-name\" label id=\"" + composeFieldNameId( field ) + "\">" + '<label class="checkbox"><input type="checkbox" checked></label>' + "&nbsp;" + prettifySolrFieldName( field, true ) + "</a>" );				
			}
			else {
				if ( hiddenFieldNames.indexOf( field ) < 0 && !fields[field].isInternal ) {
					visibleItems.push("<a class=\"field-name\" label id=\"" + composeFieldNameId( field ) + "\">"  + '<label class="checkbox"><input type="checkbox"></label>' +  "&nbsp;" + prettifySolrFieldName( field, true ) + "</a>" );
				}
			}
		}
	}

	$("#field-view").html("" );

	if ( visibleItems.length > 0 ) {
		var listItems = [];
		for ( var i = 0; i < visibleItems.length; ++i ) {
			listItems.push( "<li>" + visibleItems[i] + "</li>" );			
		}
		$("#field-view").append( listItems.join( ""));
	}	
	
	// configure columns
   	$("#field-view").children().click( function(event) {
   		event.stopPropagation();
   		
   		var fieldNameId = event.target.id;
   		var fieldName = decomposeFieldNameId( fieldNameId ).fieldName;
   	   		
   		fields[fieldName].isVisible = !fields[fieldName].isVisible;   		
   		getData( currentAssayUuid, currentStudyUuid, currentNodeType );
   	} );				
   	
   	// configure rows
   	$( "#" + "items-per-page-buttons" ).html("");
   	for ( var i = 0; i < itemsPerPageOptions.length; ++i ) {
   		if ( itemsPerPageOptions[i] == currentItemsPerPage ) {
			$( "#" + "items-per-page-buttons" ).append(
				'<button type="button" data-items="' + itemsPerPageOptions[i] + '" data-toggle="button" class="btn btn-mini active" rel="tooltip" data-placement="bottom" data-html="true" title="View ' + itemsPerPageOptions[i] + ' rows per page">' + itemsPerPageOptions[i] + '</button>' );   			
   		}
   		else {
			$( "#" + "items-per-page-buttons" ).append(
				'<button type="button" data-items="' + itemsPerPageOptions[i] + '" data-toggle="button" class="btn btn-mini" rel="tooltip" data-placement="bottom" data-html="true" title="View ' + itemsPerPageOptions[i] + ' rows per page">' + itemsPerPageOptions[i] + '</button>' );   			   			
   		}
   	}
   	
   	$("#" + "items-per-page-buttons").children().click( function(event) {
   		if ( currentItemsPerPage != $(this).data("items") ) {
	   		currentItemsPerPage = $(this).data("items");
	   		getData( currentAssayUuid, currentStudyUuid, currentNodeType );   			
   		}
   	});
   	   	

}

function makeTableHeader() {

	var items = [];

	items.push( '<th align="left" width="0" id="node-selection-column-header"></th>' );	
		
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible ) {
				if ( fields[field].direction === "asc" ) {
					items.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\"><i class=\"icon-arrow-down\">&nbsp;" + prettifySolrFieldName( field, true ) + "</th>" );				
				} else if ( fields[field].direction === "desc" ) {
					items.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\"><i class=\"icon-arrow-up\">&nbsp;" + prettifySolrFieldName( field, true ) + "</th>" );				
				} else {
					items.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\">" + prettifySolrFieldName( field, true ) + "</th>" );									
				}
			}
		}
	}

	return "<thead><tr>" + items.join("") + "</tr></thead>";
}


function processDocs( data ) {
	var items = []
	documents = []
	for ( var i = 0; i < data.response.docs.length; ++i ) {
		documents.push( data.response.docs[i] );
		
		var document = documents[i];
		var s = "<tr>";
		
		//adding galaxy comboboxes 
		var node_uuid = document.uuid;
		
		// IF Repository mode 
		if ( REFINERY_REPOSITORY_MODE ) {
			var isNodeSelected;
			
			if ( nodeSelection.indexOf( node_uuid ) != -1 ) {
				if ( nodeSelectionBlacklistMode ) {
					isNodeSelected = false;
				}
				else {
					isNodeSelected = true;
				}				
			}
			else
			{
				if ( nodeSelectionBlacklistMode ) {
					isNodeSelected = true;
				}
				else {
					isNodeSelected = false;
				}				
			}
									
			s += '<td><label><input id="file_' + node_uuid + '" data-uuid="' + node_uuid + '" class="node-selection-checkbox" type=\"checkbox\" ' + ( isNodeSelected ? "checked" : "" ) + '></label>' + '</td>';							
			
			//s += '<td></td>';
		}
		else { 
			var check_temp = '<select name="assay_'+ node_uuid +'" id="webmenu" class="btn-mini OGcombobox"> <option></option> </select>';
			s += '<td>' + check_temp + '</td>'
		}

		for ( entry in fields )
		{
			if ( fields.hasOwnProperty( entry ) && fields[entry].isVisible && !fields[entry].isInternal ) {
				if ( document.hasOwnProperty( entry ) && !( hiddenFieldNames.indexOf( entry ) >= 0 ) )
				{
					s += "<td>";
					s += document[entry];
					s += "</td>";				
				}
				else // this field does not exist in this result
				{
					s += "<td>";
					s += ""
					s += "</td>";								
				}				
			}
		}
		s += "</tr>";
		items.push( s );
    }	

    var tableHeader = makeTableHeader();
                 
    $( "#table-view" ).html("");
	$('<table/>', { 'class': "table table-striped table-condensed", 'id':'table_matrix',html: tableHeader + "<tbody>" + items.join('\n') + "</tbody>" }).appendTo('#table-view');
	
	// add node selection mode checkbox to node selection column header cell
	var nodeSelectionModeCheckbox = '<label><input id="node-selection-mode" type=\"checkbox\" ' + ( nodeSelectionBlacklistMode ? "checked" : "" ) + '></label>';
	$( "#" + "node-selection-column-header" ).html( nodeSelectionModeCheckbox );	

	// attach event to node selection mode checkbox
	$( "#" + "node-selection-mode" ).click( function( event ){
		if ( nodeSelectionBlacklistMode ) {
			nodeSelectionBlacklistMode = false;
			nodeSelection = [];
			$( "." + "node-selection-checkbox" ).removeAttr( "checked" );
		}
		else {
			nodeSelectionBlacklistMode = true;
			nodeSelection = [];
			$( "." + "node-selection-checkbox" ).attr( "checked", "checked" );
		}
		
		updateSelectionCount( "statistics-view" );
	});

	// attach events to node selection checkboxes
	$( "." + "node-selection-checkbox" ).click( function( event ) {
		var nodeUuid = $(this).data( "uuid" );			
		var nodeUuidIndex = nodeSelection.indexOf( nodeUuid );
		
		if ( nodeUuidIndex != -1 ) {
			// remove element
			nodeSelection.splice( nodeUuidIndex, 1 ); 			
		}
		else {
			nodeSelection.push( nodeUuid );
		}
		
		updateSelectionCount( "statistics-view" );
	});
	
	// attach events to column headers
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible && !fields[field].isInternal ) {
				$( "#" + composeFieldNameId( field + "___header" ) ).on( "click", function() {
					newDirection = toggleFieldDirection( fields[decomposeFieldNameId( this.id ).fieldName].direction );
					clearFieldDirections();
					fields[decomposeFieldNameId( this.id ).fieldName].direction = newDirection;					
					getData( currentAssayUuid, currentStudyUuid, currentNodeType ); 					
				});
			}
		}
	}
	
    //initialize data table
    //initDataTable('table_matrix');
    workflowActions();	
}


function processPages( data ) {	
	var visiblePages = 5;
	var padLower = 2;
	var padUpper = 2;
	var availablePages = Math.max( 0, Math.ceil( data.response.numFound/currentItemsPerPage ) - 1 );

	if ( query.page > availablePages ) {
		query.page = availablePages;
	}
	
	if ( availablePages < visiblePages ) {
		if ( query.page < padLower ) {
			padUpper = padUpper + padLower;  
			padLower = query.page;
			padUpper = padUpper - padLower;  		
		}
	}  	
	else if ( query.page < padLower ) {
		padUpper = padUpper + padLower;  
		padLower = query.page;
		padUpper = padUpper - padLower;  		
	}  
	else if ( query.page > availablePages - padLower ) {
		padLower = padLower + padUpper - ( availablePages - query.page );  
		padUpper = availablePages - query.page;
	}  

	
	var items = [];
		
	if ( query.page == 0 ) {
		items.push( "<li class=\"disabled\"><a>&laquo;</a></li>" );						
	}
	else {
		items.push( "<li><a href=\"#\" id=\"page-first\">&laquo;</a></li>" );		
	}
	
	for ( var i = query.page - padLower; i <= query.page + padUpper; ++i ) {
		if ( i == query.page ) {
			items.push( "<li class=\"active\"><a href=\"#\" id=\"page-" + (i+1) + "\">" + (i+1) + "</a></li>")			
		} 
		else {
			if ( i > availablePages ) {
				items.push( "<li class=\"disabled\"><a>"+ (i+1) + "</a></li>")							
			}
			else {
				items.push( "<li><a href=\"#\" id=\"page-" + (i+1) + "\">"+ (i+1) + "</a></li>")				
			}			 
		}
	}
	
	if ( query.page == availablePages ) {
		items.push( "<li class=\"disabled\"><a>&raquo;</a></li>" );						
	} 
	else {
		items.push( "<li><a href=\"#\" id=\"page-last\">&raquo;</a></li>")					
	}
	
	
    $( "#pager-view" ).html("");	
	$('<div/>', { 'class': "pagination", html: "<ul>" + items.join('') + "</ul>" }).appendTo( '#pager-view' );

	$( "[id^=page-]" ).on( "click", function() {
		
		page = this.id.split( "-" )[1];
		
		if ( page === "first" ) {
			query.page = 0;			
		} else if ( page === "last" ) {
			query.page = availablePages;						
		} else {
			query.page = page - 1;			
		}
				
		getData( currentAssayUuid, currentStudyUuid, currentNodeType ); 							  
	});
}

function toggleFieldDirection( direction ) {
	if ( direction === "asc" ) {
		return ( "desc" );
	}
	
	if ( direction === "desc" ) {
		return ( "asc" );
	}
	
	return ( "asc" );
}

function clearFieldDirections() {
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			fields[field].direction = "";
		}
	}
}


var createCallback = function(url) {
    return function() {
        window.open(url);
    };
};

function createSpeciesModal(aresult) {
	//console.log("contents.js createSpeciesModal called");
    var ret_buttons = [];
    
    for (var species in aresult) {
	   var session_url = aresult[species];
	   
	   ret_buttons.push({
	   					"label":species, 
	   					"class":"btn-primary", 
	   					"url": session_url
	   					});
	}
	
	return ret_buttons;
}



$( "#profile-viewer-session-link" ).on( "click", function() {
	getField( currentAssayUuid, currentStudyUuid, currentNodeType, "uuid", function( uuids ) {
		
		var limit = 1;
		var newUrl = "/visualization_manager/profile_viewer_session?uuid=" + uuids[0];
		
		console.log( newUrl );
		window.location = newUrl;			
	});
});


$( "#save-selection-button" ).on( "click", function() {
	getField( currentAssayUuid, currentStudyUuid, currentNodeType, "uuid", function( uuids ) {
		nodeSetManager.postState( "Test Set " + Date(), "Summary for Node Set", uuids, function(){
			alert( "Node Set Created!" );
		});
	});
});


$( "#igv-multi-species" ).on( "click", function(e) {
		if ( $("#igv-multi-species").hasClass( "disabled" ) ) {
			return;
		}
	
	// KILLs AJAX request if already sent
	if(typeof xhr!='undefined'){
   		//kill the request
   		xhr.abort()
   	}
	
	// function for getting current solr query 
	var solr_url = buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, facets, fields, {}, false );
	// annotation files solr query 
	var solr_annot = buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, {}, fields, {}, true );
	
	// url to point ajax function too 
	var temp_url = solrIgvUrl;
	
	//console.log("solr_url");
	//console.log(solr_url);	
	//console.log("solr_annot");
	//console.log(solr_annot);
	 	
	e.preventDefault();
	
	// clears modal body
	$("#myModalBody").html("Preparing IGV session ... <br>");  		
	
	// adding spinner to be removed after ajax callback
	opts["left"] = $("#igvModal").width()/2 - 30;
	var target = document.getElementById('myModalBody');
	var spinner = new Spinner(opts).spin(target);  
	$('#igvModal').modal();
		

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

	
 	var xhr = $.ajax({
	     url:temp_url,
	     type:"POST",
	     dataType: "json",
	     data: {'query': solr_url, 'annot':solr_annot, 'node_selection': nodeSelection, 'node_selection_blacklist_mode': nodeSelectionBlacklistMode },
	     success: function(result){
	     	
	     	// stop spinner     	
	     	spinner.stop();
	     	$("#myModalBody").html("");  		
	
	     	var ret_buttons = createSpeciesModal(result.species);
	     	
	     	// if only 1 species returned
			if (ret_buttons.length == 1) {
				$('#igvModal').modal("hide");
	     		window.location = ret_buttons[0].url;
	     		
	     	}
	     	else { 
	     		
	     		var buttonString = "";
				var speciesString = "";
				if (result.species_count == 0) {	
					speciesString = "<p>" + "Your selected samples do not have a defined genome build. To view the samples, open IGV with the proper genome." 
				}
				else {
					speciesString = "<p>" + "You selected samples from " + ret_buttons.length + " different genome builds. To view the samples, open IGV with the corresponding genome." 
				}
		     	
		     	
				$("#myModalBody").append( speciesString );
				$("#myModalBody").append( "<div class=\"btn-group\" style=\"align: center;\" id=\"launch-button-group\">" );
				for (var counter = 0; counter < ret_buttons.length; ++counter) {
				    $("#launch-button-group").append( "<button class=\"btn btn-primary\" id=\"button_" + counter + "\">" + ret_buttons[counter]["label"] + "</button>" );
				    $("#" + "button_" + counter ).click(createCallback(ret_buttons[counter]["url"]));
				}
			}
			
		}
	});
	
	
});

	// button for submtting execution of workflows when in REPOSITORY mode
	$("#submitReposBtn").click( function(event) {
		if ( $("#submitReposBtn").hasClass( "disabled" ) ) {
			return;
		}
				
		event.preventDefault(); // cancel default behavior
		
		console.log( "workflowActions: REFINERY_REPOSITORY_MODE" );
		console.log( REFINERY_REPOSITORY_MODE );
		
		var the_workflow_uuid = $('#submitReposBtn').data().workflow_id;
		console.log("the_workflow_uuid");
		console.log(the_workflow_uuid);
		
		// function for getting current solr query 
		var solr_url = buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, facets, fields, {}, false );
		
		
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
		 	
		$.ajax({
		     url:'/analysis_manager/repository_run/',
		     type:"POST",
		     dataType: "json",
		     data: {'query': solr_url, 'workflow_choice':the_workflow_uuid, 'study_uuid':$('input[name=study_uuid]').val(),
		     	'node_selection': nodeSelection, 'node_selection_blacklist_mode': nodeSelectionBlacklistMode },
		     success: function(result){		     	
		     	console.log(result);
				window.location = result;
				}
			});
	});
		
	


// ---------------------------------
})();
// end scope  


