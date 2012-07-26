// Nils Gehlenborg, July 2012
// start scope
(function() {
// ---------------------------------

var urlComponents = document.location.href.split("/");	
	
var solrRoot = "http://127.0.0.1:8983/solr/data_set_manager/select";
var solrQuery = "q=django_ct:data_set_manager.node";
var solrSettings = "wt=json&json.wrf=?&facet=true";

var query = { total_items: 0, selected_items: 0, items_per_page: 10, page: 0 };

var testStudyUuid = urlComponents[urlComponents.length-2];
var testAssayUuid = urlComponents[urlComponents.length-3]; 
var testNodeType = "\"Raw Data File\"";

var ignoredFieldNames = [ "django_ct", "django_id", "id" ];
var hiddenFieldNames = [ "uuid", "study_uuid", "assay_uuid", "file_uuid", "type", "name" ]; // TODO: make these regexes
var invisibleFieldNames = [ ];
//var invisibleFieldNames = [ "name" ];

var addFieldNames = ["Options"];

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

var documents = [];

$(".collapse").collapse();

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
					facetValue = facetValue.replace( /\//g, "%2F" );
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
					field = field.replace( /\//g, "%2F" );
					field = field.replace( /\#/g, "%23" );
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
	
	
	//$( "#url-view" ).html( "" );
	//$( "<a/>", { href: url + "&indent=on", html: "Solr Query" } ).appendTo( "#url-view" );

	return ( url );
}


function prettifyFieldName( name, isTitle )
{	
	isTitle = isTitle || false;
	
	var position = name.indexOf( "_Characteristics_" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}	

	var position = name.indexOf( "_Factor_" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}
	
	var position = name.indexOf( "_Comment_" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}

	var position = name.indexOf( "Material_Type_" );
	if ( position != -1 ) {
		name = "Material Type";
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
		
		query.total_items = data.response.numFound;		
		query.selected_items = data.response.numFound;		
	
		for ( var attribute in doc ) {
			if ( doc.hasOwnProperty( attribute ) ) {
				// facets
				if ( ( attribute.indexOf( "_Characteristics_" ) != -1 ) ||
					 ( attribute.indexOf( "_Factor_" ) != -1 ) ||
					 ( attribute.indexOf( "_Material_Type_" ) != -1 ) ) {
					facets[attribute] = [];
					
					$('<div/>', { 'class': 'facet-title', "data-toggle": "collapse", "data-target": "#" + composeFacetId( attribute + "___inactive" ), 'id': composeFacetId( attribute ), html: "<h4>" + prettifyFieldName( attribute, true ) + "</h4>" }).appendTo('#facet-view');
					$('<div/>', { 'class': 'facet-value-list selected', "id": composeFacetId( attribute + "___active" ), html: "" }).appendTo('#facet-view');							
					$('<div/>', { 'class': 'facet-value-list collapse', "data-parent":"#facet-view", "id": composeFacetId( attribute + "___inactive" ), html: "" }).appendTo('#facet-view');

				   	$("#" + composeFacetId( attribute + "___inactive" ) ).on( "show", function( attribute ) {
				   		attribute = decomposeFacetId( this.id ).facet;
				   		$( "#" + composeFacetId( attribute + "___active" ) ).hide(); //slideUp( "slow" );
				   	});						
		
				   	$("#" + composeFacetId( attribute + "___inactive" ) ).on( "hide", function() {
				   		attribute = decomposeFacetId( this.id ).facet;
				   		$( "#" + composeFacetId( attribute + "___active" ) ).fadeIn( "slow" ); //slideDown( "slow");
				   	});																							
				}
								
				// fields
				if ( ignoredFieldNames.indexOf( attribute ) < 0 ) {
					if ( ( hiddenFieldNames.indexOf( attribute ) < 0 ) && ( invisibleFieldNames.indexOf( attribute ) < 0 ) ) {
						fields[attribute] = { isVisible: true, direction: "" };
					}
					else {
						fields[attribute] = { isVisible: false, direction: "" };
					}					
				}
			}		
		}
		
		getData( studyUuid, assayUuid, nodeType )				
	} });	
}

function getData( studyUuid, assayUuid, nodeType ) {
	$.ajax( { type: "GET", dataType: "jsonp", url: buildSolrQuery( studyUuid, assayUuid, nodeType, query.items_per_page * query.page, query.items_per_page, facets, fields, {} ), success: function(data) {		
		query.selected_items = data.response.numFound;
	    $( "#statistics-view" ).html("");
    	$( "<h1/>", { html: query.selected_items + "/" + query.total_items } ).appendTo( "#statistics-view" );				

		if (  data.response.numFound < data.response.start ) {
			// requesting data that is not available -> empty results -> rerun query			
			// determine last available page given items_per_page setting
			query.page = Math.max( 0, Math.ceil( data.response.numFound/query.items_per_page ) - 1 );
			getData( testAssayUuid, testStudyUuid, testNodeType );
		}
		else {
			processFacets( data );
			processFields( data );
			processDocs( data );
			processPages();			
		}
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
	//$( "#facet-view" ).html("");

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
		    		selectedItems.push("<tr class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\"><td><i class=\"icon-remove\"/></td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );					
	    			unselectedItems.push("<tr class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\"><td><i class=\"icon-remove\"/></td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );					
				}
				else {
	    			unselectedItems.push("<tr class=\"facet-value\" id=\"" + composeFacetValueId( facet, facetValue ) + "\"><td><i class=\"icon-remove icon-white\"/></td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td><td></td>"  + "</tr>" );					
				}												
			}
			
			$( "#" + composeFacetId( facet + "___active" ) ).html( "<table class=\"\"><tbody>" + selectedItems.join('') + "</tbody></table>" ); 
			$( "#" + composeFacetId( facet + "___inactive" ) ).html( "<table class=\"\"><tbody>" + unselectedItems.join('') + "</tbody></table>" );
		}		
    }
   	
   	/*
   	$(".facet-title").click( function() {
   		$( "#" + $( this).attr( "data-target" ) ).toggleClass( "in" );
   	} );
   	*/			
   	
   	$(".facet-value").on( "click", function() {
   		var facetValueId = this.id;
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
				visibleItems.push("<span class=\"field-name\" label id=\"" + composeFieldNameId( field ) + "\">" + "<i class=\"icon-remove\"/>&nbsp;" + prettifyFieldName( field ) + "</span>" );				
			}
			else {
				if ( hiddenFieldNames.indexOf( field ) < 0 ) {
					invisibleItems.push("<span class=\"field-name\" label id=\"" + composeFieldNameId( field ) + "\">" + "<i class=\"icon-plus\"/>&nbsp;" + prettifyFieldName( field ) + "</span>" );
				}
			}
		}
	}

	$("#field-view").html("" );

	if ( visibleItems.length > 0 ) {
		$('<h4/>', { html: "Remove Columns" }).appendTo('#field-view');
		$('<p/>', { 'class': 'field-name-list', html: visibleItems.join(' | ') }).appendTo('#field-view');
	}
	
	if ( invisibleItems.length > 0 ) {
		$('<h4/>', { html: "Add Columns" }).appendTo('#field-view');
		$('<p/>', { 'class': 'field-name-list', html: invisibleItems.join(' | ') }).appendTo('#field-view');		
	}
	
   	$("#field-view").children().click( function() {
   		var fieldNameId = event.target.id;
   		var fieldName = decomposeFieldNameId( fieldNameId ).fieldName;
   	   		
   		fields[fieldName].isVisible = !fields[fieldName].isVisible;   		
   		getData( testAssayUuid, testStudyUuid, testNodeType );
   	} );				
	
}

function makeTableHeader( leadingExtra, trailingExtra ) {
	leadingExtra = leadingExtra | 0;
	trailingExtra = trailingExtra | 0;
	
	var items = [];

	for ( var i = 0; i < leadingExtra; ++i ) {
		items.push("<th align=left width=0></th>" );	
	}
		
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible ) {
				if ( fields[field].direction === "asc" ) {
					items.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\">" + prettifyFieldName( field, true ) + "&nbsp;<i class=\"icon-arrow-down\"></th>" );				
				} else if ( fields[field].direction === "desc" ) {
					items.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\">" + prettifyFieldName( field, true ) + "&nbsp;<i class=\"icon-arrow-up\"></th>" );				
				} else {
					items.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\">" + prettifyFieldName( field, true ) + "</th>" );									
				}
			}
		}
	}

	for ( var i = 0; i < trailingExtra; ++i ) {
		items.push("<th></th>" );	
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
		var file_uuid = document.file_uuid;
		var check_temp = '<select name="assay_'+ file_uuid +'" id="webmenu" class="btn-mini OGcombobox"> <option></option> </select> <input type="hidden" name="fileurl_' + file_uuid +'" value="' + document.name + '">';
		
		s += '<td>' + check_temp + '</td>'
		for ( entry in document )
		{
			if ( document.hasOwnProperty( entry ) && !( hiddenFieldNames.indexOf( entry ) >= 0 ) )
			{
				s += "<td>";
				s += document[entry];
				s += "</td>";				
			}
		}
		s += "</tr>";
		items.push( s );
    }	
    // RPARK getting headers
    var tableHeader = makeTableHeader( 1 ); 
    
    $( "#table-view" ).html("");
	$('<table/>', { 'class': "table table-striped table-condensed", 'id':'table_matrix',html: tableHeader + "<tbody>" + items.join('\n') + "</tbody>" }).appendTo('#table-view');
	
	// attach events to column headers
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible ) {
				$( "#" + composeFieldNameId( field + "___header" ) ).on( "click", function() {
					newDirection = toggleFieldDirection( fields[decomposeFieldNameId( this.id ).fieldName].direction );
					clearFieldDirections();
					fields[decomposeFieldNameId( this.id ).fieldName].direction = newDirection;					
					getData( testAssayUuid, testStudyUuid, testNodeType ); 					
				});
			}
		}
	}
	
    //initialize data table
    //initDataTable('table_matrix');
    workflowActions();	
}


function processPages() {	
	var visiblePages = 5;
	var padLower = 2;
	var padUpper = 2;
	var availablePages = Math.max( 0, Math.ceil( data.response.numFound/query.items_per_page ) - 1 );

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
				
		getData( testAssayUuid, testStudyUuid, testNodeType ); 							  
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


initializeData( testAssayUuid, testStudyUuid, testNodeType );

// ---------------------------------
})();
// end scope  


