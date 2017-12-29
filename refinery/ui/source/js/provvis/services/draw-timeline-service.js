/**
 * provvis Draw Timeline Service
 * @namespace provvisDrawTimelineService
 * @desc Service for drawing the timeline views
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDrawTimelineService', provvisDrawTimelineService);

  provvisDrawTimelineService.$inject = [
    'provvisAnalysisTimelineService',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisDrawTimelineService (
    provvisAnalysisTimelineService,
    provvisHelpersService,
    provvisPartsService
  ) {
    var analysisTimeline = provvisAnalysisTimelineService;
    var provvisHelpers = provvisHelpersService;
    var partsService = provvisPartsService;
    var service = {
      drawTimelineView: drawTimelineView
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
      /**
   * Draws the timeline view.
   * @param vis The provenance visualization root object.
   */
    function drawTimelineView (vis) {
      var aNodesBAK = partsService.aNodesBAK;
      var timeLineGradientScale = partsService.timeLineGradientScale;
      var svg = d3.select('#provenance-timeline-view').select('svg').append('g')
        .append('g').attr('transform', function () {
          return 'translate(20,0)';
        });

      var tlHeight = 50;
      var tlWidth = 250;

      var x = d3.scale.linear()
        .domain([0, tlWidth])
        .range([0, tlWidth]);

      var y = d3.scale.linear()
        .domain([5, 0])
        .range([0, tlHeight - 10]);
      timeLineGradientScale = d3.time.scale()
        .domain([Date.parse(partsService.timeColorScale.domain()[0]),
          Date.parse(partsService.timeColorScale.domain()[1])])
        .range([0, tlWidth])
        .nice();

      var xAxis = d3.svg.axis()
        .scale(timeLineGradientScale)
        .orient('bottom')
        .ticks(5);

      var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(7);

      var tlTickCoords = d3.map();

      aNodesBAK.forEach(function (an) {
        tlTickCoords.set(an.autoId,
          timeLineGradientScale(provvisHelpers.parseISOTimeFormat(an.start)));
      });

      /**
       * Drag start listener support for time lines.
       */
      var dragLineStart = function () {
        d3.event.sourceEvent.stopPropagation();
      };

      /**
       * Get lower and upper date threshold date in timeline view.
       * @param l Time line.
       * @returns {Array} An array of size 2 containing both the lower and upper
       * threshold date.
       */
      var getTimeLineThresholds = function (l) {
        var lowerTimeThreshold = Object.create(null);
        var upperTimeThreshold = Object.create(null);

        if (l.className === 'startTimeline') {
          lowerTimeThreshold = l.time;
          upperTimeThreshold = d3.select('.endTimeline').data()[0].time;
        } else {
          lowerTimeThreshold = d3.select('.startTimeline').data()[0].time;
          upperTimeThreshold = l.time;
        }

        return [lowerTimeThreshold, upperTimeThreshold];
      };

      /**
       * Update lower and upper date threshold label in timeline view.
       * @param l Time line.
       */
      var updateTimelineLabels = function (l) {
        var tlThreshold = getTimeLineThresholds(l);
        tlThreshold[1].setSeconds(tlThreshold[1].getSeconds() + 1);

        var labelStart = provvisHelpers.customTimeFormat(tlThreshold[0]);
        var labelEnd = provvisHelpers.customTimeFormat(tlThreshold[1]);

        d3.select('#tlThresholdStart').html('Start: ' + labelStart);
        d3.select('#tlThresholdEnd').html('End: ' + labelEnd);

        d3.selectAll('.tlAnalysis').each(function (an) {
          if (provvisHelpers.parseISOTimeFormat(an.start) < tlThreshold[0] ||
            provvisHelpers.parseISOTimeFormat(an.start) > tlThreshold[1]) {
            d3.select(this).classed('blendedTLAnalysis', true);
          } else {
            d3.select(this).classed('blendedTLAnalysis', false);
          }
        });
      };

      /**
       * Drag listener.
       * @param l Time line.
       */
      var draggingLine = function (l) {
        /* Check borders. */
        if (d3.event.x < 0) {
          l.x = 0;
        } else if (d3.event.x > tlWidth) {
          l.x = tlWidth;
        } else {
          l.x = d3.event.x;
        }
        l.time = new Date(timeLineGradientScale.invert(l.x));

        /* Update lines. */
        d3.select(this).attr('transform', function () {
          return 'translate(' + x(l.x) + ',0)';
        });

        /* Update labels. */
        updateTimelineLabels(l);

        /* TODO: Temporarily disabled live filtering as it does not scale
         * well with big graphs. */

        /* On hover filter update. */
        /* if (d3.entries(tlTickCoords).some(function (t) {

         if (l.className === "startTimeline") {

         */
        /* Left to right. */
        /*
         if (l.x > l.lastX) {
         if (x(l.x) - x(t.value) > 0 && x(l.x) - x(t.value) <= 1) {
         return true;
         } else {
         return false;
         }
         */
        /* Right to left. */
        /*
         } else {
         if (x(l.x) - x(t.value) >= -1 && x(l.x) - x(t.value) < 0) {
         return true;
         } else {
         return false;
         }
         }
         } else {
         */
        /* Right to left. */
        /*
         if (l.x < l.lastX) {

         */
        /* TODO: Small bug, time scale is off by 30 seconds. */
        /*
         if (x(l.x) - x(t.value) >= -5 && x(l.x) - x(t.value) < 0) {
         return true;
         } else {
         return false;
         }
         */
        /* Left to right. */
        /*
         } else {
         if (x(l.x) - x(t.value) > 0 && x(l.x) - x(t.value) <= 1) {
         return true;
         } else {
         return false;
         }
         }
         }
         })) {
         filterAnalysesByTime(getTimeLineThresholds(l)[0],
         getTimeLineThresholds(l)[1], vis);
         }*/

        /* Remember last drag x coord. */
        l.lastX = l.x;
      };

      /**
       * Drag end listener.
       * @param l Time line.
       */
      var dragLineEnd = function (l) {
        l.time = new Date(timeLineGradientScale.invert(l.x));

        /* Update labels. */
        updateTimelineLabels(l);

        /* Filter action. */
        analysisTimeline.filterAnalysesByTime(getTimeLineThresholds(l)[0],
          getTimeLineThresholds(l)[1], vis);

        partsService.filterMethod = 'timeline';
      };

      /**
       * Sets the drag events for time lines.
       * @param nodeType The dom lineset to allow dragging.
       */
      var applyTimeLineDragBehavior = function (domDragSet) {
        /* Drag and drop line enabled. */
        var dragLine = d3.behavior.drag()
          .origin(function (d) {
            return d;
          })
          .on('dragstart', dragLineStart)
          .on('drag', draggingLine)
          .on('dragend', dragLineEnd);

        /* Invoke dragging behavior on nodes. */
        domDragSet.call(dragLine);
      };

      /* Geometric zoom. */
      var redrawTimeline = function () {
        /* Translations. */
        svg.selectAll('.tlAnalysis')
          .attr('x1', function (an) {
            return x(timeLineGradientScale(provvisHelpers.parseISOTimeFormat(an.start)));
          })
          .attr('x2', function (an) {
            return x(timeLineGradientScale(provvisHelpers.parseISOTimeFormat(an.start)));
          });

        svg.selectAll('.startTimeline, .endTimeline')
          .attr('transform', function (d) {
            return 'translate(' + x(d.x) + ',' + 0 + ')';
          });

        svg.select('#timelineView')
          .attr('x', x(0))
          .attr('width', x(tlWidth) - x(0));

        svg.select('#tlxAxis')
          .attr('transform', function () {
            return 'translate(' + x(0) + ',' + tlHeight + ')';
          });

        svg.select('#tlxAxis').selectAll('.tick')
          .attr('transform', function (d) {
            return 'translate(' + (x(timeLineGradientScale(d)) -
            (d3.event.translate[0])) + ',' + 0 + ')';
          });

        svg.select('#tlxAxis').select('path').attr('d', function () {
          return 'M0,6V0H' + (tlWidth * d3.event.scale) + 'V6';
        });

        svg.select('#tlyAxis')
          .attr('transform', function () {
            return 'translate(' + x(0) + ',' + 10 + ')';
          });
      };

      /* Timeline zoom behavior. */
      var timelineZoom = d3.behavior.zoom().x(x).scaleExtent([1, 10])
        .on('zoom', redrawTimeline);

      timelineZoom(svg);

      var gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'gradientGrayscale');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#fff')
        .attr('stop-opacity', 1);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#000')
        .attr('stop-opacity', 1);

      svg.append('rect')
        .attr('id', 'timelineView')
        .attr('x', 0)
        .attr('y', 10)
        .attr('width', tlWidth)
        .attr('height', tlHeight - 10)
        .style({
          fill: 'url(#gradientGrayscale)',
          stroke: 'white',
          'stroke-width': '1px'
        });

      svg.append('g')
        .classed({
          x: true,
          axis: true
        })
        .attr('id', 'tlxAxis')
        .attr('transform', 'translate(0,' + tlHeight + ')')
        .call(xAxis);

      svg.append('g')
        .classed({
          y: true,
          axis: true
        })
        .attr('id', 'tlyAxis')
        .attr('transform', 'translate(0,' + 10 + ')')
        .call(yAxis);

      d3.select('#tlyAxis').selectAll('.tick').each(function (d) {
        if (d === 5) {
          d3.select(this).select('text').text('>5');
        }
      });

      var startTime = {
        className: 'startTimeline',
        x: 0,
        lastX: -1,
        time: new Date(timeLineGradientScale.invert(0))
      };
      var endTime = {
        className: 'endTimeline',
        x: tlWidth,
        lastX: tlWidth + 1,
        time: new Date(timeLineGradientScale.invert(tlWidth))
      };

      var timeLineThreshold = svg.selectAll('.line')
        .data([startTime, endTime])
        .enter().append('g').attr('transform', function (d) {
          return 'translate(' + d.x + ',0)';
        }).attr('class', function (d) {
          return d.className;
        });

      timeLineThreshold.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', tlHeight);

      timeLineThreshold.append('polygon').classed('timeMarker', true)
        .attr('points', '0,50 5,60 -5,60');
      timeLineThreshold.append('polygon').classed('timeMarker', true)
        .attr('points', '0,10 5,0 -5,0');

      svg.selectAll('.line')
        .data(function () {
          return vis.graph.aNodes;
        })
        .enter().append('line')
        .attr('id', function (an) {
          return 'tlAnalysisId-' + an.autoId;
        })
        .classed('tlAnalysis', true)
        .attr('x1', function (an) {
          return timeLineGradientScale(provvisHelpers.parseISOTimeFormat(an.start));
        })
        .attr('y1', function (an) {
          return an.children.size() >= 5 ? 10 :
            parseInt(tlHeight - (tlHeight - 10) / 5 * an.children.size(), 10);
        })
        .attr('x2', function (an) {
          return timeLineGradientScale(provvisHelpers.parseISOTimeFormat(an.start));
        })
        .attr('y2', tlHeight);

      d3.selectAll('.startTimeline, .endTimeline').on('mouseover', function () {
        d3.select(this).classed('mouseoverTimeline', true);
      });

      applyTimeLineDragBehavior(d3.selectAll('.startTimeline, .endTimeline'));

      updateTimelineLabels(startTime);
    }
  }
})();
