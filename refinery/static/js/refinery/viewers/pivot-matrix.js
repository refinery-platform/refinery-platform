// based on http://bl.ocks.org/1182434

maxCount = function( matrix ) {
	var max = 0;
	for ( var row = 0; row < matrix.length; ++row ) {
		for ( var col = 0; col < matrix[row].length; ++col ) {
			max = Math.max( max, matrix[row][col].count );
		}		
	}
	
	return max;
} 

PivotMatrix = function(elemid, options, matrix ) {
  var self = this;
  this.chart = document.getElementById(elemid);
  this.cx = this.chart.clientWidth;
  this.cy = this.chart.clientHeight;
  this.options = options || {};
  this.options.ymin = options.ymin || 0;
  
var matrix2 = [ 
			   [
				{x:0, y:0, xlab:"x0",ylab:"y0", count:1},
				{x:1, y:0, xlab:"x1",ylab:"y1", count:2}
			   ], 
			   [
				{x:0, y:1, xlab:"x0",ylab:"y1", count:3},
				{x:1, y:1, xlab:"x1",ylab:"y1", count:4}
			   ],			   
			   [
				{x:0, y:2, xlab:"x0",ylab:"y2", count:5},
				{x:1, y:2, xlab:"x1",ylab:"y2", count:0}
			   ],			   
			   [
				{x:0, y:3, xlab:"x0",ylab:"y3", count:10},
				{x:1, y:3, xlab:"x1",ylab:"y3", count:8}
			   ]			   
			 ];
//var matrix = matrix2;

var margin = {top: 80, right: 20, bottom: 0, left: 80},
    width = Math.max( matrix[0].length * 12, 800 );
    height = Math.max( matrix.length * 12, 500 );

var x = d3.scale.ordinal().rangeBands([0, width]);
var y = d3.scale.ordinal().rangeBands([0, height]);

//var x = d3.fisheye.scale(d3.scale.identity).domain([0, width]).focus(360);
//var y = d3.fisheye.scale(d3.scale.identity).domain([0, height]).focus(90);

var max = maxCount( matrix );
var c = d3.scale.linear().domain([0,max]).range(["white", "black"]).clamp(true);
//var c = d3.scale.category10().domain(d3.range(10));

var svg = d3.select(document.getElementById(elemid)).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    //.style("margin-left", margin.left + "px")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Precompute the orders.
  var orders = {
  	xDefault: d3.range(matrix[0].length).sort(),
  	yDefault: d3.range(matrix.length).sort(),
  	xLabels: d3.range(matrix[0].length).sort(function(a, b) { var labels = $.map( matrix[0], function ( entry ) { return ( entry.xlab ); } ); return d3.ascending(labels[a], labels[b]); }),
  	yLabels: d3.range(matrix.length).sort(function(a, b) { var labels = $.map( matrix, function ( entry ) { return ( entry[0].ylab ); } ); return d3.ascending(labels[a], labels[b]); })
  };

  // The default sort order.
  x.domain(orders.xLabels);
  y.domain(orders.yLabels);

  svg.append("rect")
      .attr("class", "frame")
      .attr("width", width)
      .attr("height", height)
 
  var row = svg.selectAll(".row")
      .data(matrix)
    .enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
      .each(makeRow);

  //row.append("line")
  //    .attr("x2", width);

  row.append("text")
      .attr("x", -6)
      .attr("y", y.rangeBand()/2 )
      .attr("dy", ".32em")
	  .style("font-size", "9px")	            
	  .style("cursor", "pointer")	            
      .attr("text-anchor", "end")
      .text(function(d, row ) { return matrix[row][0].ylab; })
      .on("mouseover", function(p){ d3.selectAll(".row text").classed("active", function(d, i) { return i == p[0].y; }); } )
      .on("mouseout", mouseout)      
      .on("click", function(p) { if ( d3.event.altKey ) { orderRows( orders.yLabels ); } else { orderColumns( computeColumnOrder( p[0].y, false ) ); } }, true );
            

  var column = svg.selectAll(".column")
      .data(matrix[0])
    .enter().append("g")
      .attr("class", "column")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

  //column.append("line")
  //    .attr("x1", -height);

  column.append("text")
      .attr("x", 6 )
      .attr("y", x.rangeBand() / 2 - 10)
      .attr("dy", ".32em")
	  .style("font-size", "9px")	      
	  .style("cursor", "pointer")	            
      .attr("text-anchor", "start")
      .attr("transform", "rotate(45)" )
      .text(function( d, col) { return ( matrix[0][col].xlab ); })
      .on("mouseover", function(p){ d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; }); } )
      .on("mouseout", mouseout)
      .on("click", function(p) { if ( d3.event.altKey ) { orderColumns( orders.xLabels ); } else { orderRows( computeRowOrder( p.x, false ) ); } }, true );
      

  function makeRow(row) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d; }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("height", y.rangeBand() )
        .attr("width", x.rangeBand() )
        .style("fill-opacity", function(d) { return 1; })
        .style("fill", function(d) { return( c(d.count)); })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click", function(p) { console.log( p.xlab + " -- " + p.ylab ); d3.select( this ).style("fill", "#f00" ); } );
  }


  function mouseover(p) {
    d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
    d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
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
        //.delay(function(d, i) { return y(i) * 4; })
        .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });
  }
  
  function orderColumns(order) {
    x.domain(order);

    var t = svg.transition().duration( 0 );

    t.selectAll(".row")
      .selectAll(".cell")
        //.delay(function(d) { return x(d.x) * 4; })
        .attr("x", function(d) { return x(d.x); });

    t.selectAll(".column")
        //.delay(function(d, i) { return x(i) * 4; })
        .attr("transform", function(d, i) { return "translate(" + x(i) + ",0)rotate(-90)"; });
  }
};
