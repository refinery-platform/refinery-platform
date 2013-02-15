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



SolrDocumentTable = function( parentElementId, idPrefix, solrQuery, solrClient, configurator, commands ) {
  	
  	var self = this;
	
	// parent element for UI 
  	self.parentElementId = parentElementId;
  	
  	// id prefix for all DOM elements to create unique element ids
  	self.idPrefix = idPrefix;
  	
  	// Solr interaction 
  	self.query = solrQuery;
  	self.client = solrClient;
  	
  	// data set configuration
  	self.configurator = configurator;
  	
  	// wreqr commands
  	self._commands = commands;
  	
  	self.hiddenFieldNames = [ "uuid", "file_uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ]; // TODO: make these regexes;  	
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
	$( "#" + self.parentElementId ).html("");		
	self._renderTable( solrResponse );
	
	//$( "#" + self.parentElementId ).html( code );		
	
	// attach event listeners
	// ..
};

SolrDocumentTable.prototype._renderTable = function( solrResponse ) {
	
	var self = this;
	
	var tableHead = self._generateTableHead( solrResponse );
	var tableBody = self._generateTableBody( solrResponse );
	
	$('<table/>', {	
		'class': 'table table-striped table-condensed',
		'id': 'table_matrix',
		'html': tableHead + "<tbody>" + tableBody + "</tbody>"
	}).appendTo('#' + self.parentElementId );
	
	// attach events
	$( ".field-header-sort" ).on( "click", function( event ) {
		var fieldName = $( event.target ).data( "fieldname" );
		self.query.toggleFieldDirection( fieldName );
		
		self._commands.execute( SOLR_DOCUMENT_ORDER_UPDATED_COMMAND, { 'fieldname': fieldName } );		
	});
	
	
	$( ".document-checkbox-select" ).on( "click", function( event ) {				
		var uuid = $( event.target ).data( "uuid" );		
		var uuidIndex = self.query._documentSelection.indexOf( uuid );
		
		var event = ""
		
		if ( uuidIndex != -1 ) {
			// remove element
			self.query._documentSelection.splice( uuidIndex, 1 );
			event = 'remove'; 			
		}
		else {
			// add element
			self.query._documentSelection.push( uuid );
			event = 'add';
		}

		self._commands.execute( SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND, { 'uuid': uuid, 'event': event } );		
	});	
		
}
	
	
SolrDocumentTable.prototype._generateTableBody = function( solrResponse ) {
	var self = this;	
	var documents = solrResponse.getDocumentList();
	var fields = self.query._fields;
	var rows = [];
	
	for ( var i = 0; i < documents.length; ++i ) {		
		var document = documents[i];
		
		var s = "<tr>";
		
		var isDocumentSelected = self.query.isDocumentSelected( document.uuid );
				
		s += '<td><label><input class="document-checkbox-select" data-uuid="' + document["uuid"] + '" type=\"checkbox\" ' + ( isDocumentSelected ? "checked" : "" ) + '></label>' + '</td>';							

		for ( entry in fields ) {
			if ( fields.hasOwnProperty( entry ) && fields[entry].isVisible && !fields[entry].isInternal  && !( self.hiddenFieldNames.indexOf( entry ) >= 0 ) ) {				
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
	var fields = self.query._fields;
	
	row.push( '<th align="left" width="0" id="node-selection-column-header"></th>' );	
		
	for ( entry in fields ) {
		if ( fields.hasOwnProperty( entry ) && fields[entry].isVisible && !fields[entry].isInternal && !( self.hiddenFieldNames.indexOf( entry ) >= 0 ) ) {
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


SolrDocumentTable.prototype._composeFieldId = function( field ) {	
	var self = this;
	
	return ( self.idPrefix + "___" + "field" + "___" + field );
}


SolrDocumentTable.prototype._decomposeFieldId = function( fieldId ) {	
	var self = this;
		
	return ( { field: fieldId.split( "___" )[2] } );
}






