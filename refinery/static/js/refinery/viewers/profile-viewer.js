// based on http://bl.ocks.org/1182434

registerKeyboardHandler = function(callback) {
  var callback = callback;
  d3.select(window).on("keydown", callback);  
};

ProfileViewer = function(elemid, options) {
  var self = this;
  this.chart = document.getElementById(elemid);
  this.cx = this.chart.clientWidth;
  this.cy = this.chart.clientHeight;
  this.options = options || {};
  this.options.xmax = options.xmax || 30;
  this.options.xmin = options.xmin || 0;
  this.options.ymax = options.ymax || 10;
  this.options.ymin = options.ymin || 0;
  this.loading = false;
  this.zoom_level_ranges = null;
  
  // retrieve zoom table for this sequence
  d3.json( this.options.base_url + "/" + this.options.uuid + "/" + this.options.sequence_name + "/zoom_levels",
  		function ( result ) {
  			self.zoom_level_ranges = result;
  			auto_zoom_level = self.get_auto_zoom_level();
  			
  			self.loading = true;
  			d3.json( self.options.base_url + "/" + self.options.uuid + "/" + self.options.sequence_name + "/" + auto_zoom_level + "/" + Math.max( 1, self.options.start_location ) + "/" + self.options.end_location,
  				function ( result ) { self.loading = false; self.update_points( self, result ); } );  			
  			} );


  this.padding = {
     "top":    this.options.title  ? 40 : 20,
     "right":                 30,
     "bottom": this.options.xlabel ? 60 : 10,
     "left":   this.options.ylabel ? 70 : 45
  };

  this.size = {
    "width":  this.cx - this.padding.left - this.padding.right,
    "height": this.cy - this.padding.top  - this.padding.bottom
  };

  // x-scale
  this.x = d3.scale.linear()
      .domain([this.options.xmin, this.options.xmax])
      .range([0, this.size.width]);

  // drag x-axis logic
  this.downx = Math.NaN;

  // y-scale (inverted domain)
  this.y = d3.scale.linear()
      .domain([this.options.ymax, this.options.ymin])
      .nice()
      .range([0, this.size.height])
      .nice();

  // drag y-axis logic
  this.downy = Math.NaN;

  this.dragged = this.selected = null;

  this.line = d3.svg.line()
      .x(function(d, i) { return this.x(this.points[i].x); })
      .y(function(d, i) { return this.y(this.points[i].y); });

  var xrange =  (this.options.xmax - this.options.xmin);
  var yrange2 = (this.options.ymax - this.options.ymin) / 2;
  var yrange4 = yrange2 / 2;
  
  this.points = []; // d3.range(datacount).map( function( i ) { return {}; }, self);
 
  this.vis = d3.select(this.chart).append("svg")
      .attr("width",  this.cx)
      .attr("height", this.cy)
      .append("g")
        .attr("transform", "translate(" + this.padding.left + "," + this.padding.top + ")");

  this.plot = this.vis.append("rect")
      .attr("width", this.size.width)
      .attr("height", this.size.height)
      .style("fill", "#fafafa")
      .attr("pointer-events", "all")
      .on("mousedown.drag", self.plot_drag())
      .on("touchstart.drag", self.plot_drag());
  
  // activate zooming
  //this.plot.call(d3.behavior.zoom().x(this.x).y(this.y).on("zoom", this.redraw()));
  this.plot.call(d3.behavior.zoom().x(this.x).on("zoom", this.redraw()));
  
  this.vis.append("svg")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", this.size.width)
      .attr("height", this.size.height)
      .attr("viewBox", "0 0 "+this.size.width+" "+this.size.height)
      .attr("class", "line")
      .append("path")
          .attr("class", "line")
          .attr("d", this.line(this.points));

  // add Chart Title
  if (this.options.title) {
    this.vis.append("text")
        .attr("class", "axis")
        .text(this.options.title)
        .attr("x", this.size.width/2)
        .attr("dy","-0.8em")
        .style("text-anchor","middle");
  }

  // Add the x-axis label
  if (this.options.xlabel) {
    this.vis.append("text")
        .attr("class", "axis")
        .text(this.options.xlabel)
        .attr("x", this.size.width/2)
        .attr("y", this.size.height)
        .attr("dy","2.4em")
        .style("text-anchor","middle");
  }

  // add y-axis label
  if (this.options.ylabel) {
    this.vis.append("g").append("text")
        .attr("class", "axis")
        .text(this.options.ylabel)
        .style("text-anchor","middle")
        .attr("transform","translate(" + -40 + " " + this.size.height/2+") rotate(-90)");
  }

  d3.select(this.chart)
      .on("mousemove.drag", self.mousemove())
      .on("touchmove.drag", self.mousemove())
      .on("mouseup.drag",   self.mouseup())
      .on("touchend.drag",  self.mouseup());

  //this.redraw()();
};
  
//
// ProfileViewer methods
//

ProfileViewer.prototype.update_points = function ( instance, result ) {
	//console.log( result );
	var self = this;
	
	var max = Number.MIN_VALUE;
	
	for ( var i = 0; i < result.length; ++i )
	{
		result[i][2] > max ? max = result[i][2] : 0;		
		
		this.points = d3.range(result.length).map(function(i) { 
    		return { x: result[i][0], y: result[i][2] }; 
  				}, self);

		//this.points.push( { x: result[i].start, y: result[i].mean } );
	}
	
	/*
	// re-scale y-axis for new data -- not really recommended
	instance.y = d3.scale.linear()
      .domain([max, 0])
      .nice()
      .range([0, instance.size.height])
      .nice();
    */

	
	// refresh the view
	instance.redraw()();
};


ProfileViewer.prototype.get_auto_zoom_level = function ( instance ) {
	//console.log( result );
	var self = this;
	
	if ( self.zoom_level_ranges != null )
	{
		// compute current bp_per_unit from window size and plot width
	    var window_in_bp = Math.ceil( self.x.domain()[1] ) - Math.floor( self.x.domain()[0] ); 
		var bp_per_unit = window_in_bp/self.size.width; 
		 		
		for ( var zoom_level in self.zoom_level_ranges )
		{
			if ( ( bp_per_unit > self.zoom_level_ranges[zoom_level][0] ) && ( bp_per_unit < self.zoom_level_ranges[zoom_level][1] ) )
			{
				return zoom_level;
			}
		}
	}
	
	return "z0"; 
};



ProfileViewer.prototype.plot_drag = function() {
  var self = this;
  return function() {
    registerKeyboardHandler(self.keydown());
    d3.select('body').style("cursor", "move");
    if (d3.event.altKey) {
      var p = d3.svg.mouse(self.vis.node());
      var newpoint = {};
      newpoint.x = self.x.invert(Math.max(0, Math.min(self.size.width,  p[0])));
      newpoint.y = self.y.invert(Math.max(0, Math.min(self.size.height, p[1])));
      self.points.push(newpoint);
      self.points.sort(function(a, b) {
        if (a.x < b.x) { return -1 };
        if (a.x > b.x) { return  1 };
        return 0
      });
      self.selected = newpoint;
      self.update();
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }    
  }
};

ProfileViewer.prototype.update = function() {
  var self = this;
  var lines = this.vis.select("path").attr("d", this.line(this.points));
        
  /*
  var circle = this.vis.select("svg").selectAll("circle")
      .data(this.points, function(d) { return d; });
  
  circle.enter().append("circle")
      .attr("class", function(d) { return d === self.selected ? "selected" : null; })
      .attr("cx",    function(d) { return self.x(d.x); })
      .attr("cy",    function(d) { return self.y(d.y); })
      .attr("r", 10.0)
      .style("cursor", "ns-resize")
      .on("mousedown.drag",  self.datapoint_drag())
      .on("touchstart.drag", self.datapoint_drag());

  circle
      .attr("class", function(d) { return d === self.selected ? "selected" : null; })
      .attr("cx",    function(d) { 
        return self.x(d.x); })
      .attr("cy",    function(d) { return self.y(d.y); });

  circle.exit().remove();
  */

  if (d3.event && d3.event.keyCode) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }
}

ProfileViewer.prototype.datapoint_drag = function() {
  var self = this;
  return function(d) {
    registerKeyboardHandler(self.keydown());
    document.onselectstart = function() { return false; };
    self.selected = self.dragged = d;
    self.update();
    
  }
};

ProfileViewer.prototype.mousemove = function() {
  var self = this;
  return function() {
    var p = d3.svg.mouse(self.vis[0][0]),
        t = d3.event.changedTouches;
    
    if (self.dragged) {
      self.dragged.y = self.y.invert(Math.max(0, Math.min(self.size.height, p[1])));
      self.update();
    };
    if (!isNaN(self.downx)) {
      d3.select('body').style("cursor", "ew-resize");
      var rupx = self.x.invert(p[0]),
          xaxis1 = self.x.domain()[0],
          xaxis2 = self.x.domain()[1],
          xextent = xaxis2 - xaxis1;
      if (rupx != 0) {
        var changex, new_domain;
        changex = self.downx / rupx;
        new_domain = [xaxis1, xaxis1 + (xextent * changex)];
        self.x.domain(new_domain);
        self.redraw()();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    };
    if (!isNaN(self.downy)) {
      d3.select('body').style("cursor", "ns-resize");
      var rupy = self.y.invert(p[1]),
          yaxis1 = self.y.domain()[1],
          yaxis2 = self.y.domain()[0],
          yextent = yaxis2 - yaxis1;
      if (rupy != 0) {
        var changey, new_domain;
        changey = self.downy / rupy;
        new_domain = [yaxis1 + (yextent * changey), yaxis1];
        self.y.domain(new_domain);
        self.redraw()();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }
};

ProfileViewer.prototype.mouseup = function() {
  var self = this;
  return function() {
    document.onselectstart = function() { return true; };
    d3.select('body').style("cursor", "auto");
    d3.select('body').style("cursor", "auto");
    if (!isNaN(self.downx)) {
      self.redraw()();
      self.downx = Math.NaN;
      d3.event.preventDefault();
      d3.event.stopPropagation();
    };
    if (!isNaN(self.downy)) {
      self.redraw()();
      self.downy = Math.NaN;
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    if (self.dragged) { 
      self.dragged = null 
    }
  }
}

ProfileViewer.prototype.keydown = function() {
  var self = this;
  return function() {
    if (!self.selected) return;
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = self.points.indexOf(self.selected);
        self.points.splice(i, 1);
        self.selected = self.points.length ? self.points[i > 0 ? i - 1 : 0] : null;
        self.update();
        break;
      }
    }
  }
};


ProfileViewer.prototype.redraw = function() {
  var self = this;
  return function() {
    var tx = function(d) {
      return "translate(" + self.x(d) + ",0)"; 
    },
    ty = function(d) { 
      return "translate(0," + self.y(d) + ")";
    },
    stroke = function(d) { 
      //return d ? "#ccc" : "#666"; 
      // don't plot grid lines
      return d ? "" : "#666"; 
    },
    fx = self.x.tickFormat(10),
    fy = self.y.tickFormat(10);
    
    // limit zooming and panning: http://stackoverflow.com/questions/10422738/limiting-domain-when-zooming-or-panning-in-d3-js
    // TODO: set correct maximum value
	self.x.domain([ Math.max(self.x.domain()[0], 1 ), self.x.domain()[1] ] );
	//self.x.domain([Math.max(self.x.domain()[0], 1 ), Math.min(self.x.domain()[1], 10000000)]);
    //self.y.domain([Math.max(self.y.domain()[0], self.options.ymin), Math.min(self.y.domain()[1], self.options.ymax)]);
    
        
    // update y-axis range

    // Regenerate x-ticks…
    var gx = self.vis.selectAll("g.x")
        .data(self.x.ticks(10), String)
        .attr("transform", tx);

    gx.select("text")
        .text(fx);
     
    var gxe = gx.enter().insert("g", "a")
        .attr("class", "x")
        .attr("transform", tx);
    
    gxe.append("line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", self.size.height);

    gxe.append("text")
        .attr("class", "axis")
        .attr("y", self.size.height)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .text(fx)
        .style("cursor", "ew-resize")
        .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
        .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
        .on("mousedown.drag",  self.xaxis_drag())
        .on("touchstart.drag", self.xaxis_drag());

    gx.exit().remove();

    // Regenerate y-ticks…
    var gy = self.vis.selectAll("g.y")
        .data(self.y.ticks(10), String)
        .attr("transform", ty);

    gy.select("text")
        .text(fy);

    var gye = gy.enter().insert("g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", self.size.width);        

    gye.append("text")
        .attr("class", "axis")
        .attr("x", -3)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(fy)
        .style("cursor", "ns-resize")
        .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
        .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
        .on("mousedown.drag",  self.yaxis_drag())
        .on("touchstart.drag", self.yaxis_drag());

    gy.exit().remove();

    // check if there are enough data points in the buffer
    if ( ( ( self.x.domain()[0] < self.options.xmin ) || ( self.x.domain()[1] > self.options.xmax ) ) )
    {
	    console.log( "Need more data! " + self.x.domain() );
	    
    	if ( !self.loading )
    	{    	
		    console.log( "Sending request" );
	    	
	    	self.loading = true; 
	    	self.options.xmin = Math.floor( self.x.domain()[0] ); 
	    	self.options.xmax = Math.ceil( self.x.domain()[1] ); 
	
		    d3.json( self.options.base_url + "/" + self.options.uuid + "/" + self.options.sequence_name + "/" + self.get_auto_zoom_level() + "/" + Math.max( 1, self.options.xmin ) + "/" + self.options.xmax,
	  			function ( result ) { self.loading = false; self.update_points( self, result ); } );
     	}
     	else {
		    console.log( "Request in process" );     		
     	}
    }
    
    //self.plot.call(d3.behavior.zoom().x(self.x).y(self.y).on("zoom", self.redraw()));
    
	self.plot.call( d3.behavior.zoom().x(self.x).on( "zoom", self.redraw() ) );
    self.update();    
  }  
}

ProfileViewer.prototype.xaxis_drag = function() {
  var self = this;
  return function(d) {
    document.onselectstart = function() { return false; };
    var p = d3.svg.mouse(self.vis[0][0]);
    self.downx = self.x.invert(p[0]);
  }
};

ProfileViewer.prototype.yaxis_drag = function(d) {
  var self = this;
  return function(d) {  	
    document.onselectstart = function() { return false; };
    var p = d3.svg.mouse(self.vis[0][0]);
    self.downy = self.y.invert(p[1]);
  }
};


// Resizes profile viewer depending on browser width
ProfileViewer.prototype.browser_resize = function(options) {
  var self = this;
  
  this.cx = options.width || this.cx;
  //this.cy = options.height || this.cy;
  
  this.size = {
    "width":  this.cx - this.padding.left - this.padding.right,
    "height": this.cy - this.padding.top  - this.padding.bottom
  };
  
  // x-scale
  this.x = d3.scale.linear()
      .domain([this.options.xmin, this.options.xmax])
      .range([0, this.size.width]);

  // drag x-axis logic
  this.downx = Math.NaN;

  // y-scale (inverted domain)
  this.y = d3.scale.linear()
      .domain([this.options.ymax, this.options.ymin])
      .nice()
      .range([0, this.size.height])
      .nice();
 
  // resizes d3 container svg element 
  d3.select(this.chart).select("svg")
  	  .attr("width",  this.cx - this.padding.right)
      .attr("height", this.cy)
  
  // resizes plot
  this.plot 
      .attr("width", this.size.width)
      .attr("height", this.size.height)
 
  // resizes svg window and viewBox    
  this.vis.select("svg")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", this.size.width)
      .attr("height", this.size.height)
      .attr("viewBox", "0 0 "+this.size.width+" "+this.size.height)
      .attr("class", "line")
 
  this.redraw()();
};

