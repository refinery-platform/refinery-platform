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
	self.facets = {};
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
	self.hiddenFields = [ "uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ];
	self.ignoredFields = [ "django_ct", "django_id", "id" ];
	
	self.fields = {};
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
	self.pivots = [];	
	
	// retrieved from database:
	self.totalNodes = -1;
	self.selectedNodes = -1;
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
}


DataSetSolrQuery.prototype._createNodeTypeComponent = function () {	

	var self = this;
	
	var url = "";
	
	var nodeTypeFilter = "type:" + "(" + self.nodeTypes.join( " OR " ) + ")";
	url += "&" + "fq=" + nodeTypeFilter;
	
	return url;	
}

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
}
	
DataSetSolrQuery.prototype._createFacetComponent = function () {
	
	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// selecting facets: facet.field, fq 	
	// ------------------------------------------------------------------------------

	for ( var facet in self.facets ) {
		var facetValues = self.facets[facet];
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
		
		if ( self.facets.hasOwnProperty( facet ) )
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


DataSetSolrQuery.prototype._createFieldComponent = function () {
	
	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// selecting fields: fl 
	// ------------------------------------------------------------------------------
	
	var fieldNames = [];
	for ( var field in self.fields ) {
		if ( self.fields.hasOwnProperty( field ) )
		{			
			if ( ( self.fields[field].isVisible ) || ( self.hiddenFields.indexOf( field ) >= 0 ) ) {				
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


DataSetSolrQuery.prototype._createSortComponent = function () {

	var self = this;
	
	var url = "";
	
	// ------------------------------------------------------------------------------
	// sorting by field: sort
	// ------------------------------------------------------------------------------
 
	for ( var field in self.fields ) {
		if ( self.fields.hasOwnProperty( field ) ) {
			// only sort on visible fields			
			if ( self.fields[field].isVisible ) {
				if ( ( self.fields[field].direction === "asc" ) || ( self.fields[field].direction === "desc" ) ) {
					var direction = self.fields[field].direction;  				
					
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


DataSetSolrQuery.prototype._createPivotComponent = function () {

	var self = this;

	var url = "";
	
	// ------------------------------------------------------------------------------
	// pivot fields: facet.pivot 
	// ------------------------------------------------------------------------------
	if ( self.pivots.length > 1 ) {
		var pivotQuery = self.pivots.join( "," );

		if ( pivotQuery.length > 0 ) {
			url += "&facet.pivot=" + pivotQuery;
		}		
	}		

	return url;	
}


DataSetSolrQuery.prototype.clearFacets = function () {

	var self = this;

	var counter = 0;
	
	for ( var facet in self.facets ) {
		if ( self.facets.hasOwnProperty( facet ) ) {
			for ( var facetValue in self.facets[facet] ) {
				if ( self.facets[facet].hasOwnProperty( facetValue ) ) {
					if ( self.facets[facet][facetValue].isSelected ) {
						self.facets[facet][facetValue].isSelected = false;
						++counter;
					}					
				}
			}				
		}
	}
	
	return counter;
}


DataSetSolrQuery.prototype.serialize = function ( mode ) {
	
	var self = this;
	mode = typeof mode !== 'undefined' ? mode : DATA_SET_QUERY_NODE_SET_SERIALIZATION;			
	
	var serializedQuery = {};
	
	if ( mode == DATA_SET_QUERY_NODE_SET_SERIALIZATION ) {
		serializedQuery["facets"] = self.facets;
		serializedQuery["nodeSelection"] = self.nodeSelection;
		serializedQuery["nodeSelectionBlacklistMode"] = self.nodeSelectionBlacklistMode;	
	}
	else {
		// TODO: implement full serialization
	}
		
	return JSON.stringify( serializedQuery );
}


DataSetSolrQuery.prototype.deserialize = function ( serializedQuery ) {
	var self = this;

	var deserializedQuery = JSON.parse( serializedQuery );
	
	if ( deserializedQuery.hasOwnProperty( "facets" ) ) {
		self.facets = deserializedQuery["facets"];
	}

	if ( deserializedQuery.hasOwnProperty( "nodeSelection" ) ) {
		self.facets = deserializedQuery["nodeSelection"];
	}

	if ( deserializedQuery.hasOwnProperty( "nodeSelectionBlacklistMode" ) ) {
		self.facets = deserializedQuery["nodeSelectionBlacklistMode"];
	}
	
	return deserializedQuery;
}

