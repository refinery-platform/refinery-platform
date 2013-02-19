/*
 * solr_facet_view.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * A facet viewer that operates on a SolrQuery. 
 */


/*
 * Dependencies:
 * - JQuery
 * - SolrQuery
 */

SOLR_FACET_SELECTION_UPDATED_COMMAND = 'solr_facet_selection_updated';
SOLR_FACET_SELECTION_CLEARED_COMMAND = 'solr_facet_selection_cleared';

SolrFacetView = function( parentElementId, idPrefix, solrQuery, configurator, commands ) {
  	
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
  	
  	self._hiddenFieldNames = [ "uuid", "file_uuid", "study_uuid", "assay_uuid", "type", "is_annotation", "species", "genome_build", "name" ]; // TODO: make these regexes;  	
};	
	
	
SolrFacetView.prototype.initialize = function() {
	var self = this;

	return this;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
SolrFacetView.prototype.render = function ( solrResponse ) {
	var self = this;
	
	// clear parent element
	$( "#" + self._parentElementId ).html("");
	
	$( "#" + self._parentElementId ).append( "<a id=\"clear-facets\" href=\"#\" class=\"btn btn-mini\" data-placement=\"bottom\" data-html=\"true\" rel=\"tooltip\" data-original-title=\"Click to clear facet selection.\"><i class=\"icon-remove-sign\"></i>&nbsp;&nbsp;Reset All</a>" );
   	
   	$( "#clear-facets" ).click( function( event ) {
		// clear facet selection
		var counter = self._query.clearFacetSelection();
		
		// reload page
		if ( counter > 0 ) {
   			self._commands.execute( SOLR_FACET_SELECTION_CLEARED_COMMAND );   						
		}
   	});				
			
	self._renderTree( solrResponse );
	
	//$( "#" + self.parentElementId ).html( code );		
	
	// attach event listeners
	// ..
};


SolrFacetView.prototype._renderTree = function( solrResponse ) {
	
	var self = this;

	var tree = self._generateTree( solrResponse );
		
	// attach events
	// ..
   	$(".facet-value").on( "click", function( event ) {
   		event.preventDefault();	
   	
   		var facetValueId = this.id;
   		var facet = self._decomposeFacetValueId( facetValueId ).facet;
   		var facetValue = self._decomposeFacetValueId( facetValueId ).facetValue;
   	   		
   		self._query._facetSelection[facet][facetValue].isSelected = !self._query._facetSelection[facet][facetValue].isSelected;
   		
   		self._commands.execute( SOLR_FACET_SELECTION_UPDATED_COMMAND, { 'facet': facet, 'facet_value': facetValue, 'isSelected': self._query._facetSelection[facet][facetValue].isSelected } );   		
   	} );	
}
	
	
SolrFacetView.prototype._generateTree = function( solrResponse ) {
	var self = this;			
	var facetCounts = solrResponse._facetCounts;

	for ( var i = 0; i < configurator.state.objects.length; ++i ) {
		var attribute = configurator.state.objects[i];
	
		if ( attribute.is_facet && attribute.is_exposed && !attribute.is_internal ) {
			//facets[attribute.solr_field] = [];
			
			$('<div/>', { 'href': '#' + self._composeFacetId( attribute.solr_field + "___inactive" ), 'class': 'facet-title', "data-toggle": "collapse", "data-parent": "#facet-view", "data-target": "#" + self._composeFacetId( attribute.solr_field + "___inactive" ), 'id': self._composeFacetId( attribute.solr_field ), html: "<h5>" + prettifySolrFieldName( attribute.solr_field, true ) + "</h5>" }).appendTo('#' + self._parentElementId);
			$('<div/>', { 'class': 'facet-value-list selected', "id": self._composeFacetId( attribute.solr_field + "___active" ), html: "" }).appendTo('#' + self._parentElementId);							
			$('<div/>', { 'class': 'facet-value-list collapse', "id": self._composeFacetId( attribute.solr_field + "___inactive" ), html: "" }).appendTo('#' + self._parentElementId);
	
		   	$("#" + self._composeFacetId( attribute.solr_field + "___inactive" ) ).on( "show", function( ) {
		   		var facet = self._decomposeFacetId( this.id ).facet;
		   		$( "#" + self._composeFacetId( facet + "___active" ) ).hide(); //slideUp( "slow" );
		   	});						
	
		   	$("#" + self._composeFacetId( attribute.solr_field + "___inactive" ) ).on( "hide", function() {
		   		var facet = self._decomposeFacetId( this.id ).facet;
		   		$( "#" + self._composeFacetId( facet + "___active" ) ).fadeIn( "slow" ); //slideDown( "slow");
		   	});																							
		}											
	}	

	for ( var facet in facetCounts ) {
		if ( facetCounts.hasOwnProperty( facet ) ) {
			var unselectedItems = [];
			var selectedItems = [];
			
			var facetValues = facetCounts[facet];
			
			for ( var facetValue in facetValues ) {
				if ( facetValues.hasOwnProperty( facetValue ) ) {
					
					var facetValueCount = facetValues[facetValue];
					
					if ( ( facetValue === "" ) || ( facetValue === undefined ) ) {
						facetValue = "undefined";
					}

					
					if ( self._query._facetSelection[facet][facetValue] === undefined ) {					
						self._query._facetSelection[facet][facetValue] = { count: 0, isSelected: false };
					}

					if ( self._query._facetSelection[facet][facetValue].isSelected ) {						
						self._query._facetSelection[facet][facetValue] = { count: facetValueCount, isSelected: self._query._facetSelection[facet][facetValue].isSelected };
						
			    		selectedItems.push("<tr class=\"facet-value\" id=\"" + self._composeFacetValueId( facet, facetValue ) + "\"><td>" + '<label class="checkbox"><input type="checkbox" checked></label>' + "</td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );					
		    			unselectedItems.push("<tr class=\"facet-value\" id=\"" + self._composeFacetValueId( facet, facetValue ) + "\"><td>" + '<label class="checkbox"><input type="checkbox" checked></label>' + "</td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td>"  + "</tr>" );
					}
					else {
						self._query._facetSelection[facet][facetValue] = { count: facetValueCount, isSelected: self._query._facetSelection[facet][facetValue].isSelected };
						
						unselectedItems.push("<tr class=\"facet-value\" id=\"" + self._composeFacetValueId( facet, facetValue ) + "\"><td>" + '<label class="checkbox"><input type="checkbox"></label>' + "</td><td width=100%>" + facetValue + "</td><td align=right>" + facetValueCount + "</td><td></td>"  + "</tr>" );									
					}										
				}			
			}
			
			$( "#" + self._composeFacetId( facet + "___active" ) ).html( "<table class=\"\"><tbody>" + selectedItems.join('') + "</tbody></table>" ); 
			$( "#" + self._composeFacetId( facet + "___inactive" ) ).html( "<table class=\"\"><tbody>" + unselectedItems.join('') + "</tbody></table>" );
		}		
    }
}


SolrFacetView.prototype._composeFacetValueId = function( facet, facetValue ) {
	var self = this;
	return ( self._idPrefix + "___" + "facetvalue" + "___" + facet + "___" + facetValue );
}

SolrFacetView.prototype._decomposeFacetValueId = function( facetValueId ) {
	var self = this;
	return ( { facet: facetValueId.split( "___" )[2], facetValue: facetValueId.split( "___" )[3] } );
}

SolrFacetView.prototype._composeFacetId = function( facet ) {
	var self = this;
	return ( self._idPrefix + "___" + "facet" + "___" + facet );
}

SolrFacetView.prototype._decomposeFacetId = function( facetId ) {
	var self = this;
	return ( { facet: facetId.split( "___" )[2] } );
}




