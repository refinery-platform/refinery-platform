/*
 * data_set_solr_table.js
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


SolrDocumentTable = function( parentElementId, idPrefix, solrQuery, solrClient, configurator ) {
  	
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
	
	var code = "Documents = " + solrResponse.getDocumentList().length;
	
	console.log( solrResponse.getDocumentList() );
	
	self._renderTable( solrResponse );
	
	//$( "#" + self.parentElementId ).html( code );		
	
	// attach event listeners
	// ..
};

SolrDocumentTable.prototype._renderTable = function( solrResponse ) {
	
	var self = this;
	
	var tableHead = self._generateTableHead( solrResponse );
	var tableBody = self._generateTableBody( solrResponse );
	
	console.log( "th" + tableHead );	

	$('<table/>', {	
		'class': 'table table-striped table-condensed',
		'id': 'table_matrix',
		'html': tableHead + "<tbody>" + tableBody + "</tbody>"
	}).appendTo('#' + self.parentElementId );	
}
	
	
SolrDocumentTable.prototype._generateTableBody = function( solrResponse ) {
	
	var self = this;
	
	var documents = solrResponse.getDocumentList();
	var fields = self.query._fields; //solrResponse.getFieldList();
	
	var rows = [];
	
	for ( var i = 0; i < documents.length; ++i ) {		
		var document = documents[i];
		
		var s = "<tr>";
		
		var isDocumentSelected = self.query.isDocumentSelected( document.uuid ); 
		
		s += '<td><label><input id="document_' + document.uuid + '" data-uuid="' + document.uuid + '" class="document-selection-checkbox" type=\"checkbox\" ' + ( isDocumentSelected ? "checked" : "" ) + '></label>' + '</td>';							

		for ( entry in fields )
		{
			if ( fields.hasOwnProperty( entry ) && fields[entry].isVisible && !fields[entry].isInternal ) {
				if ( document.hasOwnProperty( entry ) ) //&& !( hiddenFieldNames.indexOf( entry ) >= 0 ) )
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
		rows.push( s );
    }	
		
	return rows.join('\n');
}


SolrDocumentTable.prototype._generateTableHead = function( solrResponse ) {
	
	var self = this;
	
	var row = [];
	
	var fields = self.query._fields;
	
	console.log( fields );

	row.push( '<th align="left" width="0" id="node-selection-column-header"></th>' );	
		
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			if ( fields[field].isVisible ) {
				if ( fields[field].direction === "asc" ) {
					row.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\"><i class=\"icon-arrow-down\">&nbsp;" + prettifySolrFieldName( field, true ) + "</th>" );				
				} else if ( fields[field].direction === "desc" ) {
					row.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\"><i class=\"icon-arrow-up\">&nbsp;" + prettifySolrFieldName( field, true ) + "</th>" );				
				} else {
					row.push("<th align=left id=\"" + composeFieldNameId( field + "___header" ) + "\">" + prettifySolrFieldName( field, true ) + "</th>" );									
				}
			}
		}
	}

	return "<thead><tr>" + row.join("") + "</tr></thead>";	
}
