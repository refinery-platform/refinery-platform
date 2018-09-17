/**
 * provvis Show Service
 * @namespace provvisShowService
 * @desc Service for showing different dom elements
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisShowService', provvisShowService);

  provvisShowService.$inject = [
    'provvisBoxCoordsService',
    'provvisDrawLinksService',
    'provvisHelpersService',
    'provvisPartsService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisShowService (
    provvisBoxCoordsService,
    provvisDrawLinksService,
    provvisHelpersService,
    provvisPartsService,
    provvisUpdateNodeLinksService
  ) {
    var coordsService = provvisBoxCoordsService;
    var provvisHelpers = provvisHelpersService;
    var partsService = provvisPartsService;
    var updateNodeLink = provvisUpdateNodeLinksService;

    var service = {
      showAllAnalyses: showAllAnalyses,
      showAllLayers: showAllLayers,
      showAllSubanalyses: showAllSubanalyses,
      showAllWorkflows: showAllWorkflows
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Collapse all analyses into single analysis nodes.
     */
    function showAllAnalyses () {
      var aNode = partsService.aNode;
      var lLink = partsService.lLink;
      var lNode = partsService.lNode;
      var saBBox = partsService.saBBox;
      var vis = partsService.vis;

      /* Node visibility. */
      lNode.each(function (ln) {
        ln.hidden = true;
      });
      lNode.classed('hiddenNode', true);

      aNode.each(function (an) {
        an.hidden = false;
        provvisHelpers.hideChildNodes(an);

        /* Filtered visibility. */
        if (an.filtered) {
          d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
        }

        /* Bounding box size. */
        d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
          .select('rect')
          .attr('width', vis.cell.width)
          .attr('height', vis.cell.height);

        /* Adjust subanalysis coords. */
        an.children.values().sort(function (a, b) {
          return a.y - b.y;
        }).forEach(function (san, i) {
          san.y = i * vis.cell.height;
          san.x = 0;
          updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });
      });
      aNode.classed('hiddenNode', false);

      /* Bounding box visibility. */
      saBBox.classed('hiddenBBox', true);

      /* Link visibility. */
      aNode.each(function (an) {
        an.links.values().forEach(function (l) {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('hiddenLink', true);
          l.hidden = true;
        });
        an.inputs.values().forEach(function (ain) {
          ain.predLinks.values().forEach(function (l) {
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            l.hidden = false;
          });
        });
      });

      lLink.each(function (l) {
        l.hidden = true;
      });
      lLink.classed('hiddenLink', true);
    }

    /**
     * Collapse all nodes into single layer nodes.
     */
    function showAllLayers () {
      var aBBox = partsService.aBBox;
      var aLink = partsService.lLink;
      var aNode = partsService.aNode;
      var lLink = partsService.lLink;
      var lNode = partsService.lNode;
      var saBBox = partsService.saBBox;
      var vis = partsService.vis;

      /* Node visibility. */
      lNode.each(function (ln) {
        ln.hidden = false;
        provvisHelpers.hideChildNodes(ln);

        /* Layer exaggeration reset. */
        ln.children.values().forEach(function (an) {
          an.exaggerated = false;
        });

        /* Filtered visibility. */
        if (ln.filtered) {
          d3.select('BBoxId-' + ln.autoId).classed('hiddenBBox', false);
        }
      });
      lNode.classed('hiddenNode', false);

      /* Bounding box visibility. */
      saBBox.classed('hiddenBBox', true);
      aBBox.classed('hiddenBBox', true);

      /* Link visibility. */
      aNode.each(function (an) {
        an.links.values().forEach(function (l) {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('hiddenLink', true);
          l.hidden = true;
        });

        /* Adjust subanalysis coords. */
        an.children.values().sort(function (a, b) {
          return a.y - b.y;
        }).forEach(function (san, i) {
          san.y = i * vis.cell.height;
          san.x = 0;
          updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });
      });

      aLink.each(function (l) {
        l.hidden = true;
      });
      aLink.classed('hiddenLink', true);

      lLink.each(function (l) {
        l.hidden = false;
      });
      lLink.classed('hiddenLink', false);

      /* Show highlighted alinks. */
      d3.select('.aHLinks').selectAll('.hLink').each(function (l) {
        if (l.highlighted) {
          l.hidden = false;
          d3.select(this).classed('hiddenLink', false);
        }
      });
    }

    /**
     * Collapse all analyses into single subanalysis nodes.
     */
    function showAllSubanalyses () {
      var aNode = partsService.aNode;
      var lLink = partsService.lLink;
      var lNode = partsService.lNode;
      var node = partsService.node;
      var saBBox = partsService.saBBox;
      var saNode = partsService.saNode;
      var vis = partsService.vis;

      /* Set node visibility. */
      lNode.each(function (ln) {
        ln.hidden = true;
      });
      lNode.classed('hiddenNode', true);
      aNode.each(function (an) {
        an.hidden = true;
      });
      aNode.classed('hiddenNode', true);
      saNode.each(function (san) {
        san.hidden = false;
      });
      saNode.classed('hiddenNode', false);
      node.each(function (n) {
        n.hidden = true;
      });
      node.classed('hiddenNode', true);

      /* Bounding box visibility. */
      saBBox.classed('hiddenBBox', true);

      aNode.each(function (an) {
        /* Adjust subanalysis coords. */
        an.children.values().sort(function (a, b) {
          return a.y - b.y;
        }).forEach(function (san, i) {
          san.y = i * vis.cell.height;
          san.x = 0;
          updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });

        /* Adjust analysis bounding box. */
        var anBBoxCoords = coordsService.getABBoxCoords(an, 0);
        d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
          .selectAll('rect')
          .attr('width', vis.cell.width)
          .attr('height', function () {
            return anBBoxCoords.y.max - anBBoxCoords.y.min;
          });
        d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);

        if (!an.filtered) {
          d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', true);
        }
      });

      /* Link visibility. */
      aNode.each(function (an) {
        an.links.values().forEach(function (l) {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('hiddenLink', true);
          l.hidden = true;
        });
        an.inputs.values().forEach(function (ain) {
          ain.predLinks.values().forEach(function (l) {
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            l.hidden = false;
          });
        });
      });

      lLink.each(function (l) {
        l.hidden = true;
      });
      lLink.classed('hiddenLink', true);
    }

    /**
     * Expand all analsyes into workflow nodes.
     */
    function showAllWorkflows () {
      var aBBox = partsService.aBBox;
      var aNode = partsService.aNode;
      var link = partsService.link;
      var lLink = partsService.lLink;
      var lNode = partsService.lNode;
      var node = partsService.node;
      var saBBox = partsService.saBBox;
      var saNode = partsService.saNode;

      /* Set node visibility. */
      lNode.each(function (ln) {
        ln.hidden = true;
      });
      lNode.classed('hiddenNode', true);
      aNode.each(function (an) {
        an.hidden = true;
      });
      aNode.classed('hiddenNode', true);
      saNode.each(function (san) {
        san.hidden = true;
      });
      saNode.classed('hiddenNode', true);
      node.each(function (n) {
        n.hidden = false;
      });
      node.classed('hiddenNode', false);

      /* Bounding box visibility. */
      saBBox.each(function (san) {
        if (san.filtered && san.children.values().some(function (cn) {
          return !cn.hidden;
        })) {
          d3.select(this).classed('hiddenBBox', false);
        } else {
          d3.select(this).classed('hiddenBBox', true);
        }
      });

      /* Layer exaggeration label control. */
      aBBox.each(function (an) {
        if (an.filtered && an.parent.hidden) {
          d3.select(this).classed('hiddenBBox', false);
          d3.select(this).select('text').classed('hiddenLabel', false);
        }
      });

      aNode.each(function (an) {
        /* Adjust dataset subanalysis coords. */
        if (an.uuid === 'dataset') {
          var yOffset = 0;
          an.children.values().sort(function (a, b) {
            return a.y - b.y;
          }).forEach(function (san) {
            var wfBBoxCoords = coordsService.getWFBBoxCoords(san, 0);
            san.y = yOffset;
            yOffset += (wfBBoxCoords.y.max - wfBBoxCoords.y.min);
            san.x = 0;
            /* TODO: May cause problems. Revise! */
            updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
          });
        } else {
          /* Adjust subanalysis coords. */
          var wfBBoxCoords = coordsService.getWFBBoxCoords(an.children.values()[0], 0);
          an.children.values().sort(function (a, b) {
            return a.y - b.y;
          }).forEach(function (san, i) {
            san.y = i * (wfBBoxCoords.y.max - wfBBoxCoords.y.min);
            san.x = 0;
            /* TODO: May cause problems. Revise! */
            updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
          });
        }

        /* Adjust analysis bounding box. */
        var anBBoxCoords = coordsService.getABBoxCoords(an, 0);
        d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
          .selectAll('rect')
          .attr('width', function () {
            return anBBoxCoords.x.max - anBBoxCoords.x.min;
          })
          .attr('height', function () {
            return anBBoxCoords.y.max - anBBoxCoords.y.min;
          });
        d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);

        if (!an.filtered) {
          d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', true);
        }
      });

      /* Set link visibility. */
      link.each(function (l) {
        l.hidden = false;
      });
      link.classed('hiddenLink', false);

      link.each(function (l) {
        if (l.filtered) {
          l.hidden = false;
          if (l.highlighted) {
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
          }
        } else {
          if (partsService.filterAction === 'hide') {
            l.hidden = true;
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', true);
          } else {
            l.hidden = false;
            if (l.highlighted) {
              d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            }
          }
        }
      });

      lLink.each(function (l) {
        l.hidden = true;
      });
      lLink.classed('hiddenLink', true);
    }
  }
})();
