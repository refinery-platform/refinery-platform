/**
 * Provvis Dagre Layout Service
 * @namespace provvis dynamic dagre layout
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDagreLayoutService', provvisDagreLayoutService);

  provvisDagreLayoutService.$inject = [
    'd3',
    'dagre',
    'provvisBoxCoordsService',
    'provvisPartsService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisDagreLayoutService (
    d3,
    dagre,
    provvisBoxCoordsService,
    provvisPartsService,
    provvisUpdateNodeLinksService
  ) {
    var coordService = provvisBoxCoordsService;
    var partsService = provvisPartsService;
    var updateNodeLink = provvisUpdateNodeLinksService;

    var service = {
      dagreDynamicLayerLayout: dagreDynamicLayerLayout,
      dagreLayerLayout: dagreLayerLayout
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     *
    /* TODO: Code cleanup. */
    /**
     * Dynamic Dagre layout.
     * @param graph The provenance Graph.
     */
    function dagreDynamicLayerLayout (graph) {
      /* Initializations. */
      var vis = partsService.vis;
      var scaleFactor = partsService.scaleFactor;
      var g = new dagre.graphlib.Graph();

      g.setGraph({
        rankdir: 'LR',
        nodesep: 1 * scaleFactor * vis.radius,
        edgesep: 0,
        ranksep: 4 * scaleFactor * vis.radius,
        marginx: 0,
        marginy: 0
      });
      g.setDefaultEdgeLabel(function () {
        return {};
      });
      var anBBoxCoords = {};
      var curWidth = 0;
      var curHeight = 0;
      var exNum = 0;
      var accY = 0;

      /* Add layer or analysis nodes with a dynamic bounding box size
       * (based on visible child nodes). */
      graph.lNodes.values().forEach(function (ln) {
        d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', true);
        if (!ln.hidden) {
          if (ln.filtered) {
            d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', false);
          }
          curWidth = vis.cell.width;
          curHeight = vis.cell.height;

          /* Check exaggerated layer children. */
          /* Add visible dimensions to layer node without bounding boxes. */
          /* Based on current y-coord order, the stack of nodes will be drawn
           vertically. */
          /* Child nodes inherit x-coord of layer node and y-coord will be
           computed based on the statement above.*/
          /* Layer node number labels may be updated. */
          /* Maybe add a bounding box for layered node and exaggerated nodes.*/

          exNum = 0;
          accY = ln.y + vis.cell.height;
          ln.children.values().filter(function (an) {
            return an.filtered || partsService.filterAction === 'blend';
          }).sort(function (a, b) {
            return a.y - b.y;
          }).forEach(function (an) {
            if (an.exaggerated && an.filtered) {
              exNum++;
              an.x = an.parent.x;
              an.y = accY;
              accY += (coordService.getABBoxCoords(an, 0).y.max -
              coordService.getABBoxCoords(an, 0).y.min);

              updateNodeLink.updateNodeAndLink(an, d3.select('#gNodeId-' + an.autoId));
              d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', false);
              d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
            } else {
              an.x = an.parent.x;
              an.y = an.parent.y;
            }
          });

          /* Set layer label and bounding box. */
          var numChildren = ln.children.values().filter(function (an) {
            return an.filtered || partsService.filterAction === 'blend';
          }).length;
          d3.select('#nodeId-' + ln.autoId).select('g.labels').select('.lnLabel')
            .text(function () {
              return numChildren - exNum + '/' + ln.children.size();
            });

          /* Get potential expanded bounding box size. */
          var accHeight = curHeight;
          var accWidth = curWidth;
          ln.children.values().filter(function (an) {
            return an.filtered || partsService.filterAction === 'blend';
          }).forEach(function (an) {
            if (an.exaggerated) {
              anBBoxCoords = coordService.getABBoxCoords(an, 0);
              if (anBBoxCoords.x.max - anBBoxCoords.x.min > accWidth) {
                accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
              }
              accHeight += anBBoxCoords.y.max - anBBoxCoords.y.min;
            }
          });

          d3.select('#lBBClipId-' + ln.autoId)
            .select('rect')
            .attr('width', accWidth)
            .attr('height', accHeight);

          d3.select('#BBoxId-' + ln.autoId).attr('transform',
            'translate(' + (-accWidth / 2) + ',' +
            (-vis.cell.height / 2) + ')')
            .select('rect')
            .attr('width', accWidth)
            .attr('height', accHeight);

          g.setNode(ln.autoId, {
            label: ln.autoId,
            width: accWidth,
            height: accHeight
          });
        } else {
          ln.children.values().filter(function (an) {
            return an.filtered || partsService.filterAction === 'blend';
          }).forEach(function (an) {
            anBBoxCoords = coordService.getABBoxCoords(an, 0);
            curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
            curHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;
            g.setNode(an.autoId, {
              label: an.autoId,
              width: curWidth,
              height: curHeight
            });
          });
        }
      });

      /* Add layer-to-layer links. */
      graph.lLinks.values().forEach(function (ll) {
        if (!ll.hidden) {
          g.setEdge(ll.source.autoId, ll.target.autoId, {
            minlen: 1,
            weight: 1,
            width: 0,
            height: 0,
            labelpos: 'r',
            labeloffset: 0
          });
        }
      });

      /* Add analysis-mixed links. */
      graph.aLinks.forEach(function (l) {
        if (!l.hidden) {
          /* Either the layer or the analysis is visible and therefore
           virtual links are created.*/
          var src = l.source.parent.parent.parent.autoId;
          var tar = l.target.parent.parent.parent.autoId;
          if (l.source.parent.parent.parent.hidden) {
            src = l.source.parent.parent.autoId;
          }
          if (l.target.parent.parent.parent.hidden) {
            tar = l.target.parent.parent.autoId;
          }

          g.setEdge(src, tar, {
            minlen: 1,
            weight: 1,
            width: 0,
            height: 0,
            labelpos: 'r',
            labeloffset: 0
          });
        }
      });

      /* Compute layout. */
      dagre.layout(g);

      /* Set layer and analysis coords. */
      partsService.layoutCols = d3.map();
      var layoutCols = partsService.layoutCols;
      var accWidth = 0;
      var accHeight = 0;

      /* Assign x and y coords for layers or analyses. Check filter action
       as well as exaggerated nodes. */
      d3.map(g._nodes).values().forEach(function (n) {
        if (typeof n !== 'undefined') {
          if (graph.lNodes.has(n.label) && (graph.lNodes.get(n.label).filtered ||
            partsService.filterAction === 'blend')) {
            var ln = graph.lNodes.get(n.label);
            accHeight = vis.cell.height;
            accWidth = vis.cell.width;

            ln.children.values().filter(function (an) {
              return an.filtered || partsService.filterAction === 'blend';
            }).forEach(function (an) {
              if (an.exaggerated) {
                anBBoxCoords = coordService.getABBoxCoords(an, 0);
                if (anBBoxCoords.x.max - anBBoxCoords.x.min > accWidth) {
                  accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
                }
                accHeight += anBBoxCoords.y.max - anBBoxCoords.y.min;
              }
            });

            ln.x = n.x - vis.cell.width / 2;
            ln.y = n.y - accHeight / 2;

            exNum = 0;
            accY = ln.y + vis.cell.height;
            ln.children.values().filter(function (an) {
              return an.filtered || partsService.filterAction === 'blend';
            }).sort(function (a, b) {
              return a.y - b.y;
            }).forEach(function (an) {
              anBBoxCoords = coordService.getABBoxCoords(an, 0);
              curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
              an.x = ln.x - curWidth / 2 + vis.cell.width / 2;

              if (an.exaggerated) {
                an.y = accY;
                accY += (coordService.getABBoxCoords(an, 0).y.max -
                coordService.getABBoxCoords(an, 0).y.min);
              } else {
                an.y = an.parent.y;
              }
            });
          } else {
            var an = graph.aNodes.filter(function (an) { // eslint-disable-line no-shadow
              return an.autoId === n.label && (an.filtered ||
              partsService.filterAction === 'blend');
            })[0];

            if (an && typeof an !== 'undefined') {
              anBBoxCoords = coordService.getABBoxCoords(an, 0);
              accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
              accHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;

              an.x = n.x - accWidth / 2;
              an.y = n.y - accHeight / 2;
            }
          }

          /* Compute layouted columns. */
          if (layoutCols.has(n.x)) {
            layoutCols.get(n.x).nodes.push(n.label);
          } else {
            layoutCols.set(n.x, {
              nodes: [],
              width: 0
            });
            layoutCols.get(n.x).nodes.push(n.label);
          }
          if (accWidth > layoutCols.get(n.x).width) {
            layoutCols.get(n.x).width = accWidth;
          }
        }
      });

      /* Update graph dom elements. */
      vis.graph.lNodes.values().forEach(function (ln) {
        updateNodeLink.updateNodeAndLink(ln, d3.select('#gNodeId-' + ln.autoId));
      });

      /* Reorder node columns by y-coords. */
      layoutCols.values().forEach(function (c) {
        c.nodes = c.nodes.sort(function (a, b) {
          return a.y - b.y;
        });
      });
    }

    /**
     * Dagre layout including layer nodes.
     * @param graph The provenance graph.
     */
    function dagreLayerLayout (graph) {
      var vis = partsService.vis;
      var g = new dagre.graphlib.Graph();

      g.setGraph({
        rankdir: 'LR',
        nodesep: 0,
        edgesep: 0,
        ranksep: 0,
        marginx: 0,
        marginy: 0
      });

      g.setDefaultEdgeLabel(function () {
        return {};
      });

      var curWidth = 0;
      var curHeight = 0;

      graph.lNodes.values().forEach(function (ln) {
        curWidth = vis.cell.width;
        curHeight = vis.cell.height;

        g.setNode(ln.autoId, {
          label: ln.autoId,
          width: curWidth,
          height: curHeight
        });
      });

      graph.lLinks.values().forEach(function (l) {
        g.setEdge(l.source.autoId, l.target.autoId, {
          minlen: 1,
          weight: 1,
          width: 0,
          height: 0,
          labelpos: 'r',
          labeloffset: 0
        });
      });

      dagre.layout(g);

      var dlLNodes = d3.entries(g._nodes);
      graph.lNodes.values().forEach(function (ln) {
        curWidth = vis.cell.width;
        curHeight = vis.cell.height;

        ln.x = dlLNodes.filter(function (d) {
          return d.key === ln.autoId.toString();
        })[0].value.x - curWidth / 2;

        ln.y = dlLNodes.filter(function (d) {
          return d.key === ln.autoId.toString();
        })[0].value.y - curHeight / 2;

        updateNodeLink.updateNodeAndLink(ln, d3.select('#gNodeId-' + ln.autoId));
      });
    }
  }
})();
