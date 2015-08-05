function RefineryBoxPlotService($window, $) {
  var that = this;
  that.$ = $;
  that.$window = $window;
}

RefineryBoxPlotService.prototype.generate = function (config) {
  this.$window.sizing();
  var refineryBoxPlot = {};

  d3.svg.box = function() {
    var box, plotKey, scale, whisker, width;
    plotKey = {
      min: 'min',
      q1: 'q1',
      med: 'med',
      q3: 'q3',
      max: 'max',
      mean: 'mean'
    };

    scale = function(d) {
      return d;
    };
    
    width = 30;
    
    whisker = function(source, target) {
      return function() {
        var s;
        s = this.append('g').classed('whisker', true);
        s.append('path').attr({
          d: "M" + source[0] + "," + source[1] + "L" + target[0] + "," + target[1]
        });
        return s.append('path').attr({
          d: "M0," + target[1] + "L" + (target[0] * 2) + "," + target[1]
        });
      };
    };
    
    box = function(g) {
      return g.each(function() {
        var scaled, six;
        g = d3.select(this);
        six = this.__data__;
        scaled = {};
    
        d3.keys(six).forEach(function(k) {
          return scaled[k] = scale(six[k]);
        });
    
        g.append('rect').attr({
          width: width,
          height: Math.abs(scaled[plotKey.q3] - scaled[plotKey.q1]),
          x: 0,
          y: scaled[plotKey.q3]
        });
    
        g.append('line').attr({
          x1: 0,
          x2: width,
          y1: scaled[plotKey.med],
          y2: scaled[plotKey.med]
        });
    
        if (scaled[plotKey.mean]) {
          g.append('line').attr({
            x1: 0,
            x2: width,
            y1: scaled[plotKey.mean],
            y2: scaled[plotKey.mean],
            'stroke-dasharray': '2 1'
          });
        }
    
        g.call(whisker([width / 2, scaled[plotKey.q1]], [width / 2, scaled[plotKey.min]]));
        return g.call(whisker([width / 2, scaled[plotKey.q3]], [width / 2, scaled[plotKey.max]]));
      });
    };
    
    box.scale = function(_s) {
      if (!_s) {
        return scale;
      }

      scale = _s;
      return box;
    };
    
    box.width = function(_w) {
      if (!_w) {
        return width;
      }
    
      width = _w;
      return box;
    };
    
    box.plotKey = function(_k) {
      if (!_k) {
        return key;
      }
    
      plotKey = _k;
      return box;
    };
    
    return box;
  };

  function boxPlot(svg, data, option) {
    var box, boxMargin, boxWidth, h, labels, main, margin, w, xAxis, xScale, yAxis, yDomain, yScale;

    if (option == null) {
      option = {};
    }

    var width = this.$(svg[0]).width();
    var height = this.$(svg[0]).height();
    svg.attr('viewBox', '0 0 ' + width + ' ' + height);

    if (!option.yTickFormat) {
      option.yTickFormat = function(y) {
        return y;
      };
    }

    if (!option.xTickFormat) {
      option.xTickFormat = function(x) {
        return x;
      };
    }

    if (!option.plotKey) {
      option.plotKey = {
        min: 'min',
        q1: 'q1',
        med: 'med',
        q3: 'q3',
        max: 'max',
        mean: 'mean'
      };
    }

    margin = {
      top: 20,
      left: 50,
      bottom: 40,
      right: 20
    };

    main = svg.attr('class', 'fastqc-chart-drawspace-svg').append('g').attr({
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
      transform: "translate(" + margin.left + "," + margin.top + ")"
    });

    w = main.attr('width');
    h = main.attr('height');

    labels = data[0].values.map(function(v) {
      return v.key;
    });

    boxWidth = w / labels.length;
    boxMargin = 0;

    if (boxWidth > 30) {
      boxMargin = boxWidth - 25;
      boxWidth = 25;
    } else if ((30 >= boxWidth && boxWidth > 20)) {
      boxMargin = boxWidth - 20;
      boxWidth = 20;
    } else if ((20 >= boxWidth && boxWidth > 10)) {
      boxMargin = boxWidth - 10;
      boxWidth = 10;
    }

    yDomain = 35;

    xScale = d3.scale.ordinal().domain(labels).rangePoints([0, w], 1);
    yScale = d3.scale.linear().domain([0, yDomain]).range([h, 0]);
    xAxis = d3.svg.axis().scale(xScale).tickFormat(option.xTickFromat);
    yAxis = d3.svg.axis().scale(yScale).orient('left').tickSize(-w).ticks(7).tickFormat(option.yTickFormat);

    main.append('g').classed('fastqc-box-x fastqc-box-axis', true).call(xAxis).attr({
      transform: "translate(0," + h + ")"
    });

    main.append('g').classed('fastqc-box-y fastqc-box-axis', true).call(yAxis);
    box = d3.svg.box().scale(yScale).width(boxWidth).plotKey(option.plotKey);

    return data.map(function(d, i) {
      var kind;
      kind = d.key;

      data = d.values.map(function(v) {
        return v.values[0];
      });

      return main.selectAll("g." + kind).data(data).enter().append('g').classed("fastqc-box", true).attr({
        transform: function(_d, _i) {
          return "translate(" + (_i * (box.width() + boxMargin) + boxMargin / 2) + ",0)";
        }
      })
      .call(box);
    });
  }

  refineryBoxPlot.plot = function (data, config) {
    var w = config ? config.w || 500 : 500;
    var h = config ? config.h || 300 : 300;
    var b = config ? config.bindto || 'body' : 'body';

    var nest = d3.nest().key(function(d) {
      return d.kind;
    }).key(function(d) {
      return d.label;
    }).entries(data);
    return boxPlot(d3.select(b).append('svg'), nest);
  };

  // Actual plotting done here. Above is "library".
  return refineryBoxPlot.plot(config.data, config.config);
};

angular
  .module('refineryChart')
  .service('refineryBoxPlotService', ['$window', '$', RefineryBoxPlotService]);