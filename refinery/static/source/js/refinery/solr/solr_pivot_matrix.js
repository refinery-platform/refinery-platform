/*
 * solr_pivot_self._matrix.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 21 February 2013
 *
 * A viewer that operates on a SolrQuery and shows the pivot data as an interactive heatmap. 
 */


/*
 * Dependencies:
 * - JQuery
 * - SolrQuery
 */


var tooltip = d3.select("body")
	.append( "div" )
	.attr( "class", "refinery-tooltip" )
	.style( "position", "absolute" )
	.style( "z-index", "10" )
	.style( "visibility", "hidden" );


SOLR_PIVOT_MATRIX_SELECTION_UPDATED_COMMAND = 'solr_pivot_matrix_selection_updated';
SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND = 'solr_pivot_matrix_facets_updated';


SolrPivotMatrix = function( parentElementId, idPrefix, solrQuery, options, commands ) {
  	
  	var self = this;
	
	// parent element for UI 
  	self._parentElementId = parentElementId;
  	
  	// id prefix for all DOM elements to create unique element ids
  	self._idPrefix = idPrefix;
  	
  	// Solr interaction 
  	self._query = solrQuery;
  	
  	// wreqr commands
  	self._commands = commands;
  	
  	// visualization
  	self.chart = document.getElementById(parentElementId);
	self.cx = self.chart.clientWidth;
	self.cy = self.chart.clientHeight;
	self.options = options || {};
	self.options.ymin = options.ymin || 0;
	self._useGradient = true;
	self._matrix = undefined;
	
	self._facet1 = undefined;
	self._facet2 = undefined;	
	
	self._rowOrderIndex = undefined;
	self._columnOrderIndex = undefined;
};	
	
	
SolrPivotMatrix.prototype.initialize = function() {
	var self = this;

	return this;	
};
	
	
/*
 * Render the user interface components into element defined by self.elementId.
 */
SolrPivotMatrix.prototype.render = function ( solrResponse ) {
	var self = this;
			
	// clear parent element
	$( "#" + self._parentElementId ).html("");
	
	var controlsId = self._idPrefix + '-controls';
	
	$('<div/>', {	
		'class': '',
		'id': controlsId,
		'html': ''
	}).appendTo( '#' + self._parentElementId );

	self._generateFacetSelectionControls( controlsId );
	
	if ( !solrResponse ) {
		if ( !self._matrix ) {
			return;			
		}				
	}
	
	if ( !self._matrix ) {
		if ( solrResponse ) {
			if ( solrResponse.getPivotCounts() ) {
				self._matrix = self._generateMatrix( solrResponse.getPivotCounts(), self._facet1, self._facet2 );							
			}
			else {
				return;
			}
		}
		else {
			return;
		}
	}
	
  	var facets = self._query._facetSelection;
	
	var columnLabelLength = 20;
	var rowLabelLength = 20;
	var margin = {top: 150, right: 50, bottom: 0, left: 150},
    	width = Math.max( self._matrix[0].length * 14, 800 );
    	height = Math.max( self._matrix.length * 14, 500 );

	var x = d3.scale.ordinal().rangeBands([0, width]);
	var y = d3.scale.ordinal().rangeBands([0, height]);

	//var x = d3.fisheye.scale(d3.scale.identity).domain([0, width]).focus(360);
	//var y = d3.fisheye.scale(d3.scale.identity).domain([0, height]).focus(90);

	var max = self.getMatrixMax( self._matrix );

	var defaultColorMap;
	var selectedColorMap;	
	var clampValue;
	
	if ( this.useGradient ) {
		// gradient color map
		clampValue = max;
	}
	else {
		// binary color map
		clampValue = 1;
	}

	defaultColorMap = d3.scale.linear().domain([0,max]).range(["#EEEEEE", "#222222"]).clamp(true);	
	selectedColorMap = d3.scale.linear().domain([0,max]).range(["#E0EAEF", "#136382"]).clamp(true);	


	var svg = d3.select(document.getElementById(self._parentElementId)).append("svg")
    	.attr("width", width + margin.left + margin.right)
    	.attr("height", height + margin.top + margin.bottom)
    	//.attr("background-color", "transparent")
    	//.style("margin-left", margin.left + "px")
  	.append("g")
    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    	
  	// precompute the orders.
  	var orders = {
	  	xDefault: d3.range(self._matrix[0].length).sort(),
	  	yDefault: d3.range(self._matrix.length).sort(),
	  	xLabels: d3.range(self._matrix[0].length).sort(function(a, b) { var labels = $.map( self._matrix[0], function ( entry ) { return ( entry.xlab ); } ); return d3.ascending(labels[a], labels[b]); }),
	  	yLabels: d3.range(self._matrix.length).sort(function(a, b) { var labels = $.map( self._matrix, function ( entry ) { return ( entry[0].ylab ); } ); return d3.ascending(labels[a], labels[b]); })
  	};

	// The default sort order.
	if ( self._rowOrderIndex != undefined ) {
		y.domain( computeRowOrder( self._rowOrderIndex, false ) );		
	}
	else {
		y.domain(orders.yDefault);		
	}	

	if ( self._columnOrderIndex != undefined ) {
		x.domain( computeColumnOrder( self._columnOrderIndex, false ) );		
	}
	else {
		x.domain(orders.xDefault);		
	}	
	
  	svg.append("rect")
		.attr("class", "frame")
		.attr("width", width)
		.attr("height", height)
		.style("fill","none")
		.style("stroke","none");
 
	var row = svg.selectAll(".row")
		.data(self._matrix)
		.enter().append("g")
			.attr("class", "row")
			.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
			.style( "fill", "rgb(0,255,255)")
			.each(makeRow);

	row.append("text")
		.attr("x", -5)
		.attr("y", y.rangeBand()/2 )
		.attr("dy", ".32em")
		.attr("class", function(p) {
			if ( facets[p[0].yfacet][p[0].ylab].isSelected ) {
				return ( "matrix-label matrix-label-selected" );		
			}
			return ( "matrix-label" );			
		})
		.attr("title", function(p) {
			return p[0].ylab;
		 })      
		.attr("text-anchor", "end")
		.style("font-size", "12px")	            
		.style("cursor", "pointer")	            
  		.style( "user-select", "none" )           
  		.style( "-webkit-user-select", "none" )           
		.text( function( d, row ) {
				return ( trimLabel( self._matrix[row][0].ylab, rowLabelLength ) );
			})		
		.on("mouseover", function(p) {
				d3.selectAll(".column text")
					.classed("active", function(d, i) { return i == p[0].y; }); 				
				if ( event.shiftKey ) {
					showTooltip( "Click to sort columns by this row", event );
				} 
				else {			
					showTooltip( p[0].ylab, event );
				}
			})
		.on("mousemove", function(p){
				if ( event.shiftKey ) {
					showTooltip( "Click to sort columns by this row", event );
				} 
				else {			
					showTooltip( p[0].ylab, event );
				}
			})
		.on("mouseout", function(p){
				hideTooltip();
				mouseout();
			})
		
		.on("click", function(p) { 
			if ( event.shiftKey ) {
				self._columnOrderIndex = p[0].y;
				orderColumns( computeColumnOrder( self._columnOrderIndex, false ) );
								
				event.preventDefault(); 
			}
      		else {
      			facets[p[0].yfacet][p[0].ylab].isSelected = !facets[p[0].yfacet][p[0].ylab].isSelected;
      			
      			self._commands.execute( SOLR_FACET_SELECTION_UPDATED_COMMAND,
							{
								'facet': p[0].yfacet, 'value': p[0].ylab, 'isSelected':
								facets[p[0].yfacet][p[0].ylab].isSelected
							}
						);
      		} 
      	}, true );
            

	var column = svg.selectAll(".column")
		.data(self._matrix[0])
		.enter().append("g")
			.attr("class", "column")
			.attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
	
	// labels
	column.append("text")
		.attr("dy", ".32em")		
		.attr("class", function(p) {
				if ( facets[p.xfacet][p.xlab].isSelected ) {
					return ( "matrix-label matrix-label-selected" );		
				}
				return ( "matrix-label" );			
			})
		.attr("title", function(p) {
				return p.xlab;
			 })      
		.attr("text-anchor", "start")
		.attr("x", 0)
		.attr("y", 0)
		.attr("transform", "translate(" + 7 + "," + (x.rangeBand()/2) + ") rotate(45)" )
		.style("font-size", "12px")	      
		.style("cursor", "pointer")	 
  		.style( "user-select", "none" )           
  		.style( "-webkit-user-select", "none" )           
		.text( function( d, col ) {
				return ( trimLabel( self._matrix[0][col].xlab, columnLabelLength ) );
			})		
		.on("mouseover", function(p) {
				d3.selectAll(".column text")
					.classed("active", function(d, i) { return i == p.x; }); 				
				if ( event.shiftKey ) {
					showTooltip( "Click to sort rows by this column", event );
				} 
				else {
					showTooltip( p.xlab, event );					
				}
			})
		.on("mousemove", function(p){
				if ( event.shiftKey ) {
					showTooltip( "Click to sort rows by this column", event );
				} 
				else {
					showTooltip( p.xlab, event );					
				}
			})
		.on("mouseout", function(p){
				hideTooltip();
			})
		.on("click", function(p) {
			if ( event.shiftKey ) {
				self._rowOrderIndex = p.x;
				orderRows( computeRowOrder( self._rowOrderIndex, false ) );
				
				event.preventDefault(); 
			}
			else {
				facets[p.xfacet][p.xlab].isSelected = !facets[p.xfacet][p.xlab].isSelected;
				
      			self._commands.execute( SOLR_FACET_SELECTION_UPDATED_COMMAND, { 'facet': p.xfacet, 'value': p.xlab, 'isSelected': facets[p.xfacet][p.xlab].isSelected } ); 
			} 
		}, true );
	
	var maxRowLabelWidth = 0;
	d3.selectAll(".row" ).selectAll(".matrix-label")
		.each( function (){	
			maxRowLabelWidth = Math.max( maxRowLabelWidth, this.getBBox().width );
		});

	var maxColumnLabelWidth = 0;
	d3.selectAll(".column" ).selectAll(".matrix-label")
		.each( function (){			
			maxColumnLabelWidth = Math.max( maxColumnLabelWidth, this.getBBox().width );
		});

	// set borders on matrix	
	d3.select( "svg" ).select("g")
		 .attr("transform", "translate(" + maxRowLabelWidth + "," + maxColumnLabelWidth + ")");

  function makeRow(row) {
  	
  	var facets = self._query._facetSelection;
  	
    var cell = d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d.count > 0 }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x) + 1; })
        .attr("height", y.rangeBand() - 2 )
        .attr("width", x.rangeBand() - 2 )
        .style("fill-opacity", function(d) { return 1; })
        .style("fill", function(p) {
        		if ( facets[p.yfacet][p.ylab].isSelected ) {
        			if ( !hasSelection( facets, self._facet2 ) ) {
						return( selectedColorMap(p.count) );        			        				
        			}
        		}
        		
        		if ( facets[p.xfacet][p.xlab].isSelected ) {
        			if ( !hasSelection( facets, self._facet1 ) ) {
						return( selectedColorMap(p.count) );        			        				
        			}
        		} 

        		if ( facets[p.xfacet][p.xlab].isSelected && facets[p.yfacet][p.ylab].isSelected ) {
					return( selectedColorMap(p.count) );        			        				
        		} 

    			if ( !hasSelection( facets, self._facet1 ) && !hasSelection( facets, self._facet2 ) ) {
					return( selectedColorMap(p.count) );        			        				
    			}
        		
				return ( defaultColorMap(p.count) );        				
        	})
		.on("mouseover", function(p) {
				d3.selectAll(".column text")
					.classed("active", function(d, i) { return i == p.x; }); 				
				showTooltip( "<b>" + p.count + "</b>" + "<br>" + p.xlab + "<br>" + p.ylab, event );
			})
		.on("mousemove", function(p){
				showTooltip( "<b>" + p.count + "</b>" + "<br>" + p.xlab + "<br>" + p.ylab, event );
				mouseover();
			})
		.on("mouseout", function(p){
				hideTooltip();
				mouseout();
			})        
        .on("click", function(p) {
        	if ( facets[p.xfacet][p.xlab].isSelected && facets[p.yfacet][p.ylab].isSelected ) {
        		// cell is selected
        		facets[p.yfacet][p.ylab].isSelected = false;
        		facets[p.xfacet][p.xlab].isSelected = false;
        	} 
        	else {
        		facets[p.yfacet][p.ylab].isSelected = true;
        		facets[p.xfacet][p.xlab].isSelected = true;        		
        	}

			self._commands.execute( SOLR_FACET_SELECTION_UPDATED_COMMAND );       			        	
         }, true );

	// "cross out" empty cells
    var emptyCell = d3.select(this).selectAll(".empty-cell")
        .data(row.filter(function(d,i) { return d.count <= 0; }))
      .enter().append("line")
        .attr("class", "empty-cell" )
        .attr("x1", function(d) { return x(d.x) + 5; } )
        .attr("y1", y.rangeBand() - 5 )
        .attr("x2", function(d) { return x(d.x) + x.rangeBand() - 5; } )
        .attr("y2", 5 )
        .style( "stroke-width", 1 )
        .style( "stroke", "rgb(230,230,230)" );
  }


  function mouseover(p) {
    d3.selectAll(".row text").classed("active", function(d, i) { return i == d.y; });
    d3.selectAll(".column text").classed("active", function(d, i) { return i == d.x; });
  }

  function mouseout() {
    d3.selectAll("text").classed("active", false);
  }
	
  function computeRowOrder( column, asc ) {
  	return ( d3.range(self._matrix.length).sort(function(a, b) { var labels = $.map( self._matrix, function ( entry ) { return ( entry[column].count ); } ); return ( asc ? d3.ascending(labels[a], labels[b]) : d3.descending(labels[a], labels[b]) ); }) );
  }

  function computeColumnOrder( row, asc ) {
  	return ( d3.range(self._matrix[row].length).sort(function(a, b) { var labels = $.map( self._matrix[row], function ( entry ) { return ( entry.count ); } ); return ( asc ? d3.ascending(labels[a], labels[b]) : d3.descending(labels[a], labels[b]) ); }) );
  }

  function orderRows(order) {
    y.domain(order);

    var t = svg.transition().duration( 0 );

    t.selectAll(".row")
        .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });
  }


  function orderColumns(order) {
    x.domain(order);

    var t = svg.transition().duration( 0 );

    t.selectAll(".row")
		.selectAll(".empty-cell")
	        .attr("x1", function(d) { return x(d.x) + 5; } )
	        .attr("y1", y.rangeBand() - 5 )
	        .attr("x2", function(d) { return x(d.x) + x.rangeBand() - 5; } )
	        .attr("y2", 5 );

	t.selectAll(".row")
		.selectAll(".cell")
        	.attr("x", function(d) { return x(d.x) + 1; });
        
    t.selectAll(".column")
        .attr("transform", function(d, i) { return "translate(" + x(i) + ",0)rotate(-90)"; });
  }
  
  
	/*
	* Returns true if at least one attribute has been selected in the pivot facet, false otherwise. 
	*/
	function hasSelection( facets, pivot ) {
		var facet = facets[pivot];
		  		
  		for ( facetValue in facet ) {
  			if ( facet.hasOwnProperty( facetValue ) ) {
  				if ( facet[facetValue].isSelected ) {
	  				return ( true );  					
  				}
  			}
  		}
  		
  		return ( false );  				
	}
  
  
	function showTooltip( label, event ) {
		tooltip.html( label );
		tooltip.style( "visibility", "visible" );
		tooltip.style( "top", (event.pageY-10)+"px" );
		tooltip.style( "left", (event.pageX+10)+"px" );
	}

  	function hideTooltip() {
		tooltip.style( "visibility", "hidden" );			
	}
  
	function trimLabel( label, maxLength ) {		
		if ( label.length > maxLength + 3 ) {
			return ( label.substring( 0, maxLength ) + "..." );			
		}
		
		return ( label ); 
  	}
};


SolrPivotMatrix.prototype._generateFacetSelectionControls = function( parentElementId ) {
	
	var self = this;
	
	// make dropdown lists	
	var pivot1List = [];
	var pivot2List = [];
	
	var facets = self._query._facetSelection;
	
	//pivot1List.push( "<option value=\"\"></option>" );
	//pivot2List.push( "<option value=\"\"></option>" );
	for ( facet in facets ) {
		if ( facets.hasOwnProperty( facet ) ) {

			var facetValues = self._query.getNumberOfFacetValues( facet ).total;

			//conditional is required because visibleFacets has incorrect
			// isExposed attributes
			if(facet.indexOf("ANALYSIS") > -1 || facet.indexOf("WORKFLOW_OUTPUT") > -1) {
				facetValues = facetValues - 1;
			}else{

				if (self._facet1 === facet) {
					pivot1List.push("<option selected value=\"" + facet + "\">" +
						prettifySolrFieldName(facet, true) + " (" + facetValues + ")</option>");
				}
				else {
					pivot1List.push("<option value=\"" + facet + "\">" +
						prettifySolrFieldName(facet, true) + " (" + facetValues + ")</option>");
				}

				if (self._facet2 === facet) {
					pivot2List.push("<option selected value=\"" + facet + "\">" +
						prettifySolrFieldName(facet, true) + " (" + facetValues + ")</option>");
				}
				else {
					pivot2List.push("<option value=\"" + facet + "\">" +
						prettifySolrFieldName(facet, true) + " (" + facetValues + ")</option>");
				}
			}
		}
	}

	$( "#" + parentElementId ).html( "" );
	
	$( "<span/>",
		{
			"class": "refinery-facet-label", html: "Rows"
		}
	).appendTo( "#" + parentElementId );
	$( "<select/>",
		{
			"class": "combobox", "id": "pivot_x1_choice", html: pivot1List.join("")
		}
	).appendTo( "#" + parentElementId );
	$( "<span/>",
		{ "style": "margin-left: 15px", "class": "refinery-facet-label", html: "Columns"
		}
	).appendTo( "#" + parentElementId );
	$( "<select/>",
		{
			"class": "combobox", "id": "pivot_y1_choice", html: pivot2List.join("")
		}
	).appendTo( "#" + parentElementId );

	// events on pivot dimensions
	$( "#pivot_x1_choice" ).change( function( ) {
		var pivot_x1 = this.value;
		var pivot_y1 = $( "#pivot_y1_choice option:selected" ).attr( "value" );
		
		if ( pivot_x1 !== "" )
		{
			self.setFacet1( pivot_x1 );
		}
				
		if ( pivot_y1 !== "" )
		{
			self.setFacet2( pivot_y1 );
		}
								
		if ( self._facet1 !== undefined && self._facet2 !== undefined ) {
			self._matrix = undefined;
			self._query.setPivots( self._facet1, self._facet2 );		
	   		self._commands.execute( SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND, { "facet1": self._facet1, "facet2": self._facet2  } );			
		}
   	} );		

	$( "#pivot_y1_choice" ).change( function( ) {
		var pivot_x1 = $( "#pivot_x1_choice option:selected" ).attr( "value" );
		var pivot_y1 = this.value;
		
		if ( pivot_x1 !== "" )
		{
			self._facet1 = pivot_x1;			
		}
				
		if ( pivot_y1 !== "" )
		{
			self._facet2 = pivot_y1;
		}

		if ( self._facet1 !== undefined && self._facet2 !== undefined ) {
			self._matrix = undefined;			
			self._query.setPivots( self._facet1, self._facet2 );		
   			self._commands.execute( SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND, { "facet1": self._facet1, "facet2": self._facet2  } );
   		}
   	} );   
}


SolrPivotMatrix.prototype._generateMatrix = function( pivotCounts, facet1, facet2 ) {	
	var self = this;
	
	// get lookup table for facets (mapping from facet value to facet value index)
	var facetValue1Lookup = self._query.getFacetValueLookupTable( facet1 );		
	var facetValue2Lookup = self._query.getFacetValueLookupTable( facet2 );

	// make empty 2D array of the expected dimensions
	var pivotMatrix = new Array( Object.keys( facetValue1Lookup ).length );
	
	var rows = [];
		
	for ( var i = 0; i < pivotMatrix.length; ++i ) {
		pivotMatrix[i] = new Array( Object.keys( facetValue2Lookup ).length );
		
		for ( var j = 0; j < pivotMatrix[i].length; ++j ) {
			pivotMatrix[i][j] =
			{
				x: j,
				y: i,
				xlab: Object.keys( facetValue2Lookup )[j],
				xfacet: self._facet2,
				ylab: Object.keys( facetValue1Lookup )[i],
				yfacet: self._facet1, count: 0
			};
		}
	}
			
	// fill 2D array
	if ( pivotCounts[facet1 + "," + facet2] ) {			
		var tableData = pivotCounts[facet1 + "," + facet2];
		var tableRows = [];
		
		for ( var r = 0; r < tableData.length; ++r ) {
			var facetValue1 = tableData[r].value;								 
			var facetValue1Index = facetValue1Lookup[facetValue1];
			
			for ( var c = 0; c < tableData[r].pivot.length; ++c ) {
				var facetValue2 = tableData[r].pivot[c].value;
				var facetValue2Index = facetValue2Lookup[facetValue2];
				
				pivotMatrix[facetValue1Index][facetValue2Index].count = tableData[r].pivot[c].count; 					
			}
		}
	}
	
	return pivotMatrix;	
}


SolrPivotMatrix.prototype.getMatrixMax = function( matrix ) {
	var max = 0;
	for (var row = 0; row < matrix.length; ++row) {
		for (var col = 0; col < matrix[row].length; ++col) {
			max = Math.max(max, matrix[row][col].count);
		}		
	}
	
	return max;
} 	



SolrPivotMatrix.prototype.setFacet1 = function( facet ) {
	var self = this;

	self._rowOrderIndex = undefined;
	self._columnOrderIndex = undefined;
		
	self._facet1 = facet;
	
	return this;
}


SolrPivotMatrix.prototype.getFacet1 = function() {
	var self = this;

	return self._facet1;
}



SolrPivotMatrix.prototype.setFacet2 = function( facet ) {
	var self = this;

	self._rowOrderIndex = undefined;
	self._columnOrderIndex = undefined;
	
	self._facet2 = facet;
	
	return this;
}


SolrPivotMatrix.prototype.getFacet2 = function() {
	var self = this;

	return self._facet2;
}


SolrPivotMatrix.prototype.updateMatrix = function( solrResponse ) {
	
	var self = this;

	if ( solrResponse ) {
		if ( solrResponse.getPivotCounts() ) {
			self._matrix = self._generateMatrix( solrResponse.getPivotCounts(), self._facet1, self._facet2 );							
		}
		else {
			return;
		}
	}
	
	self.render();							
}



