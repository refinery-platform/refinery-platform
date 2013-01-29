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
 * 
 */

// constants	
DATA_SET_NODE_TYPE_QUERY = 1;
DATA_SET_NODE_SELECTION_QUERY = 2;
DATA_SET_FACET_QUERY = 4;
DATA_SET_FIELD_QUERY = 8;
DATA_SET_SORT_QUERY = 16;
DATA_SET_PIVOT_QUERY = 32;

DATA_SET_FULL_QUERY =
	DATA_SET_NODE_TYPE_QUERY | 
	DATA_SET_NODE_SELECTION_QUERY |
	DATA_SET_FACET_QUERY |
	DATA_SET_FIELD_QUERY |
	DATA_SET_SORT_QUERY |
	DATA_SET_PIVOT_QUERY; 

DATA_SET_INITIALIZATION_QUERY = DATA_SET_NODE_TYPE_QUERY; 

DATA_SET_QUERY_NODE_SET_SERIALIZATION = 1;


DataSetSolrQuery = function( studyUuid, assayUuid, nodeTypes ) {
	
  	var self = this;
  	
  	// base query
  	self.baseQuery = "q=django_ct:data_set_manager.node";
	
	self.baseSettings = "wt=json&json.wrf=?&facet=true";
  
  	
  	// data set details
  	self.studyUuid = studyUuid;
  	self.assayUuid = assayUuid;
  	
  	// list of nodes to retrieve (e.g. "Raw Data File", "Derived Array File", etc.)
  	self.nodeTypes = nodeTypes;
  	
  	// work on annotation or data
  	self.annotation = false;
  	
	// -------------------------------------------------------------- 
  	// selection
	// -------------------------------------------------------------- 
	self._facets = {};
	/* Data Structure
	 * facets = 
	 * { "facet_name1": { "value_name": { count: "count", isSelected: true }, ...  },
	 *   "facet_name2": [ { value: "value_name", count: "count", isSelected: false }, ... ] },
	 * ... } 
	 */

	// fine-grained selection on top of the facet selection (a list of nodes)
	self.nodeSelection = [];
	// if true, the nodeSelection list is to be subtracted from the Solr query results (blacklist)
	// if false, the nodeSelection list is to be used instead of the Solr query results (whitelist)
	self.nodeSelectionBlacklistMode = true;
	
	self.facetSort = "count";
	self.facetLimit = "1";

	// -------------------------------------------------------------- 
  	// field visibility and sorting
	// -------------------------------------------------------------- 	
	self._hiddenFieldNames = [ "uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ];
	self._ignoredFieldNames = [ "django_ct", "django_id", "id" ];
	self._internalFieldNames = [];
	
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

	// -------------------------------------------------------------- 
  	// documents
	// -------------------------------------------------------------- 	
	// list of document entries from Solr response (same as the "docs" array in the reponse element)
	self._documents = [];
	/* Data Structure
	 * _documents = [ { ... }, { ... }, ..., { ... } ]
	 */	

	
	// retrieved from database:
	self._totalNodeCount = -1;
	self._selectedNodeCount = -1;
};	


DataSetSolrQuery.prototype.initialize = function () {
	var self = this;	 
	return null;
};


DataSetSolrQuery.prototype.create = function ( start, rows, queryComponents ) {
	
	var self = this;
	
	queryComponents = queryComponents | DATA_SET_INITIALIZATION_QUERY;
	
	var url = self.baseQuery 
		+ "&" + self.baseSettings
		+ "&" + "start=" + start
		+ "&" + "rows=" + rows
		+ "&" + "fq="
		+ "("
			+ "study_uuid:" + self.studyUuid
			+ " AND " + "assay_uuid:" + self.assayUuid
			+ " AND " + "is_annotation:" + self.annotation			
		+ ")"
	   	+ "&" + "facet.sort=count" // sort by count, change to "index" to sort by index	   	
	   	+ "&" + "facet.limit=-1"; // unlimited number of facet values (otherwise some values will be missing)	   	

	if ( queryComponents & DATA_SET_NODE_TYPE_QUERY ) {
		url += self._createNodeTypeComponent();		
	}

	if ( queryComponents & DATA_SET_NODE_SELECTION_QUERY ) {
		url += self._createNodeSelectionComponent();		
	}

	if ( queryComponents & DATA_SET_FACET_QUERY ) {
		url += self._createFacetComponent();		
	}

	if ( queryComponents & DATA_SET_FIELD_QUERY ) {
		url += self._createFieldComponent();		
	}

	if ( queryComponents & DATA_SET_SORT_QUERY ) {
		url += self._createSortComponent();
	}

	if ( queryComponents & DATA_SET_PIVOT_QUERY ) {
		url += self._createPivotComponent();
	}
		
	return ( url );
};


DataSetSolrQuery.prototype._createNodeTypeComponent = function () {	

	var self = this;
	
	var url = "";
	
	var nodeTypeFilter = "type:" + "(" + self.nodeTypes.join( " OR " ) + ")";
	url += "&" + "fq=" + nodeTypeFilter;
	
	return url;	
};


DataSetSolrQuery.prototype._createNodeSelectionComponent = function () {	
	
	var self = this;
	
	var url = "";
	
	var nodeSelectionFilter;
		
	if ( self.nodeSelection.length > 0 ) {
		nodeSelectionFilter = ( self.nodeSelectionBlacklistMode ? "-" : "" ) + "uuid:" + "(" + self.nodeSelection.join( " OR " ) +  ")"; 
	}  
	else {
		nodeSelectionFilter = "uuid:*";
	}

	url += "&" + "fq=" + nodeSelectionFilter;  	
	
	return url;
};
	
	
DataSetSolrQuery.prototype._createFacetComponent = function () {
	
	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// selecting facets: facet.field, fq 	
	// ------------------------------------------------------------------------------

	for ( var facet in self._facets ) {
		var facetValues = self._facets[facet];
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
		
		if ( self._facets.hasOwnProperty( facet ) )
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


DataSetSolrQuery.prototype._createFieldComponent = function () {
	
	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// selecting fields: fl 
	// ------------------------------------------------------------------------------
	
	var fieldNames = [];
	for ( var field in self._fields ) {
		if ( self._fields.hasOwnProperty( field ) )
		{			
			if ( ( self._fields[field].isVisible ) || ( self._hiddenFieldNames.indexOf( field ) >= 0 ) ) {				
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


DataSetSolrQuery.prototype._createSortComponent = function () {

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


DataSetSolrQuery.prototype._createPivotComponent = function () {

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


DataSetSolrQuery.prototype.process = function ( solrResponse ) {
	
	var self = this;
	
	self._processFacets( solrResponse );
	self._processFields( solrResponse );
	self._processDocuments( solrResponse );
	self._processPivots( solrResponse );
	
	return self;
}


DataSetSolrQuery.prototype._processFacets = function ( solrResponse ) {
	
	var self = this;
	
	for ( var facet in solrResponse.facet_counts.facet_fields ) {
		if ( solrResponse.facet_counts.facet_fields.hasOwnProperty( facet ) ) {

			for ( var j = 0; j < solrResponse.facet_counts.facet_fields[facet].length; j += 2 ) {
				var facetValue = solrResponse.facet_counts.facet_fields[facet][j];
				var facetValueCount = solrResponse.facet_counts.facet_fields[facet][j+1];
				
				if ( ( facetValue === "" ) || ( facetValue === undefined ) ) {
					facetValue = "undefined";
				}
				
				if ( self._facets[facet][facetValue] ) {
					self.updateFacet( facet, facetValue, facetValueCount, self.isSelectedFacet( facet, facetValue ) );
				}
				else {
					self.updateFacet( facet, facetValue, facetValueCount, false );
				}
			}
		}		
    }
    
    return self;
}


DataSetSolrQuery.prototype._processFields = function ( solrResponse ) {
	var self = this;
	
	// nothing to do
	
	return self;
}


DataSetSolrQuery.prototype._processDocuments = function ( solrResponse ) {
	var self = this;
	
	for ( var i = 0; i < solrResponse.response.docs.length; ++i ) {
		self._documents.push( solrResponse.response.docs[i] );
    }
}


DataSetSolrQuery.prototype._processPivots = function ( solrResponse ) {
	var self = this;
	
	// nothing to do
	
	return self;
}




// returns true if any facets were cleared, otherwise false
DataSetSolrQuery.prototype.clearFacets = function () {

	var self = this;

	var counter = 0;
	
	for ( var facet in self._facets ) {
		if ( self._facets.hasOwnProperty( facet ) ) {
			for ( var facetValue in self._facets[facet] ) {
				if ( self._facets[facet].hasOwnProperty( facetValue ) ) {
					if ( self._facets[facet][facetValue].isSelected ) {
						self._facets[facet][facetValue].isSelected = false;
						++counter;
					}					
				}
			}				
		}
	}
	
	return counter > 0;
};


// returns true if any nodes were cleared, otherwise false
DataSetSolrQuery.prototype.clearNodeSelection = function () {

	var self = this;
	
	if ( self.nodeSelection.length > 0 )
	{
		self.nodeSelection = [];
		self.nodeSelectionBlacklistMode = true;
		
		return true;
	}
	
	return false;
};


DataSetSolrQuery.prototype.clearAll = function() {
	
	var self = this;
	
	return self.clearNodes() || self.clearNodeSelection();
};



DataSetSolrQuery.prototype.serialize = function ( mode ) {
	
	var self = this;
	mode = typeof mode !== 'undefined' ? mode : DATA_SET_QUERY_NODE_SET_SERIALIZATION;			
	
	var serializedQuery = {};
	
	if ( mode == DATA_SET_QUERY_NODE_SET_SERIALIZATION ) {
		serializedQuery["facets"] = self._facets;
		serializedQuery["nodeSelection"] = self.nodeSelection;
		serializedQuery["nodeSelectionBlacklistMode"] = self.nodeSelectionBlacklistMode;	
	}
	else {
		// TODO: implement full serialization
	}
		
	return JSON.stringify( serializedQuery );
};


DataSetSolrQuery.prototype.deserialize = function ( serializedQuery ) {
	var self = this;

	var deserializedQuery = JSON.parse( serializedQuery );
	
	if ( deserializedQuery.hasOwnProperty( "facets" ) ) {
		self._facets = deserializedQuery["facets"];
	}

	if ( deserializedQuery.hasOwnProperty( "nodeSelection" ) ) {
		self._facets = deserializedQuery["nodeSelection"];
	}

	if ( deserializedQuery.hasOwnProperty( "nodeSelectionBlacklistMode" ) ) {
		self._facets = deserializedQuery["nodeSelectionBlacklistMode"];
	}
	
	return deserializedQuery;
};


DataSetSolrQuery.prototype.addFacet = function ( name ) {
	
	var self = this;
	
	// initialize facet
	self._facets[name] = [];
};


DataSetSolrQuery.prototype.updateFacet = function ( name, value, count, isSelected ) {
	
	var self = this;
	
	count = typeof count !== 'undefined' ? count : 0;
	isSelected = typeof isSelected !== 'undefined' ? isSelected : false;			
		
	self._facets[name][value] = { count: count, isSelected: isSelected };
	
	return self;	
};


DataSetSolrQuery.prototype.isSelectedFacet = function ( name, value ) {
	
	var self = this;

	return self._facets[name][value].isSelected;	
};




DataSetSolrQuery.prototype.getFacetNames = function ( name, isVisible ) {
	
	var self = this;
	
	var facetNames = [];

	for ( facet in self._facets ) {
		if ( self._facets.hasOwnProperty( facet ) ) {
			if ( !self._facets[facet].isInternal ) {	
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



DataSetSolrQuery.prototype.toggleFacetSelection = function ( name, value ) {
	
	var self = this;
	
	self._facets[name][value].isSelected = !self._facets[name][value].isSelected;
	
	return self;
};


DataSetSolrQuery.prototype.addField = function ( name ) {
	
	var self = this;
	
	self.updateField( name, true, false, "" );
	
	return self;	
};


DataSetSolrQuery.prototype.updateField = function ( name, isVisible, isInternal, direction ) {
	
	var self = this;
	
	isVisible = typeof isVisible !== 'undefined' ? isVisible : true;			
	isInternal = typeof isInternal !== 'undefined' ? isInternal : false;			
	direction = typeof direction !== 'undefined' ? direction : "";			
		
	self._fields[name] = { isVisible: isVisible, isInternal: isInternal, direction: direction };	

	return self;
};


DataSetSolrQuery.prototype.getFieldNames = function ( name, isVisible ) {
	
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


DataSetSolrQuery.prototype.toggleFieldDirection = function ( name ) {
	
	var self = this;
	
	if ( self._fields[name].direction === "asc" ) {
		self._fields[name].direction = "desc";
	}
	
	if ( self._fields[name].direction === "desc" ) {
		self._fields[name].direction = "asc";
	}
	
	return self;
};


DataSetSolrQuery.prototype.toggleFieldVisibility = function ( name ) {
	
	var self = this;
	
	self._fields[name].isVisible = !self._fields[name].isVisible;
	
	return self;
};


DataSetSolrQuery.prototype.isIgnoredField = function( name ) {
	
	var self = this;
		
	return self._ignoredFieldNames.indexOf( name ) < 0;	
};


DataSetSolrQuery.prototype.isHiddenField = function( name ) {
	
	var self = this;
		
	return self._hiddenFieldNames.indexOf( name ) < 0;	
}; 


DataSetSolrQuery.prototype.isInternalField = function( name ) {
	
	var self = this;
		
	return self._internalFieldNames.indexOf( name ) < 0;	
};



DataSetSolrQuery.prototype.getSelectedNodeCount = function() {
	
	var self = this;
	
    return ( self.nodeSelectionBlacklistMode ? self.selectedNode - self.nodeSelection.length : self.nodeSelection.length ); 
};


DataSetSolrQuery.prototype.setSelectedNodeCount = function( nodeCount ) {

	var self = this;
	
	self._selectedNodeCount = nodeCount; 

	return self; 
};


DataSetSolrQuery.prototype.getTotalNodeCount = function() {
	
	var self = this;
	
    return ( self._totalNodeCount ); 
};


DataSetSolrQuery.prototype.setTotalNodeCount = function( nodeCount ) {

	var self = this;
	
	self._totalNodeCount = nodeCount;
	
	return self; 
};
