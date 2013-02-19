/*
 * data_set_solr_query.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * Provides a class to store components of Refinery Solr queries and to generate the actual queries. 
 */


/*
 * Dependencies:
 * solr_utilities.js
 */


// constants	
SOLR_DOCUMENT_QUERY = 1;
SOLR_FACET_QUERY = 2;
SOLR_FILTER_QUERY = 4;
SOLR_FIELD_QUERY = 8;
SOLR_SORT_QUERY = 16;
SOLR_PIVOT_QUERY = 32;

SOLR_SELECTION_QUERY =
	SOLR_DOCUMENT_QUERY |
	SOLR_FACET_QUERY |
	SOLR_FILTER_QUERY;

SOLR_FULL_QUERY =
	SOLR_DOCUMENT_QUERY |
	SOLR_FACET_QUERY |
	SOLR_FILTER_QUERY |
	SOLR_FIELD_QUERY |
	SOLR_SORT_QUERY |
	SOLR_PIVOT_QUERY; 

SOLR_QUERY_SELECTION_SERIALIZATION = 1;


SolrQuery = function( configurator, commands ) {
	
  	var self = this;
  	
  	// query configurator: exposed fields, internal fields, facet fields (see AttributeOrder in DataSetManager)
  	self._configurator = configurator;

	// -------------------------------------------------------------- 
  	// selection
	// -------------------------------------------------------------- 
	self._facetSelection = {};
	/* Data Structure
	 * facets =  { 
	 *   "facet": [ { value: "value_name", count: "count", isSelected: false }, ... ] },
	 *  } 
	 */
	
	// apply field filters for fields that are not exposed as facets
	self._filterSelection = {};
	/*
	 * Data Structure:
	 * 	filters = { fieldname: [ allowed_value1, .., allowed_], ... }
	 */

	// fine-grained selection on top of the facet selection (a list of nodes)
	self._documentSelection = [];
	// if true, the nodeSelection list is to be subtracted from the Solr query results (blacklist)
	// if false, the nodeSelection list is to be used instead of the Solr query results (whitelist)
	self._documentSelectionBlacklistMode = true;
	
	// --------------------------------------------------------------
	// facets
	// --------------------------------------------------------------
	self._facetSort = "count";
	self._facetLimit = "1";

	// -------------------------------------------------------------- 
  	// field visibility and sorting
	// --------------------------------------------------------------
	// depends on table etc. 
	//self._hiddenFieldNames = [ "uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ];
	self._ignoredFieldNames = [ "django_ct", "django_id", "id" ];
	
	self._fields = {};
	/* Data Structure
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
	
	// -------------------------------------------------------------- 
  	// pivots
	// -------------------------------------------------------------- 	
	// a list of facet names for the pivot view
	self._pivots = [];
	
	self._totalDocumentCount = undefined;
	self._currentDocumentCount = undefined;
	
	self._firstDocument = 0;
	self._lastDocument = self._firstDocument + 10;	
	
	// wreqr commands object
	self._commands = commands;	
};	


SolrQuery.prototype.initialize = function () {
	var self = this;	

	var defaultSortFieldFound = false;
		
	for ( var i = 0; i < self._configurator.state.objects.length; ++i ) {
		var attribute = self._configurator.state.objects[i];
		
		if ( attribute.is_facet && attribute.is_exposed && !attribute.is_internal ) {
			self.addFacet( attribute.solr_field );
		}											
											
		// fields
		if ( self._ignoredFieldNames.indexOf( attribute.solr_field ) < 0 ) {
			if ( attribute.is_internal ) {
					self.addField( attribute.solr_field, false, true, "" );					
			}
			else {
				if ( attribute.is_exposed && attribute.is_active ) {
					
					if ( !defaultSortFieldFound ) {
						self.addField( attribute.solr_field, true, false, "asc" );					
						defaultSortFieldFound = true;
					}
					else {
						self.addField( attribute.solr_field, true, false, "" );
					}
				}
				else {
					if ( attribute.is_exposed && !attribute.is_active ) {
						self.addField( attribute.solr_field, false, false, "" );					
					}					
				}
			}					
		}
	}
	 
	return self;
};


SolrQuery.prototype.create = function ( queryComponents ) {
		
	var self = this;
	var url = "";
	
	if ( queryComponents & SOLR_DOCUMENT_QUERY ) {
		url += self._createDocumentSelectionComponent();		
	}

	if ( queryComponents & SOLR_FILTER_QUERY ) {
		url += self._createFilterSelectionComponent();
	}

	if ( queryComponents & SOLR_FACET_QUERY ) {
		url += self._createFacetComponent();		
	}

	if ( queryComponents & SOLR_FIELD_QUERY ) {
		url += self._createFieldComponent();		
	}

	if ( queryComponents & SOLR_SORT_QUERY ) {
		url += self._createSortComponent();
	}

	if ( queryComponents & SOLR_PIVOT_QUERY ) {
		url += self._createPivotComponent();
	}
		
	return ( url );
};


SolrQuery.prototype._createFilterSelectionComponent = function () {
	
	var self = this;
	
	var url = "";
	
	// apply field filter (= only allow predefined values for certain fields)
	for ( var field in self._filterSelection ) {
		if ( self._filterSelection.hasOwnProperty( field ) ) {
			url += "&" + "fq=";
			
			if ( $.isArray( self._filterSelection[field] ) ) {
				url += field + ":" + "(" + self._filterSelection[field].join( " OR " ) + ")";				
			}
			else {
				url += field + ":" + self._filterSelection[field];								
			}			
		}
	}	
	
	return url;	
};


SolrQuery.prototype._createDocumentSelectionComponent = function () {	
	
	var self = this;
	
	var url = "";
	
	var documentSelectionFilter;
		
	if ( self._documentSelection.length > 0 ) {
		documentSelectionFilter = ( self._documentSelectionBlacklistMode ? "-" : "" ) + "uuid:" + "(" + self._documentSelection.join( " OR " ) +  ")"; 
	}  
	else {
		documentSelectionFilter = "uuid:*";
	}

	url += "&" + "fq=" + documentSelectionFilter;  	
	
	return url;
};
	
	
SolrQuery.prototype._createFacetComponent = function () {
	
	var self = this;

	var url = "";
	
	url +=  "&" + "facet.sort=count" // sort by count, change to "index" to sort by index	   	
	   	  + "&" + "facet.limit=-1" // unlimited number of facet values (otherwise some values will be missing)
	   	  + "&" + "facet=true"; // request facet counts	   	
	   	  	
	// ------------------------------------------------------------------------------
	// selecting facets: facet.field, fq 	
	// ------------------------------------------------------------------------------
	
	for ( var facet in self._facetSelection ) {
		var facetValues = self._facetSelection[facet];
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
		
		if ( self._facetSelection.hasOwnProperty( facet ) )
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
};


SolrQuery.prototype._createFieldComponent = function () {
	
	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// selecting fields: fl 
	// ------------------------------------------------------------------------------
	
	var fieldNames = [];
	for ( var field in self._fields ) {
		if ( self._fields.hasOwnProperty( field ) )
		{			
			if ( self._fields[field].isVisible || self._fields[field].isInternal ) {				
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
};


SolrQuery.prototype._createSortComponent = function () {

	var self = this;
	
	var url = "";
	
	// ------------------------------------------------------------------------------
	// sorting by field: sort
	// ------------------------------------------------------------------------------
 
	for ( var field in self._fields ) {
		if ( self._fields.hasOwnProperty( field ) ) {
			// only sort on visible fields			
			if ( self._fields[field].isVisible ) {
				if ( ( self._fields[field].direction === "asc" ) || ( self._fields[field].direction === "desc" ) ) {
					var direction = self._fields[field].direction;  				
					
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
};


SolrQuery.prototype._createPivotComponent = function () {

	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// pivot fields: facet.pivot 
	// ------------------------------------------------------------------------------
	if ( self._pivots.length > 1 ) {
		var pivotQuery = self._pivots.join( "," );

		if ( pivotQuery.length > 0 ) {
			url += "&facet.pivot=" + pivotQuery;
		}		
	}		

	return url;
};


// returns true if any facets were cleared, otherwise false
SolrQuery.prototype.clearFacetSelection = function () {

	var self = this;

	var counter = 0;
	
	for ( var facet in self._facetSelection ) {
		if ( self._facetSelection.hasOwnProperty( facet ) ) {
			for ( var facetValue in self._facetSelection[facet] ) {
				if ( self._facetSelection[facet].hasOwnProperty( facetValue ) ) {
					if ( self._facetSelection[facet][facetValue].isSelected ) {
						self._facetSelection[facet][facetValue].isSelected = false;
						++counter;
					}					
				}
			}				
		}
	}
	
	return counter > 0;
};


// returns true if any nodes were cleared, otherwise false
SolrQuery.prototype.clearDocumentSelection = function () {

	var self = this;
	
	if ( self._documentSelection.length > 0 )
	{
		self._documentSelection = [];
		self._documentSelectionBlacklistMode = true;
		
		return true;
	}
	
	return false;
};


// returns true if any filters were cleared, otherwise false
SolrQuery.prototype.clearFilterSelection = function () {

	var self = this;

	var counter = 0;
	
	for ( var filter in self._filterSelection ) {
		if ( self._filterSelection.hasOwnProperty( filter ) ) {
			delete self._filterSelection.filter;
			++counter;
		}
	}
	
	return counter > 0;
};


SolrQuery.prototype.clearAll = function() {
	
	var self = this;
	
	return self.clearNodes() || self.clearNodeSelection() || self.clearFilterSelection();
};


SolrQuery.prototype.isDocumentSelected = function ( uuid ) {
	
	var self = this;
	
	if ( self._documentSelection.length == 0  && self._documentSelectionBlacklistMode ) {
		return true;
	}
	
	return ( self._documentSelection.indexOf( uuid ) >= 0 && !self._documentSelectionBlacklistMode );	
}


SolrQuery.prototype.serialize = function ( mode ) {
	
	var self = this;
	mode = typeof mode !== 'undefined' ? mode : SOLR_QUERY_SELECTION_SERIALIZATION;			
	
	var serializedQuery = {};
	
	if ( mode == SOLR_QUERY_SELECTION_SERIALIZATION ) {
		serializedQuery["facetSelection"] = self._facetSelection;
		serializedQuery["filterSelection"] = self._filterSelection;
		serializedQuery["documentSelection"] = self._documentSelection;
		serializedQuery["documentSelectionBlacklistMode"] = self._documentSelectionBlacklistMode;	
	}
	else {
		// TODO: implement full serialization
	}
		
	return JSON.stringify( serializedQuery );
};


SolrQuery.prototype.deserialize = function ( serializedQuery ) {
	var self = this;

	var deserializedQuery = JSON.parse( serializedQuery );
	
	if ( deserializedQuery.hasOwnProperty( "facetSelection" ) ) {
		self._facetSelection = deserializedQuery["facetSelection"];
	}

	if ( deserializedQuery.hasOwnProperty( "filterSelection" ) ) {
		self._filterSelection = deserializedQuery["filterSelection"];
	}

	if ( deserializedQuery.hasOwnProperty( "documentSelection" ) ) {
		self._documentelection = deserializedQuery["documentSelection"];
	}

	if ( deserializedQuery.hasOwnProperty( "documentSelectionBlacklistMode" ) ) {
		self._documentSelectionBlacklistMode = deserializedQuery["documentSelectionBlacklistMode"];
	}
	
	return deserializedQuery;
};


SolrQuery.prototype.addFacet = function ( name ) {
	
	var self = this;
	
	// initialize facet
	self._facetSelection[name] = [];
};


SolrQuery.prototype.updateFacetSelection = function ( name, value, isSelected ) {
	
	var self = this;
	
	isSelected = typeof isSelected !== 'undefined' ? isSelected : false;			
		
	self._facetSelection[name][value] = { isSelected: isSelected };
	
	return self;	
};


SolrQuery.prototype.isSelectedFacet = function ( name, value ) {
	
	var self = this;

	return self._facetSelection[name][value].isSelected;	
};


SolrQuery.prototype.getFacetNames = function ( isVisible ) {
	
	var self = this;
	
	var facetNames = [];

	for ( facet in self._facetSelection ) {
		if ( self._facetSelection.hasOwnProperty( facet ) ) {
			if ( !self._facetSelection[facet].isInternal ) {	
				if ( typeof isVisible !== 'undefined' ) {
					facetNames.push( facet );
				}	
				else {
					if ( facets[facet].isVisible == isVisible ) {
						facetNames.push( facet );
					}
				}
			}
		}
	}
		
	return facetNames;
};


SolrQuery.prototype.toggleFacetSelection = function ( name, value ) {
	
	var self = this;
	
	self._facetSelection[name][value].isSelected = !self._facetSelection[name][value].isSelected;
	
	return self;
};


SolrQuery.prototype.addFilter = function ( field, values ) {
	
	var self = this;

	values = typeof values !== 'undefined' ? values : [];
	
	self._filterSelection[field] = values;
	
	return self;
};


SolrQuery.prototype.removeFilter = function ( field ) {
	
	var self = this;

	if ( self._filterSelection.hasOwnProperty( field ) ) {
		delete self._filterSelection.filter;
		++counter;
	}
};


SolrQuery.prototype.getFilter = function ( field ) {
	
	var self = this;

	return self._filterSelection[field];
};



SolrQuery.prototype.addField = function ( name, isVisible, isInternal, direction ) {
	
	var self = this;

	self.updateField( name, isVisible, isInternal, direction );
	
	return self;	
};


SolrQuery.prototype.updateField = function ( name, isVisible, isInternal, direction ) {
	
	var self = this;
	
	isVisible = typeof isVisible !== 'undefined' ? isVisible : true;			
	isInternal = typeof isInternal !== 'undefined' ? isInternal : false;			
	direction = typeof direction !== 'undefined' ? direction : "";			
		
	self._fields[name] = { isVisible: isVisible, isInternal: isInternal, direction: direction };	

	return self;
};


SolrQuery.prototype.getFieldNames = function ( isVisible ) {
	
	var self = this;
	
	var fieldNames = [];

	for ( field in self._fields ) {
		if ( self._fields.hasOwnProperty( field ) ) {
			if ( !self._fields[field].isInternal ) {	
				if ( typeof isVisible !== 'undefined' ) {
					fieldNames.push( field );
				}	
				else {
					if ( fields[field].isVisible == isVisible ) {
						fieldNames.push( field );
					}
				}
			}
		}
	}
		
	return fieldNames;
};


SolrQuery.prototype._clearFieldDirections = function() {
	var self = this;
	
	for ( field in self._fields ) {
		if ( self._fields.hasOwnProperty( field ) ) {
			self._fields[field].direction = "";
		}
	}
}


SolrQuery.prototype.toggleFieldDirection = function( name ) {
	
	var self = this;
	
	console.log( name );
	
	console.log( self._fields );
		
	if ( self._fields[name].direction === "asc" ) {
		self._clearFieldDirections();
		self._fields[name].direction = "desc";
	}	
	else if ( self._fields[name].direction === "desc" ) {
		self._clearFieldDirections();
		self._fields[name].direction = "asc";
	}
	else {
		self._clearFieldDirections();
		self._fields[name].direction = "asc";		
	}
	
	return self;
};


SolrQuery.prototype.toggleFieldVisibility = function( name ) {
	
	var self = this;
	
	self._fields[name].isVisible = !self._fields[name].isVisible;
	
	return self;
};


SolrQuery.prototype.setTotalDocumentCount = function( documentCount ) {
	
	var self = this;
	
    self._totalDocumentCount = documentCount;
    
    return self; 
};


SolrQuery.prototype.getTotalDocumentCount = function() {
	
	var self = this;
	
    return self._totalDocumentCount; 
};


SolrQuery.prototype.setCurrentDocumentCount = function( documentCount ) {
	
	var self = this;
	
    self._currentDocumentCount = documentCount;
    
    return self; 
};


SolrQuery.prototype.getCurrentDocumentCount = function() {
	
	var self = this;
	
    return ( self._documentSelectionBlacklistMode ? self._currentDocumentCount - self._documentSelection.length : self._documentSelection.length ); 
};


SolrQuery.prototype.setFirstDocument = function( document ) {
	
	var self = this;
	
    self._firstDocument = document;
    
    return self; 
};


SolrQuery.prototype.getFirstDocument = function() {
	
	var self = this;
	
    return self._firstDocument; 
};



SolrQuery.prototype.setLastDocument = function( document ) {
	
	var self = this;
	
    self._lastDocument = document;
    
    return self; 
};


SolrQuery.prototype.getLastDocument = function() {
	
	var self = this;
	
    return self._lastDocument; 
};


