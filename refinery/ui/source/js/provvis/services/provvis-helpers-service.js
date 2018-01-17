/**
 * Provvis Helpers Service
 * @namespace provvisHelpersService
 * @desc Service with helper methods for the provvis graph
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisHelpersService', provvisHelpersService);

  provvisHelpersService.$inject = [
    '$',
    'provvisBoxCoordsService',
    'provvisDeclService',
    'provvisPartsService'
  ];

  function provvisHelpersService (
    $,
    provvisBoxCoordsService,
    provvisDeclService,
    provvisPartsService
  ) {
    var coordsService = provvisBoxCoordsService;
    var provvisDecl = provvisDeclService;
    var partsService = provvisPartsService;

    var service = {
      bfs: bfs, // ?? is this even used
      compareMaps: compareMaps,
      concatDomClassElements: concatDomClassElements,
      customTimeFormat: customTimeFormat,
      fitGraphToWindow: fitGraphToWindow,
      getLayerPredCount: getLayerPredCount,
      getLayerSuccCount: getLayerSuccCount,
      getWfNameByNode: getWfNameByNode,
      hideChildNodes: hideChildNodes,
      parseISOTimeFormat: parseISOTimeFormat,
      propagateNodeSelection: propagateNodeSelection
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */

    /**
     * Helper function collection for the provvis module.
     */

     /**
     * Breadth first search algorithm.
     * @param dsn Dataset node.
     */
    function bfs (dsn) {
      /**
       * Helper function to get successors of the current node;
       * @param n Node.
       */
      var getSuccs = function (n) {
        /* Add successor nodes to queue. */
        n.succs.values().forEach(function (s) {
          if (s instanceof window.provvisDecl.Node &&
            window.nset.indexOf(s.parent.parent) === -1) {
            window.nset.push(s.parent.parent);
            window.nqueue.push(s.parent.parent);
          } else if (window.nset.indexOf(s) === -1) {
            window.nset.push(s);
            window.nqueue.push(s);
          }
        });
      };

      var nqueue = [];
      var nset = [];

      nset.push(dsn);
      nqueue.push(dsn);

      while (nqueue.length > 0) {
        getSuccs(nqueue.shift());
      }
    }


    /**
     * Helper function to compare two d3.map() objects.
     * @param a
     * @param b
     * @returns {boolean}
     */
    function compareMaps (a, b) {
      var equal = true;
      if (a.size() === b.size()) {
        a.keys().forEach(function (k) {
          if (!b.has(k)) {
            equal = false;
          }
        });
      } else {
        equal = false;
      }
      return equal;
    }

    /**
   * Concats an array of dom elements.
   * @param domArr An array of dom class selector strings.
   */
    function concatDomClassElements (domArr) {
      var domClassStr = '';
      domArr.forEach(function (d) {
        domClassStr += '.' + d + ',';
      });

      return d3.selectAll(domClassStr.substr(0, domClassStr.length - 1));
    }

    /**
     * Helper function to parse a date with the declated time format.
     * @returns {*} Returns the custom time format.
     */
    function customTimeFormat (date) {
      return d3.time.format('%Y-%m-%d %H:%M:%S %p')(date);
    }

         /* TODO: Revise. */
    /**
     * Fit visualization onto free windows space.
     * @param transitionTime The time in milliseconds for the duration of the
     * animation.
     */
    function fitGraphToWindow (transitionTime) {
      var cell = partsService.cell;
      var scaleFactor = partsService.scaleFactor;
      var vis = partsService.vis;
      var min = [0, 0];
      var max = [0, 0];

      vis.graph.aNodes.forEach(function (an) {
        var anBBox = coordsService.getABBoxCoords(an, 0);
        if (anBBox.x.min < min[0]) {
          min[0] = anBBox.x.min;
        }
        if (anBBox.x.max > max[0]) {
          max[0] = anBBox.x.max;
        }
        if (anBBox.y.min < min[1]) {
          min[1] = anBBox.y.min;
        }
        if (anBBox.y.max > max[1]) {
          max[1] = anBBox.y.max;
        }
      });

      /* TODO: Fix for temporary sidebar overlap. */
      // removed temp fix for depending on solr-facet-view dom object
      var sidebarOverlap = $('#provenance-sidebar').width() -
      parseFloat($('#main-area-view').css('margin-left').replace('px', ''));


      var delta = [max[0] - min[0], max[1] - min[1]];
      var factor = [(vis.width / delta[0]), (vis.height / delta[1])];
      var newScale = d3.min(factor.concat([3])) * 0.9;
      var newPos = [(sidebarOverlap > 0 ? sidebarOverlap : 0) +
      vis.margin.left * 2 * newScale,
        ((vis.height - delta[1] * newScale) / 2 + vis.margin.top * 2)];

      vis.canvas
        .transition()
        .duration(transitionTime)
        .attr('transform', 'translate(' + newPos + ')scale(' + newScale + ')');

      vis.zoom.translate(newPos);
      vis.zoom.scale(newScale);

      /* Semantic zoom. */
      setTimeout(function () {
        if (newScale < 1) {
          d3.selectAll('.BBox').classed('hiddenNode', true);
          d3.selectAll('.lDiff, .aDiff').classed('hiddenNode', true);
        } else {
          d3.selectAll('.BBox').classed('hiddenNode', false);
          d3.selectAll('.lDiff, .aDiff').classed('hiddenNode', false);
        }

        if (newScale < 1.7) {
          vis.canvas.selectAll('.anLabel, .sanLabel, .lnLabel, ' +
            '.nodeAttrLabel, .stored-node-type-icon, .an-node-type-icon, ' +
            '.san-node-type-icon, .l-node-type-icon, .lBBoxLabel, ' +
            '.aBBoxLabel, .nodeDoiLabel')
            .classed('hiddenLabel', true);
          d3.selectAll('.glAnchor, .grAnchor').classed('hiddenNode', true);
        } else {
          vis.canvas.selectAll('.anLabel, .sanLabel, .lnLabel, ' +
            '.nodeAttrLabel, .stored-node-type-icon, .an-node-type-icon, ' +
            '.san-node-type-icon, .l-node-type-icon, .lBBoxLabel, ' +
            '.aBBoxLabel, .nodeDoiLabel')
            .classed('hiddenLabel', false);
          d3.selectAll('.glAnchor, .grAnchor').classed('hiddenNode', false);
        }
      }, transitionTime);


      /* Background rectangle fix. */
      vis.rect.attr('transform', 'translate(' +
        (-newPos[0] / newScale) + ',' +
        (-newPos[1] / newScale) + ')' + ' ' +
        'scale(' + (1 / newScale) + ')');

      /* Quick fix to exclude scale from text labels. */
      vis.canvas.selectAll('.lBBoxLabel')
        .transition()
        .duration(transitionTime)
        .attr('transform', 'translate(' +
          1 * scaleFactor * vis.radius + ',' +
          0.5 * scaleFactor * vis.radius + ') ' +
          'scale(' + (1 / newScale) + ')');

      vis.canvas.selectAll('.aBBoxLabel')
        .transition()
        .duration(transitionTime)
        .attr('transform', 'translate(' +
          1 * scaleFactor * vis.radius + ',' +
          0 * scaleFactor * vis.radius + ') ' +
          'scale(' + (1 / newScale) + ')');

      vis.canvas.selectAll('.nodeDoiLabel')
        .transition()
        .duration(transitionTime)
        .attr('transform', 'translate(' + 0 + ',' +
          (1.6 * scaleFactor * vis.radius) + ') ' +
          'scale(' + (1 / newScale) + ')');

      vis.canvas.selectAll('.nodeAttrLabel')
        .transition()
        .duration(transitionTime)
        .attr('transform', 'translate(' +
          (-1.5 * scaleFactor * vis.radius) + ',' +
          (-1.5 * scaleFactor * vis.radius) + ') ' +
          'scale(' + (1 / newScale) + ')');

      /* Trim nodeAttrLabel */
      /* Get current node label pixel width. */
      var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
      d3.transform(d3.select('.canvas').select('g').select('g')
        .attr('transform')).scale[0];

      /* Get label text. */
      d3.selectAll('.node').select('.nodeAttrLabel').each(function (d) {
        var attrText = (d.label === '') ? d.name : d.label;
        if (d.nodeType === 'stored') {
          var selAttrName = '';
          $('#prov-ctrl-visible-attribute-list > li').each(function () {
            if ($(this).find('input[type=\'radio\']').prop('checked')) {
              selAttrName = $(this).find('label').text();
            }
          });
          attrText = d.attributes.get(selAttrName);
        }

        /* Set label text. */
        if (typeof attrText !== 'undefined') {
          d3.select(this).text(attrText);
          var trimRatio = parseInt(attrText.length *
            (maxLabelPixelWidth / this.getComputedTextLength()), 10);
          if (trimRatio < attrText.length) {
            d3.select(this).text(attrText.substr(0, trimRatio - 3) + '...');
          }
        }
      });
    }

    /**
     * Get layer child analysis predecessor link count.
     * @param ln Layer node.
     */
    function getLayerPredCount (ln) {
      return ln.children.values()
        .map(function (an) {
          return an.predLinks.size();
        })
        .reduce(function (acc, pls) {
          return acc + pls;
        });
    }

    /**
     * Get layer child analysis successor link count.
     * @param ln Layer node.
     */
    function getLayerSuccCount (ln) {
      return ln.children.values()
        .map(function (an) {
          return an.succLinks.size();
        })
        .reduce(function (acc, pls) {
          return acc + pls;
        });
    }

          /**
   * Get workflow name string.
   * @param n Node of type BaseNode.
   * @returns {string} The name string.
   */
    function getWfNameByNode (n) {
      var vis = partsService.vis;
      var wfName = 'dataset';
      var an = n;
      while (!(an instanceof provvisDecl.Analysis)) {
        an = an.parent;
      }
      if (typeof vis.graph.workflowData.get(an.wfUuid) !== 'undefined') {
        wfName = vis.graph.workflowData.get(an.wfUuid).name;
      }
      return wfName.toString();
    }

     /**
     * Set hidden attribute for object and class for css of BaseNode.
     * @param n BaseNode.
     */
    function hideChildNodes (n) {
      if (!n.children.empty()) {
        n.children.values().forEach(function (cn) {
          cn.hidden = true;
          d3.selectAll('#nodeId-' + cn.autoId).classed({
            selectedNode: false,
            hiddenNode: true
          });
          if (!cn.children.empty()) {
            hideChildNodes(cn);
          }
        });
      }
    }

     /**
     * Parses a string into the ISO time format.
     * @param value The time in the string format.
     * @returns {*} The value in the ISO time format.
     */
    function parseISOTimeFormat (value) {
      var strictIsoFormat = d3.time.format('%Y-%m-%dT%H:%M:%S.%L');
      return strictIsoFormat.parse(value);
    }

    /**
     * Set selected attribute for object of BaseNode.
     * @param n BaseNode.
     * @param selected Node may be selected or not.
     */
    function propagateNodeSelection (n, selected) {
      if (!n.children.empty()) {
        n.children.values().forEach(function (cn) {
          cn.selected = selected;
          cn.doi.selectedChanged();
          // d3.selectAll("#nodeId-" + cn.autoId).classed({"selectedNode":
          // selected});
          if (!cn.children.empty()) {
            propagateNodeSelection(cn, selected);
          }
        });
      }
    }
  }
})();
