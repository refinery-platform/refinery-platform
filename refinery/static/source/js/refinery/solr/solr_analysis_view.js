/*
 * solr_analysis_view.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 9 April 2013
 *
 * A facet-based analysis selection control that operates on a SolrQuery. 
 */


/*
 * Dependencies:
 * - JQuery
 * - SolrQuery
 * - AnalysisApiClient
 */

SOLR_ANALYSIS_SELECTION_UPDATED_COMMAND = 'solr_analysis_selection_updated';
SOLR_ANALYSIS_SELECTION_CLEARED_COMMAND = 'solr_analysis_selection_cleared';

SolrAnalysisView = function( parentElementId, idPrefix, solrQuery, configurator, commands, dataSetMonitor ) {
  	
  	var self = this;
	
	// parent element for UI 
  	self._parentElementId = parentElementId;
  	
  	// id prefix for all DOM elements to create unique element ids
  	self._idPrefix = idPrefix;
  	
  	// Solr interaction 
  	self._query = solrQuery;
  	
  	// data set configuration
  	self._configurator = configurator;
  	
  	// wreqr commands
  	self._commands = commands;
  	
  	self._dataSetMonitor = dataSetMonitor;
  	self._currentSolrResponse = null;
  	
  	self._expandedFacets = [];
  	
  	self._hiddenFieldNames = [ "uuid", "file_uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ]; // TODO: make these regexes;  	  	
};	
	
	
SolrAnalysisView.prototype.initialize = function() {
	var self = this;

	self._dataSetMonitor._commands.addHandler( DATA_SET_MONITOR_ANALYSES_UPDATED_COMMAND, function( arguments ){
		self.render( self._currentSolrReponse );
	});

	return this;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
SolrAnalysisView.prototype.render = function ( solrResponse ) {
	var self = this;
	
	// clear parent element
	self._currentSolrResponse = solrResponse;
	analyses = self._dataSetMonitor.analyses;

  	if ( analyses !== null && self._currentSolrResponse !== null ) {
  		$( "#" + self._parentElementId ).html('');
		self._renderTree( self._currentSolrResponse );  		
  	} 
  	else {
		$( "#" + self._parentElementId ).html('<i class="fa fa-refresh fa-spin"' +
			' style="padding: 2px"></i>');
  	}
};


SolrAnalysisView.prototype._renderTree = function( solrResponse ) {
	
	var self = this;

	var tree = self._generateTree( solrResponse );
		
	// attach events
	// ..
   	$( "#" + self._parentElementId + " .facet-value" ).on( "click", function( event ) {
   		event.preventDefault();
   		   	
   		var facetValueId = this.id;
   		var facet = self._decomposeFacetValueId( facetValueId ).facet;
   		var facetValue = self._decomposeFacetValueId( facetValueId ).facetValue;
   	   		
   		self._query._facetSelection[facet][facetValue].isSelected = !self._query._facetSelection[facet][facetValue].isSelected;
   		
		self._query.clearDocumentSelection();
   		
   		self._commands.execute( SOLR_ANALYSIS_SELECTION_UPDATED_COMMAND, { 'facet': facet, 'facet_value': facetValue, 'isSelected': self._query._facetSelection[facet][facetValue].isSelected } );   		
   	} );	
}
	
	
SolrAnalysisView.prototype._generateTree = function( solrResponse ) {
	var self = this;			
	var facetCounts = solrResponse._facetCounts;

	for ( var i = 0; i < configurator.state.objects.length; ++i ) {
		var attribute = configurator.state.objects[i];
		
		if ( attribute.solr_field.indexOf( NODE_INDEX_ANALYSIS_UUID_PREFIX ) == 0 ) {
			
			var counts = self._query.getNumberOfFacetValues( attribute.solr_field );
			var countsString = ""; //"(" + counts.total + ")";
			
			$('<div/>', {
				'href': '#' + self._composeFacetId( attribute.solr_field + "___inactive" ),
				'class': 'refinery-facet-title',
				'data-toggle': "collapse",
				'data-parent': "#" + self._parentElementId,
				//'data-parent': self._parentElementId,
				'data-target': "#" + self._composeFacetId( attribute.solr_field + "___inactive" ),
				'id': self._composeFacetId( attribute.solr_field ),
				'html': '<span class="refinery-facet-label" id="' + self._composeFacetId( attribute.solr_field + '___label' ) + '">' + self._getFacetLabel( attribute.solr_field ) + '</span>'
				}).appendTo('#' + self._parentElementId);
			
			// only show active facet values when facet is collapsed
			$('<div/>', { 'class': 'facet-value-list selected ' + ( self._isFacetExpanded( attribute.solr_field ) ? 'hidden' : '' ), "id": self._composeFacetId( attribute.solr_field + "___active" ), html: "" }).appendTo('#' + self._parentElementId);											
			
			// if facet is marked as expanded display it that way
			$('<div/>', { 'class': 'facet-value-list collapse ' + ( self._isFacetExpanded( attribute.solr_field ) ? 'in' : '' ), "id": self._composeFacetId( attribute.solr_field + "___inactive" ), html: "" }).appendTo('#' + self._parentElementId);
	
			// user chooses to open collapsed facet
		   	$("#" + self._composeFacetId( attribute.solr_field + "___inactive" ) ).on( "shown.bs.collapse.in", function() {
		   		var facet = self._decomposeFacetId( this.id ).facet;
				
				// add facet to list of expanded facets for this view
		   		self._setFacetExpanded( facet );
		   		
		   		// update facet label (i.e. show downward pointing triangle before label)
				$( "#" + self._composeFacetId( facet + '___label' ) ).html( self._getFacetLabel( facet ) );
				
				// hide active facet section (to avoid showing duplicate facet values)
		   		$( "#" + self._composeFacetId( facet + "___active" ) ).hide(); //slideUp( "slow" );		   			
		   	});						
	
			// user chooses to close expanded facet
		   	$("#" + self._composeFacetId( attribute.solr_field + "___inactive" ) ).on( "hidden.bs.collapse.in", function() {
		   		var facet = self._decomposeFacetId( this.id ).facet;
		   		
				// remove facet from list of expanded facets for this view
		   		self._setFacetCollapsed( facet );
		   		
		   		// update facet label (i.e. show triangle pointing to the right before label)		   		
				$( "#" + self._composeFacetId( facet + '___label' ) ).html( self._getFacetLabel( facet ) );
		   		
				// show active facet section
	   			$( "#" + self._composeFacetId( facet + "___active" ) ).removeClass( "hidden" );
	   			$( "#" + self._composeFacetId( facet + "___active" ) ).fadeIn( "slow" ); //slideDown( "slow");
		   	});
		}											
	}	

	for ( var facet in facetCounts ) {
		
		// only process facets shown in this view
		if ( facet.indexOf( NODE_INDEX_ANALYSIS_UUID_PREFIX ) != 0 ) {
			continue;
		}
		
		if ( facetCounts.hasOwnProperty( facet ) ) {
			var unselectedItems = [];
			var selectedItems = [];
			
			var facetValues = facetCounts[facet];
			
			for ( var facetValue in facetValues ) {				
				if ( facetValues.hasOwnProperty( facetValue ) ) {
					
					var facetValueCount = facetValues[facetValue];
					var analysisName = "";
					
					if ( ( facetValue === "" ) || ( facetValue === undefined ) ) {
						facetValue = "undefined";
					}
					else {
						analysisName = self._dataSetMonitor.getAnalysisLabel( facetValue, analyses );
					}
					
					if ( self._query._facetSelection[facet][facetValue] === undefined ) {					
						self._query._facetSelection[facet][facetValue] = { count: 0, isSelected: false };
					}

					if ( self._query._facetSelection[facet][facetValue].isSelected ) {						
						self._query._facetSelection[facet][facetValue] = { count: facetValueCount, isSelected: self._query._facetSelection[facet][facetValue].isSelected };
						
			    		selectedItems.push("<tr class=\"facet-value\" id=\"" + self._composeFacetValueId( facet, facetValue ) + "\"><td>" + '<input type="checkbox" checked>' + "</td><td width=100%>" + analysisName + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );
		    			unselectedItems.push("<tr class=\"facet-value\" id=\"" + self._composeFacetValueId( facet, facetValue ) + "\"><td>" + '<input type="checkbox" checked>' + "</td><td width=100%>" + analysisName + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );
					}
					else {
						self._query._facetSelection[facet][facetValue] = { count: facetValueCount, isSelected: self._query._facetSelection[facet][facetValue].isSelected };
						
						unselectedItems.push("<tr class=\"facet-value\" id=\"" + self._composeFacetValueId( facet, facetValue ) + "\"><td>" + '<input type="checkbox">' + "</td><td>" + analysisName + "</td><td align=right>" + facetValueCount + "</td><td></td>"  + "</tr>" );
					}										
				}			
			}
			
			$( "#" + self._composeFacetId( facet + "___active" ) ).html( "<table class=\"\"><tbody>" + selectedItems.join('') + "</tbody></table>" ); 
			$( "#" + self._composeFacetId( facet + "___inactive" ) ).html( "<table class=\"\"><tbody>" + unselectedItems.join('') + "</tbody></table>" );
		}		
    }
}


SolrAnalysisView.prototype._getFacetLabel = function( facet ) {	
	var self = this;
	
	var indicator = ""
	
	if ( self._isFacetExpanded( facet ) ) {
		indicator = "fa fa-caret-down";
	}
	else {
		indicator = "fa fa-caret-right";
	}
	
	return ( '<span style="width: 10px; text-align: center; display: inline-block;"><i class="' + indicator + '"></i></span>&nbsp;' + prettifySolrFieldName( facet, true ) );	
}

SolrAnalysisView.prototype._toggleExpandedFacet = function( facet ) {	
	var self = this;
	
	var index = self._expandedFacets.indexOf( facet );
	
	if ( index >= 0 ) {
		self._expandedFacets.splice( index, 1 );
	}
	else {
		self._expandedFacets.push( facet );
	}	
}

SolrAnalysisView.prototype._setFacetExpanded = function( facet ) {	
	var self = this;
	
	var index = self._expandedFacets.indexOf( facet );
	
	if ( index < 0 ) {
		self._expandedFacets.push( facet );
	}	
}

SolrAnalysisView.prototype._setFacetCollapsed = function( facet ) {	
	var self = this;
	
	var index = self._expandedFacets.indexOf( facet );
	
	if ( index >= 0 ) {
		self._expandedFacets.splice( index, 1 );
	}	
}


SolrAnalysisView.prototype._isFacetExpanded = function( facet ) {
	var self = this;
	
	return ( self._expandedFacets.indexOf( facet ) >= 0 );	
}


SolrAnalysisView.prototype._composeFacetValueId = function( facet, facetValue ) {
	var self = this;
	return ( self._idPrefix + "___" + "facetvalue" + "___" + facet + "___" + facetValue );
}

SolrAnalysisView.prototype._decomposeFacetValueId = function( facetValueId ) {
	var self = this;
	return ( { facet: facetValueId.split( "___" )[2], facetValue: facetValueId.split( "___" )[3] } );
}

SolrAnalysisView.prototype._composeFacetId = function( facet ) {
	var self = this;
	return ( self._idPrefix + "___" + "facet" + "___" + facet );
}

SolrAnalysisView.prototype._decomposeFacetId = function( facetId ) {
	var self = this;
	return ( { facet: facetId.split( "___" )[2] } );
}
