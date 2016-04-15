'use strict';

function RefineryBoxPlotService ($window, $) {
  var that = this;
  that.$ = $;
  that.$window = $window;
}

RefineryBoxPlotService.prototype.generate = function (config) {
  this.$window.sizing();
  var refineryBoxPlot = {};

  d3.svg.box = function () {
    var box;
    var plotKey;
    var scale;
    var whisker;
    var width;
    plotKey = {
      min: 'min',
      q1: 'q1',
      med: 'med',
      q3: 'q3',
      max: 'max',
      mean: 'mean'
    };

    scale = function (d) {
      return d;
    };

    width = 30;

    whisker = function (source, target) {
      return function () {
        var s;
        s = this.append('g').classed('whisker', true);
        s.append('path').attr({
          d: 'M' + source[0] + ',' + source[1] + 'L' + target[0] + ',' + target[1]
        });
        return s.append('path').attr({
          d: 'M0,' + target[1] + 'L' + (target[0] * 2) + ',' + target[1]
        });
      };
    };

    box = function (selection) {
      return selection.each(function () {
        var scaled;
        var six;
        var d3El = d3.select(this);
        six = this.__data__;
        scaled = {};

        d3.keys(six).forEach(function (k) {
          return (scaled[k] = scale(six[k]));
        });

        d3El.append('rect').attr({
          width: width,
          height: Math.abs(scaled[plotKey.q3] - scaled[plotKey.q1]),
          x: 0,
          y: scaled[plotKey.q3]
        });

        d3El.append('line').attr({
          x1: 0,
          x2: width,
          y1: scaled[plotKey.med],
          y2: scaled[plotKey.med]
        });

        if (scaled[plotKey.mean]) {
          d3El.append('line').attr({
            x1: 0,
            x2: width,
            y1: scaled[plotKey.mean],
            y2: scaled[plotKey.mean],
            'stroke-dasharray': '2 1'
          });
        }

        d3El.call(
          whisker(
            [width / 2, scaled[plotKey.q1]], [width / 2, scaled[plotKey.min]]
          )
        );

        return d3El.call(
          whisker(
            [width / 2, scaled[plotKey.q3]], [width / 2, scaled[plotKey.max]]
          )
        );
      });
    };

    box.scale = function (_s) {
      if (!_s) {
        return scale;
      }

      scale = _s;
      return box;
    };

    box.width = function (_w) {
      if (!_w) {
        return width;
      }

      width = _w;
      return box;
    };

    box.plotKey = function (_k) {
      if (!_k) {
        return plotKey;
      }

      plotKey = _k;
      return box;
    };

    return box;
  };

  function boxPlot (svg, data, option) {
    var box;
    var boxMargin;
    var boxWidth;
    var h;
    var labels;
    var main;
    var margin;
    var w;
    var xAxis;
    var xScale;
    var yAxis;
    var yDomain;
    var yScale;

    var _option = option;

    if (!_option) {
      _option = {};
    }

    var width = this.$(svg[0]).width();
    var height = this.$(svg[0]).height();
    svg.attr('viewBox', '0 0 ' + width + ' ' + height);

    if (!_option.yTickFormat) {
      _option.yTickFormat = function (y) {
        return y;
      };
    }

    if (!_option.xTickFormat) {
      _option.xTickFormat = function (x) {
        return x;
      };
    }

    if (!_option.plotKey) {
      _option.plotKey = {
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
      transform: 'translate(' + margin.left + ',' + margin.top + ')'
    });

    w = main.attr('width');
    h = main.attr('height');

    labels = data[0].values.map(function (v) {
      // return v.key;
      return v.values[0].label;
    });

    boxWidth = w / labels.length;
    boxMargin = 0;

    if (boxWidth > 30) {
      boxMargin = boxWidth - 25;
      boxWidth = 25;
    } else if (boxWidth <= 30 && boxWidth > 20) {
      boxMargin = boxWidth - 20;
      boxWidth = 20;
    } else if (boxWidth <= 20 && boxWidth > 10) {
      boxMargin = boxWidth - 10;
      boxWidth = 10;
    }

    yDomain = 35;

    xScale = d3.scale.ordinal().domain(labels).rangePoints([0, w], 1);
    yScale = d3.scale.linear().domain([0, yDomain]).range([h, 0]);
    xAxis = d3.svg.axis().scale(xScale).tickFormat(option.xTickFromat);
    yAxis = d3.svg.axis().scale(yScale).orient('left')
      .tickSize(-w).ticks(7).tickFormat(option.yTickFormat);

    main.append('g')
      .classed('fastqc-box-x fastqc-box-axis', true)
      .call(xAxis)
      .attr('transform', 'translate(0,' + h + ')');

    main.append('g').classed('fastqc-box-y fastqc-box-axis', true).call(yAxis);
    box = d3.svg.box().scale(yScale).width(boxWidth).plotKey(option.plotKey);

    return data.map(function (datum) {
      var kind = datum.key;

      return main.selectAll('g.' + kind)
        .data(datum.values.map(function (value) {
          return value.values[0];
        }))
        .enter()
        .append('g')
        .classed('fastqc-box', true)
        .attr('transform', function (__data, __index) {
          return (
            'translate(' +
            (__index * (box.width() + boxMargin) + boxMargin / 2) +
            ',0)');
        })
        .call(box);
    });
  }

  refineryBoxPlot.plot = function (data, _config) {
    var bindTo = _config ? _config.bindto || 'body' : 'body';

    for (var i = 0; i < data.length; i++) {
      data[i].orderKey = i;
    }

    var nest = d3.nest().key(function (d) {
      return d.kind;
    }).key(function (d) {
      return d.orderKey;
    // return d.label; // Done to prevent d3's nest from being too helpful.
    // Otherwise it messes with the axis labels. For example, in terms of
    // alphanumerical string sorting, '120' < '118-119', not wanted.
    }).entries(data);

    return boxPlot(d3.select(bindTo).append('svg'), nest);
  };

  // Actual plotting done here. Above is "library".
  return refineryBoxPlot.plot(config.data, config.config);
};

angular
  .module('refineryChart')
  .service('refineryBoxPlotService', ['$window', '$', RefineryBoxPlotService]);
