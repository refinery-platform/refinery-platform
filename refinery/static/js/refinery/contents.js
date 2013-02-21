// Nils Gehlenborg, July 2012
// start scope
(function() {
// ---------------------------------

var MAX_DOWNLOAD_FILES = 20;
var MESSAGE_DOWNLOAD_UNAVAILABE = "You have to be logged in<br> and selected " + MAX_DOWNLOAD_FILES + " files or less<br>to create an archive for download.";
var MESSAGE_DOWNLOAD_AVAILABLE = "Click to create<br>archive for download<br>of selected files.";

	
var allowAnnotationDownload = false;

var solrRoot = document.location.protocol + "//" + document.location.host + "/solr/";
var solrSelectUrl = solrRoot + "data_set_manager/select/";
var solrSelectEndpoint = "data_set_manager/select/";
var solrIgvUrl = solrRoot + "igv/";

var solrQuery = "q=django_ct:data_set_manager.node";
var solrSettings = "wt=json&json.wrf=?&facet=true";

var itemsPerPageOptions = [10,20,50,100]; 
var currentItemsPerPage = itemsPerPageOptions[0];

var query = { total_items: 0, selected_items: 0, items_per_page: currentItemsPerPage, page: 0 };

var currentCount = 0;

var currentStudyUuid = externalStudyUuid;
var currentAssayUuid = externalAssayUuid; 
var currentNodeType = "\"Raw Data File\"";

var dataSetNodeTypes = ['"Raw Data File"', '"Derived Data File"', '"Array Data File"', '"Derived Array Data File"', '"Array Data Matrix File"', '"Derived Array Data Matrix File"'];


$(document).ready(function() {		
	configurator = new DataSetConfigurator( externalAssayUuid, externalStudyUuid, "configurator-panel", REFINERY_API_BASE_URL, "{{ csrf_token }}" );
	configurator.initialize();
		
	// event handling
	var document_table_commands = new Backbone.Wreqr.Commands();
	var facet_view_commands = new Backbone.Wreqr.Commands();
	var pivotMatrixCommands = new Backbone.Wreqr.Commands();
	var client_commands = new Backbone.Wreqr.Commands();
	var query_commands = new Backbone.Wreqr.Commands();
	
	var showAnnotation = false;
	
	configurator.initialize( function() {
		var query = new SolrQuery( configurator, query_commands );
		query.initialize();
		query.addFilter( "type", dataSetNodeTypes );
		query.addFilter( "is_annotation", false );

		var dataQuery = query.clone();
		dataQuery.addFilter( "is_annotation", false );
				
		var annotationQuery = query.clone();
		annotationQuery.addFilter( "is_annotation", true );
				 
		// =====================================
		
		function updateDownloadButton( button_id ) {
			if ( query.getCurrentDocumentCount() > MAX_DOWNLOAD_FILES || query.getCurrentDocumentCount() <= 0 || !REFINERY_USER_AUTHENTICATED || ( showAnnotation && !allowAnnotationDownload ) ) {
				$("#" + button_id ).addClass( "disabled" );
				$("#" + button_id ).attr( "data-original-title", MESSAGE_DOWNLOAD_UNAVAILABE );
			} else {
				$("#" + button_id ).removeClass( "disabled" );		
				$("#" + button_id ).attr( "data-original-title", MESSAGE_DOWNLOAD_AVAILABLE );
			}
		}
		
		function updateIgvButton( button_id ) {
			if ( query.getCurrentDocumentCount() <= 0 ) {
				$("#" + button_id ).addClass( "disabled" );
			} else {
				$("#" + button_id ).removeClass( "disabled" );		
			}
		}
		
		// =====================================
		

		var client = new SolrClient( solrRoot,
			solrSelectEndpoint,
			"csrfMiddlewareToken",
			"django_ct:data_set_manager.node",
			"(study_uuid:" + currentAssayUuid + " AND assay_uuid:" + currentStudyUuid + ")",
			client_commands );

		/*
		var tableView = new SolrDocumentTable( "solr-table-view", "solrdoctab1", query, client, configurator, document_table_commands );
		tableView.setDocumentsPerPage( 20 );
		
		var facetView = new SolrFacetView( "solr-facet-view", "solrfacets1", query, configurator, facet_view_commands );
		var documentCountView = new SolrDocumentCountView( "solr-document-count-view", "solrcounts1", query, undefined );
		*/

		query_commands.addHandler( SOLR_QUERY_DESERIALIZED_COMMAND, function( arguments ){
			console.log( SOLR_QUERY_DESERIALIZED_COMMAND + ' executed' );
			console.log( query );
			
			query.setDocumentIndex( 0 );
			
			client.run( query, SOLR_FULL_QUERY );									
		});

		query_commands.addHandler( SOLR_QUERY_SERIALIZED_COMMAND, function( arguments ){
			console.log( SOLR_QUERY_SERIALIZED_COMMAND + ' executed' );
			
			// do nothing
		});


		client_commands.addHandler( SOLR_QUERY_INITIALIZED_COMMAND, function( arguments ){
			console.log( SOLR_QUERY_INITIALIZED_COMMAND + ' executed' );
			//console.log( query );
			
			tableView = new SolrDocumentTable( "solr-table-view", "solrdoctab1", query, client, configurator, document_table_commands );
			tableView.setDocumentsPerPage( 20 );
		
			facetView = new SolrFacetView( "solr-facet-view", "solrfacets1", query, configurator, facet_view_commands );
			documentCountView = new SolrDocumentCountView( "solr-document-count-view", "solrcounts1", query, undefined );
			
			pivotMatrixView = new SolrPivotMatrix( "solr-pivot-matrix", "solrpivot1", query, {}, pivotMatrixCommands );			

			// render pivot matrix upon activation of tab (otherwise the labels will be missing because their
			// width cannot be determined while the matrix is not visible (getBBox and getBoundingClientRect don't work)
			$('a[data-toggle="pill"]').on('shown', function (event) {			  
			  if ( event.target.href.split( "#" )[1] == "pivot-view-tab" ) {
			  	pivotMatrixView.render();
			  }
			})				
			
			query.setDocumentIndex( 0 );
			query.setDocumentCount( tableView.getDocumentsPerPage() );
								
			client.run( query, SOLR_FULL_QUERY );									
		});


		client_commands.addHandler( SOLR_QUERY_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_QUERY_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			tableView.render( arguments.response );
			facetView.render( arguments.response );
			documentCountView.render( arguments.response );
			pivotMatrixView.render( arguments.response );
			updateDownloadButton( "submitReposBtn" );
			updateIgvButton( "igv-multi-species" );	
		});
				
		document_table_commands.addHandler( SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );

			documentCountView.render( arguments.response );
			
			// update viewer buttons
			updateIgvButton( "igv-multi-species" );
				
			if ( REFINERY_REPOSITORY_MODE ) {
				updateDownloadButton( "submitReposBtn" );
			}			
		});

		document_table_commands.addHandler( SOLR_DOCUMENT_ORDER_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		document_table_commands.addHandler( SOLR_FIELD_VISIBILITY_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_FIELD_VISIBILITY_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		document_table_commands.addHandler( SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		document_table_commands.addHandler( SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND, function( arguments ){
			console.log( SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND + ' executed' );  				
			//console.log( arguments );

			client.run( query, SOLR_FULL_QUERY );
		});


		facet_view_commands.addHandler( SOLR_FACET_SELECTION_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_FACET_SELECTION_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		facet_view_commands.addHandler( SOLR_FACET_SELECTION_CLEARED_COMMAND, function( arguments ){
			console.log( SOLR_FACET_SELECTION_CLEARED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});


		facet_view_commands.addHandler( SOLR_FACET_SELECTION_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_FACET_SELECTION_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			query.clearDocumentSelection();
			query.setDocumentSelectionBlacklistMode( true );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		pivotMatrixCommands.addHandler( SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		pivotMatrixCommands.addHandler( SOLR_PIVOT_MATRIX_SELECTION_UPDATED_COMMAND, function( arguments ){
			console.log( SOLR_PIVOT_MATRIX_SELECTION_UPDATED_COMMAND + ' executed' );  				
			//console.log( arguments );
			
			client.run( query, SOLR_FULL_QUERY );
		});

		// ---------------------------
		// node set manager
		// ---------------------------
		nodeSetManager = new NodeSetManager( externalAssayUuid, externalStudyUuid, "node-set-manager-controls", REFINERY_API_BASE_URL, "{{ csrf_token }}" );
		nodeSetManager.initialize();
		
		nodeSetManager.setLoadSelectionCallback( function( nodeSet ) {
			query.deserialize( nodeSet.solr_query );						
		});
		
		nodeSetManager.setSaveSelectionCallback( function() {
			var solr_query = query.serialize();
			nodeSetManager.postState( "" + Date(), "Summary for Node Set", solr_query, query.getCurrentDocumentCount(), function(){
			});
		});
		
		// --------------
		// annotation
		// --------------
		$(".annotation-buttons button").click(function () {
		    if ( $(this).attr("id") == "annotation-button" ) {		    	
		    	dataQuery = query.clone();
		    	query = annotationQuery;
		    			    	 
		    	client.initialize( query, false );
		    }
		    else {		    	
		    	annotationQuery = query.clone();		    	
		    	query = dataQuery;		 
		    	   	 
				client.initialize( query, false );		
		    }    
			
			client.run( query, SOLR_FULL_QUERY );					
		});	

		client.initialize( query, true );		
	});

	
	configurator.getState( function() {
		// callback	
	});
	
});    		

	
// a list of facet names for the pivot view
var pivots = [];
var pivotMatrixData;


$(".collapse").collapse("show");



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
			+ " AND " + "(" + "type:" + nodeType + " OR " + "type: \"Derived Data File\"" + " OR " + "type: \"Array Data File\"" + " OR " + "type: \"Derived Array Data File\"" + " OR " + "type: \"Array Data Matrix File\"" + " OR " + "type: \"Derived Array Data Matrix File\"" + ")"
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
		
		console.log(facets);
		
		getData( studyUuid, assayUuid, nodeType )				
	} });	
}



function getData( studyUuid, assayUuid, nodeType, solr_query ) {
	
	var url = "";
	
	if ( typeof solr_query === 'undefined' ) {
		url = buildSolrQuery( studyUuid, assayUuid, nodeType, currentItemsPerPage * query.page, currentItemsPerPage, facets, fields, {}, showAnnotation, false );		
	}
	else {
		url = solr_query;
	}
		
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
				//processFacets( data );
				//processFields();
				//processDocs( data );
				//processPages( data );
				
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
	var solr_query = buildSolrQuery( studyUuid, assayUuid, nodeType, 0, query.total_items, {}, fieldSelection, {}, showAnnotation, false );
		
	$.ajax( { type: "GET", dataType: "jsonp", url: solr_query, success: function(data) {
		var fieldValues = [] 
				
		for ( var i = 0; i < data.response.docs.length; ++i ) {
			fieldValues.push( data.response.docs[i][field] );
	    }
	    
	    callback( fieldValues );					
	}});	
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
	// annotation files solr query -- DO NOT FILTER NODE SELECTION!!! (last parameter set to false, it is true by default) 
	var solr_annot = buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, {}, fields, {}, true, false );
	
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
