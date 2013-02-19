/*
 * solr_document_table.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * A table viewer that operates on a DataSetSolrQuery. 
 */


/*
 * Dependencies:
 * - JQuery
 * - DataSetSolrQuery
 * - SolrSelectClient
 */

SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND = 'solr_document_selection_updated';
SOLR_DOCUMENT_ORDER_UPDATED_COMMAND = 'solr_document_order_updated';
SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND = 'solr_document_count_per_page_updated';
SOLR_FIELD_VISIBILITY_UPDATED_COMMAND = 'solr_field_visibility_updated';
SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND = 'solr_document_table_page_changed_command';


SolrDocumentTable = function( parentElementId, idPrefix, solrQuery, solrClient, configurator, commands ) {
  	
  	var self = this;
	
	// parent element for UI 
  	self._parentElementId = parentElementId;
  	
  	// id prefix for all DOM elements to create unique element ids
  	self._idPrefix = idPrefix;
  	
  	// Solr interaction 
  	self._query = solrQuery;
  	self._client = solrClient;
  	
  	// data set configuration
  	self.configurator = configurator;
  	
  	// wreqr commands
  	self._commands = commands;
  	
  	self._documentsPerPage = 10;
  	
  	self._hiddenFieldNames = [ "uuid", "file_uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ]; // TODO: make these regexes;  	
};	
	
	
SolrDocumentTable.prototype.initialize = function() {
	var self = this;

	return this;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
SolrDocumentTable.prototype.render = function ( solrResponse ) {
	var self = this;
	
	// clear parent element
	$( "#" + self._parentElementId ).html("");		
	self._renderTable( solrResponse );
	
	//$( "#" + self._parentElementId ).html( code );		
	
	// attach event listeners
	// ..
};


SolrDocumentTable.prototype._renderTable = function( solrResponse ) {
	
	var self = this;
	
	var tableHead = self._generateTableHead( solrResponse );
	var tableBody = self._generateTableBody( solrResponse );
	
	var topControlsId = self._idPrefix + '-top-controls';
	var bottomControlsId = self._idPrefix + '-bottom-controls';
	var documentsPerPageControlId = topControlsId + '-documents-per-page'; 
	var visibleFieldsControlId = topControlsId + '-visible-fields';
	var pagerControlId = bottomControlsId + '-pager'; 
	
	$('<div/>', {	
		'class': '',
		'id': topControlsId,
		'html': ''
	}).appendTo( '#' + self._parentElementId );

	$('<span/>', {	
		'class': 'dropdown',
		'id': visibleFieldsControlId,
		'html': ''
	}).appendTo( '#' + topControlsId );

	self._generateVisibleFieldsControl( visibleFieldsControlId );	

	$('<span/>', {	
		'class': 'btn-group',
		'id': documentsPerPageControlId,
		'html': '',
		'data-toggle': 'buttons-radio',
		'style': 'margin-left: 15px;'
	}).appendTo( '#' + topControlsId );
	
	self._generateDocumentsPerPageControl( documentsPerPageControlId, [ 10, 20, 50, 100, 500 ] );	
	 	
	$('<table/>', {	
		'class': 'table table-striped table-condensed',
		'id': 'table_matrix',
		'html': tableHead + "<tbody>" + tableBody + "</tbody>"
	}).appendTo( '#' + self._parentElementId );

	$('<div/>', {	
		'class': '',
		'id': bottomControlsId,
		'html': ''
	}).appendTo( '#' + self._parentElementId );


	$('<div/>', {	
		'class': 'dropdown',
		'id': pagerControlId,
		'html': ''
	}).appendTo( '#' + bottomControlsId );

	self._generatePagerControl( pagerControlId, 5, 2, 2 );	
	
	// attach events
	$( ".field-header-sort" ).on( "click", function( event ) {
		var fieldName = $( event.target ).data( "fieldname" );
		self._query.toggleFieldDirection( fieldName );
		
		self._commands.execute( SOLR_DOCUMENT_ORDER_UPDATED_COMMAND, { 'fieldname': fieldName } );		
	});
	
	
	$( ".document-checkbox-select" ).on( "click", function( event ) {				
		var uuid = $( event.target ).data( "uuid" );		
		var uuidIndex = self._query._documentSelection.indexOf( uuid );
		
		var event = ""
		
		if ( uuidIndex != -1 ) {
			// remove element
			self._query._documentSelection.splice( uuidIndex, 1 );
			event = 'remove'; 			
		}
		else {
			// add element
			self._query._documentSelection.push( uuid );
			event = 'add';
		}

		self._commands.execute( SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND, { 'uuid': uuid, 'event': event } );		
	});	
		
}
	
	
SolrDocumentTable.prototype._generateTableBody = function( solrResponse ) {
	var self = this;	
	var documents = solrResponse.getDocumentList();
	var fields = self._query._fields;
	var rows = [];
	
	for ( var i = 0; i < documents.length; ++i ) {		
		var document = documents[i];
		
		var s = "<tr>";
		
		var isDocumentSelected = self._query.isDocumentSelected( document.uuid );
				
		s += '<td><label><input class="document-checkbox-select" data-uuid="' + document["uuid"] + '" type=\"checkbox\" ' + ( isDocumentSelected ? "checked" : "" ) + '></label>' + '</td>';							

		for ( entry in fields ) {
			if ( fields.hasOwnProperty( entry ) && fields[entry].isVisible && !fields[entry].isInternal  && !( self._hiddenFieldNames.indexOf( entry ) >= 0 ) ) {				
				if ( document.hasOwnProperty( entry ) ) {
					s += "<td>";
					s += document[entry];
					s += "</td>";				
				}
				else { // this field does not exist in this result
					s += "<td>";
					s += ""
					s += "</td>";								
				}				
			}
		}
		s += "</tr>";
		rows.push( s );
    }	
		
	return rows.join('\n');
}


SolrDocumentTable.prototype._generateTableHead = function( solrResponse ) {	
	var self = this;	
	var row = [];	
	var fields = self._query._fields;
	
	row.push( '<th align="left" width="0" id="node-selection-column-header"></th>' );	
		
	for ( entry in fields ) {
		if ( fields.hasOwnProperty( entry ) && fields[entry].isVisible && !fields[entry].isInternal && !( self._hiddenFieldNames.indexOf( entry ) >= 0 ) ) {
			if ( fields[entry].direction === "asc" ) {
				row.push('<th align=left class="field-header-sort" data-fieldname="' + entry + '"><i class="icon-arrow-down"></i>&nbsp;' + prettifySolrFieldName( entry, true ) + '</th>' );				
			} else if ( fields[entry].direction === "desc" ) {
				row.push('<th align=left class="field-header-sort" data-fieldname="' + entry + '"><i class="icon-arrow-up"></i>&nbsp;' + prettifySolrFieldName( entry, true ) + '</th>' );				
			} else {
				row.push('<th align=left class="field-header-sort" data-fieldname="' + entry + '">' + prettifySolrFieldName( entry, true ) + '</th>' );				
			}
		}
	}

	return "<thead><tr>" + row.join("") + "</tr></thead>";	
}


SolrDocumentTable.prototype._generateDocumentsPerPageControl = function( parentElementId, options ) {
	
	var self = this;
   	
   	$( "#" + parentElementId ).html("");
   	
   	for ( var i = 0; i < options.length; ++i ) {
   		if ( options[i] == self._documentsPerPage ) {
			$( "#" + parentElementId ).append(
				'<button type="button" data-documents="' + options[i] + '" data-toggle="button" class="btn btn-mini active" rel="tooltip" data-placement="bottom" data-html="true" title="View ' + options[i] + ' rows per page">' + options[i] + '</button>' );   			
   		}
   		else {
			$( "#" + parentElementId ).append(
				'<button type="button" data-documents="' + options[i] + '" data-toggle="button" class="btn btn-mini" rel="tooltip" data-placement="bottom" data-html="true" title="View ' + options[i] + ' rows per page">' + options[i] + '</button>' );   			   			
   		}
   	}
   	
   	$( "#" + parentElementId ).children().click( function(event) {
   		if ( self._documentsPerPage != $(this).data( "documents" ) ) {
	   		self._documentsPerPage = $(this).data( "documents" );
	   		
	   		self._query.setLastDocument( Math.min( self._query.getFirstDocument() + self._documentsPerPage, self._query.getTotalDocumentCount() ) ); 
	   		
			self._commands.execute( SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND, { 'documents_per_page': self._documents_per_page } );			   		
   		}
   	});	
}


SolrDocumentTable.prototype._generateVisibleFieldsControl = function( parentElementId ) {

	var self = this;
	
	var visibleItems = []
	var invisibleItems = []
	
	var fields = self._query._fields;
	
	for ( entry in fields ) {
		if ( fields.hasOwnProperty( entry ) ) {
			if ( fields[entry].isVisible && !fields[entry].isInternal ) {
				visibleItems.push("<a class=\"field-name\" label id=\"" + self._composeFieldId( entry ) + "\">" + '<label class="checkbox"><input type="checkbox" checked></label>' + "&nbsp;" + prettifySolrFieldName( entry, true ) + "</a>" );				
			}
			else {
				if ( self._hiddenFieldNames.indexOf( entry ) < 0 && !fields[entry].isInternal ) {
					visibleItems.push("<a class=\"field-name\" label id=\"" + self._composeFieldId( entry ) + "\">"  + '<label class="checkbox"><input type="checkbox"></label>' +  "&nbsp;" + prettifySolrFieldName( entry, true ) + "</a>" );
				}
			}
		}
	}

   	$( "#" + parentElementId ).html( "" );
	var listHeader = '<a href="#" class="dropdown-toggle btn btn-mini btn-default" data-toggle="dropdown"><i class="icon-wrench"></i>&nbsp;Columns&nbsp;<i class="icon-caret-down"></i></a>';
   	var listId = parentElementId + "-list";  
   	
	if ( visibleItems.length > 0 ) {
		var listItems = [];
		for ( var i = 0; i < visibleItems.length; ++i ) {
			listItems.push( "<li>" + visibleItems[i] + "</li>" );			
		}
		
		$( "#" + parentElementId ).append( listHeader + '<ul id="' + listId + '" class="dropdown-menu" role="menu" aria-labelledby="dLabel">' + listItems.join( "\n" ) + '</ul>' );
	}	
	
	// configure columns
   	$( "#" + listId ).children().click( function(event) {
   		event.stopPropagation();
   		
   		var fieldId = event.target.id;
   		var field = self._decomposeFieldId( fieldId ).field;
   		
   		self._query._fields[field].isVisible = !self._query._fields[field].isVisible;   		
		self._commands.execute( SOLR_FIELD_VISIBILITY_UPDATED_COMMAND, { 'field': field, 'isVisible': self._query._fields[field].isVisible } );			   		
   	} );				
}


SolrDocumentTable.prototype._generatePagerControl = function( parentElementId, visiblePages, padLower, padUpper ) {
	
	var self = this;
   	
   	$( "#" + parentElementId ).html("");
   	
	var availablePages = Math.max( 0, Math.ceil( self._query.getCurrentDocumentCount()/self._documentsPerPage ) - 1 );
	var currentPage = Math.floor( self._query.getFirstDocument()/self._documentsPerPage );
	
	console.log( "ap: " + availablePages + "  cp: " + currentPage );	

	if ( currentPage > availablePages ) {
		currentPage = availablePages;
	}
	
	if ( availablePages < visiblePages ) {
		if ( currentPage < padLower ) {
			padUpper = padUpper + padLower;  
			padLower = currentPage;
			padUpper = padUpper - padLower;  		
		}
	}  	
	else if ( currentPage < padLower ) {
		padUpper = padUpper + padLower;  
		padLower = currentPage;
		padUpper = padUpper - padLower;  		
	}  
	else if ( currentPage > availablePages - padLower ) {
		padLower = padLower + padUpper - ( availablePages - currentPage );  
		padUpper = availablePages - currentPage;
	}  

	
	var items = [];
		
	if ( currentPage == 0 ) {
		items.push( "<li class=\"disabled\"><a>&laquo;</a></li>" );						
	}
	else {
		items.push( "<li><a href=\"#\" id=\"page-first\">&laquo;</a></li>" );		
	}
	
	for ( var i = currentPage - padLower; i <= currentPage + padUpper; ++i ) {
		if ( i == currentPage ) {
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
	
	if ( currentPage == availablePages ) {
		items.push( "<li class=\"disabled\"><a>&raquo;</a></li>" );						
	} 
	else {
		items.push( "<li><a href=\"#\" id=\"page-last\">&raquo;</a></li>")					
	}
	
	
    $( "#" + parentElementId ).html("");
    	
	$('<div/>', { 'class': "pagination", html: "<ul>" + items.join('') + "</ul>" }).appendTo( "#" + parentElementId );

	$( "[id^=page-]" ).on( "click", function() {
		
		page = this.id.split( "-" )[1];
		
		if ( page === "first" ) {
			currentPage = 0;			
		} else if ( page === "last" ) {
			currentPage = availablePages;						
		} else {
			currentPage = page - 1;			
		}
		
		self._query.setFirstDocument( currentPage * self._documentsPerPage );
		self._query.setLastDocument( ( currentPage + 1 ) * self._documentsPerPage  );
				
		self._commands.execute( SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND, { 'page': currentPage } );			   				 							  
	});
   	
   	
}




SolrDocumentTable.prototype._composeFieldId = function( field ) {	
	var self = this;
	
	return ( self._idPrefix + "___" + "field" + "___" + field );
}


SolrDocumentTable.prototype._decomposeFieldId = function( fieldId ) {	
	var self = this;
		
	return ( { field: fieldId.split( "___" )[2] } );
}






