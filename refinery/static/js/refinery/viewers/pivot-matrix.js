// based on http://bl.ocks.org/1182434

var maxCount = function (matrix) {
	var max = 0;
	for (var row = 0; row < matrix.length; ++row) {
		for (var col = 0; col < matrix[row].length; ++col) {
			max = Math.max(max, matrix[row][col].count);
		}		
	}
	
	return max;
} 

var tooltip = d3.select("body")
	.append( "div" )
	.attr( "class", "refinery-tooltip" )
	.style( "position", "absolute" )
	.style( "z-index", "10" )
	.style( "visibility", "hidden" );


PivotMatrix = function( elementId, options, matrix, facets, xPivot, yPivot, useGradient, updateCallback ) {	
	var self = this;
	
	this.chart = document.getElementById(elementId);
	this.cx = this.chart.clientWidth;
	this.cy = this.chart.clientHeight;
	this.options = options || {};
	this.options.ymin = options.ymin || 0;
	this.useGradient = useGradient;
	this.matrix = matrix;
	this.facets = facets;

	var columnLabelLength = 20;
	var rowLabelLength = 20;
	var margin = {top: 150, right: 50, bottom: 0, left: 150},
    	width = Math.max( matrix[0].length * 14, 800 );
    	height = Math.max( matrix.length * 14, 500 );

	var x = d3.scale.ordinal().rangeBands([0, width]);
	var y = d3.scale.ordinal().rangeBands([0, height]);

	//var x = d3.fisheye.scale(d3.scale.identity).domain([0, width]).focus(360);
	//var y = d3.fisheye.scale(d3.scale.identity).domain([0, height]).focus(90);

	var max = maxCount( matrix );

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


	var svg = d3.select(document.getElementById(elementId)).append("svg")
    	.attr("width", width + margin.left + margin.right)
    	.attr("height", height + margin.top + margin.bottom)
    	//.attr("background-color", "transparent")
    	//.style("margin-left", margin.left + "px")
  	.append("g")
    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  	// precompute the orders.
  	var orders = {
	  	xDefault: d3.range(matrix[0].length).sort(),
	  	yDefault: d3.range(matrix.length).sort(),
	  	xLabels: d3.range(matrix[0].length).sort(function(a, b) { var labels = $.map( matrix[0], function ( entry ) { return ( entry.xlab ); } ); return d3.ascending(labels[a], labels[b]); }),
	  	yLabels: d3.range(matrix.length).sort(function(a, b) { var labels = $.map( matrix, function ( entry ) { return ( entry[0].ylab ); } ); return d3.ascending(labels[a], labels[b]); })
  	};

	// The default sort order.
	x.domain(orders.xDefault);
	y.domain(orders.yDefault);

  	svg.append("rect")
		.attr("class", "frame")
		.attr("width", width)
		.attr("height", height)
		.style("fill","none")
		.style("stroke","none");
 
	var row = svg.selectAll(".row")
		.data(matrix)
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
				return ( trimLabel( matrix[row][0].ylab, rowLabelLength ) );
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
				orderColumns( computeColumnOrder( p[0].y, false ) );
				event.preventDefault(); 
			}
      		else {
      			console.log( p );
      			facets[p[0].yfacet][p[0].ylab].isSelected = !facets[p[0].yfacet][p[0].ylab].isSelected;
				updateCallback();      			

      			//orderColumns( computeColumnOrder( p[0].y, false ) );
      		} 
      	}, true );
            

	var column = svg.selectAll(".column")
		.data(matrix[0])
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
				return ( trimLabel( matrix[0][col].xlab, columnLabelLength ) );
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
				orderRows( computeRowOrder( p.x, false ) );
				event.preventDefault(); 
			}
			else {
				facets[p.xfacet][p.xlab].isSelected = !facets[p.xfacet][p.xlab].isSelected;
				updateCallback();      			
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
        			if ( !hasSelection( facets, xPivot ) ) {
						return( selectedColorMap(p.count) );        			        				
        			}
        		}
        		
        		if ( facets[p.xfacet][p.xlab].isSelected ) {
        			if ( !hasSelection( facets, yPivot ) ) {
						return( selectedColorMap(p.count) );        			        				
        			}
        		} 

        		if ( facets[p.xfacet][p.xlab].isSelected && facets[p.yfacet][p.ylab].isSelected ) {
					return( selectedColorMap(p.count) );        			        				
        		} 

    			if ( !hasSelection( facets, xPivot ) && !hasSelection( facets, yPivot ) ) {
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

			updateCallback();      			        	
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
  	return ( d3.range(matrix.length).sort(function(a, b) { var labels = $.map( matrix, function ( entry ) { return ( entry[column].count ); } ); return ( asc ? d3.ascending(labels[a], labels[b]) : d3.descending(labels[a], labels[b]) ); }) );
  }

  function computeColumnOrder( row, asc ) {
  	return ( d3.range(matrix[row].length).sort(function(a, b) { var labels = $.map( matrix[row], function ( entry ) { return ( entry.count ); } ); return ( asc ? d3.ascending(labels[a], labels[b]) : d3.descending(labels[a], labels[b]) ); }) );
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
