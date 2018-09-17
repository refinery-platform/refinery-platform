/**
 * provvis Update Node Links Service
 * @namespace provvisUpdateNodeLinksService
 * @desc Service for updating the dom components (node, link, info)
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisUpdateNodeLinksService', provvisUpdateNodeLinksService);

  provvisUpdateNodeLinksService.$inject = [
    '$',
    'provvisBoxCoordsService',
    'provvisDeclService',
    'provvisDrawLinksService',
    'provvisPartsService'
  ];

  function provvisUpdateNodeLinksService (
    $,
    provvisBoxCoordsService,
    provvisDeclService,
    provvisDrawLinksService,
    provvisPartsService
  ) {
    var coordsService = provvisBoxCoordsService;
    var linksService = provvisDrawLinksService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;

    var service = {
      updateLink: updateLink,
      updateLinkFilter: updateLinkFilter,
      updateNode: updateNode,
      updateNodeAndLink: updateNodeAndLink,
      updateNodeFilter: updateNodeFilter,
      updateNodeInfoTab: updateNodeInfoTab
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Update link through translation while dragging or on dragend.
     * @param n Node object element.
     */
    function updateLink (n) {
      var draggingActive = partsService.draggingActive;
      var linkStyle = partsService.linkStyle;
      var nodeLinkTransitionTime = partsService.nodeLinkTransitionTime;
      var predLinks = d3.map();
      var succLinks = d3.map();

      /* Get layer and/or analysis links. */
      switch (n.nodeType) {  // eslint-disable-line default-case
        case 'layer':
          n.predLinks.values().forEach(function (pl) {
            predLinks.set(pl.autoId, pl);
          });
          n.succLinks.values().forEach(function (sl) {
            succLinks.set(sl.autoId, sl);
          });
          n.children.values().forEach(function (an) {
            an.predLinks.values().forEach(function (pl) {
              predLinks.set(pl.autoId, pl);
            });
            an.succLinks.values().forEach(function (sl) {
              succLinks.set(sl.autoId, sl);
            });
          });
          break;
        case 'analysis':
          n.predLinks.values().forEach(function (pl) {
            predLinks.set(pl.autoId, pl);
          });
          n.succLinks.values().forEach(function (sl) {
            succLinks.set(sl.autoId, sl);
          });
          break;
      }

      /* Get input links and update coordinates for x2 and y2. */
      predLinks.values().forEach(function (l) {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('link-transition', true)
          .transition()
          .duration(draggingActive ? 0 : nodeLinkTransitionTime)
          .attr('d', function () {
            var srcCoords = coordsService.getVisibleNodeCoords(l.source);
            var tarCoords = coordsService.getVisibleNodeCoords(l.target);

            if (linkStyle === 'bezier1') {
              return linksService.drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
                tarCoords.y);
            } else { // eslint-disable-line no-else-return
              return linksService.drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
                tarCoords.y);
            }
          });

        setTimeout(function () {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('link-transition', false);
        }, nodeLinkTransitionTime);
      });

      /* Get output links and update coordinates for x1 and y1. */
      succLinks.values().forEach(function (l) {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('link-transition', true)
          .transition()
          .duration(draggingActive ? 0 : nodeLinkTransitionTime)
          .attr('d', function (l) { // eslint-disable-line no-shadow
            var tarCoords = coordsService.getVisibleNodeCoords(l.target);
            var srcCoords = coordsService.getVisibleNodeCoords(l.source);

            if (linkStyle === 'bezier1') {
              return linksService.drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
                tarCoords.y);
            } else { // eslint-disable-line no-else-return
              return linksService.drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
                tarCoords.y);
            }
          });

        setTimeout(function () {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('link-transition', false);
        }, nodeLinkTransitionTime);
      });
    }


     /**
     * Update node coordinates through translation.
     * @param dom Node dom element.
     * @param n Node object element.
     * @param x The current x-coordinate for the node.
     * @param y The current y-coordinate for the node.
     */
    function updateNode (dom, n, x, y) {
      /* Set selected node coordinates. */
      dom.transition()
        .duration(partsService.draggingActive ? 0 : partsService.nodeLinkTransitionTime)
        .attr('transform', 'translate(' + x + ',' + y + ')');
    }

     /**
     * Update node and link.
     * @param n Node.
     * @param dom Node as dom object.
     */
    function updateNodeAndLink (n, dom) {
      var self = dom;

      /* Align selected node. */
      updateNode(self, n, n.x, n.y);

      /* Align adjacent links. */
      updateLink(n);

      if (n instanceof provvisDecl.Layer) {
        n.children.values().forEach(function (an) {
          updateNode(d3.select('#gNodeId-' + an.autoId), an, an.x, an.y);
          updateLink(an);
        });
      }
    }

     /**
     * Update filtered links.
     */
    function updateLinkFilter () {
      partsService.saLink.classed('filteredLink', false);

      partsService.saNode.each(function (san) {
        if (!san.filtered) {
          san.links.values().forEach(function (l) {
            d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
              .classed('filteredLink', false);
            if (partsService.filterAction === 'blend') {
              d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
                .classed('blendedLink', true);
            } else {
              d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
                .classed('blendedLink', false);
            }
          });
        } else {
          san.links.values().forEach(function (l) {
            d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
              .classed({
                filteredLink: true,
                blendedLink: false
              });
          });
        }
      });
    }

    /* TODO: On facet filter reset button, reset filter as well. */
    /**
     * Update filtered nodes.
     */
    function updateNodeFilter () {
      /* Hide or blend (un)selected nodes. */

      /* Layers. */
      partsService.layer.each(function (ln) {
        var self = d3.select(this).select('#nodeId-' + ln.autoId);
        if (!ln.filtered) {
          /* Blend/Hide layer node. */
          self.classed('filteredNode', false)
            .classed('blendedNode', function () {
              return partsService.filterAction === 'blend';
            });
          d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', true);
        } else {
          self.classed('filteredNode', true).classed('blendedNode', false);
          if (!ln.hidden) {
            d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', false);
          }
        }
      });

      /* Analyses and child nodes. */
      partsService.analysis.each(function (an) {
        var self = d3.select(this).select('#nodeId-' + an.autoId);
        if (!an.filtered) {
          /* Blend/Hide analysis. */
          self.classed('filteredNode', false)
            .classed('blendedNode', function () {
              return partsService.filterAction === 'blend';
            });
          d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', true);

          /* Update child nodes. */
          an.children.values().forEach(function (san) {
            d3.select('#nodeId-' + san.autoId)
              .classed('filteredNode', false)
              .classed('blendedNode', function () {
                return partsService.filterAction === 'blend';
              });

            san.children.values().forEach(function (n) {
              d3.select('#nodeId-' + n.autoId)
                .classed('filteredNode', false)
                .classed('blendedNode', function () {
                  return partsService.filterAction === 'blend';
                });
            });
          });
        } else {
          /* Update child nodes. */
          an.children.values().forEach(function (san) { //
            d3.select('#nodeId-' + san.autoId)
              .classed('filteredNode', true)
              .classed('blendedNode', false);
            san.children.values().forEach(function (n) {
              if (n.filtered) {
                d3.select('#nodeId-' + n.autoId)
                  .classed('filteredNode', true)
                  .classed('blendedNode', false);
              } else {
                d3.select('#nodeId-' + n.autoId)
                  .classed('filteredNode', false)
                  .classed('blendedNode', false);
              }
            });

            if (an.children.values().some(function (san) { // eslint-disable-line no-shadow
              return !san.hidden;
            }) ||
              an.children.values().some(function (san) { // eslint-disable-line no-shadow
                return san.children.values().some(function (n) {
                  return !n.hidden;
                });
              })) {
              d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
            }
          });

          if (!an.hidden) {
            d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
          }

          /* Display analysis. */
          self.classed('filteredNode', true).classed('blendedNode', false);
        }
      });
    }

   /* TODO: Left clicking on href links doesn't trigger the download. */
  /**
   * Update node info tab on node selection.
   * @param selNode Selected node.
   */
    function updateNodeInfoTab (selNode) {
      var vis = partsService.vis;
      var title = ' - ';
      var titleLink = ' - ';
      var data = Object.create(null);
      var nodeDiff = d3.map();
      var diffNegIns = 0;
      var diffPosIns = 0;
      var diffNegSA = 0;
      var diffPosSA = 0;
      var diffNegOuts = 0;
      var diffPosOuts = 0;

      switch (selNode.nodeType) { // eslint-disable-line default-case
        case 'raw':
        case 'special':
        case 'intermediate':
        case 'stored':
          data = vis.graph.nodeData.get(selNode.uuid);
          if (typeof data !== 'undefined') {
            title = '<i class="fa fa-sitemap rotate-icon-90"></i>&nbsp;' +
            selNode.fileType;
            if (data.file_url !== null) {
              /* TODO: Trigger download without window.open. */
              titleLink = '<a title="Download linked file" href="' +
                data.file_url + '" onclick=window.open("' + data.file_url +
                '")>' +
                '<i class="fa fa-arrow-circle-o-down"></i>&nbsp;' + data.name + '</a>';
            } else {
              titleLink = ' - ';
            }
          }
          break;

        case 'dt':
        /* TODO: Add tool_state parameters column. */
        /* From parent workflow steps attribute, extract step by id.
         * var steps = vis.graph.workflowData
         * .get(selNode.parent.wfUuid).steps; */

          data = vis.graph.nodeData.get(selNode.uuid);
          if (typeof data !== 'undefined') {
            title = '<i class="fa fa-sitemap rotate-icon-90"></i>&nbsp;' +
            selNode.fileType;
            if (data.file_url !== null) {
              /* TODO: Trigger download without window.open. */
              titleLink = '<a title="Download linked file" href="' +
                data.file_url + '" onclick=window.open("' + data.file_url +
                '")>' +
                '<i class="fa fa-arrow-circle-o-down"></i>&nbsp;' + data.name + '</a>';
            }
          }
          break;

        case 'subanalysis':
          data = vis.graph.workflowData.get(selNode.parent.wfUuid);
          if (typeof data !== 'undefined') {
            title = '<i class="fa fa-cog"></i>&nbsp; Analysis Group';
            titleLink = '<a href=/workflows/' + selNode.wfUuid +
              ' target="_blank">' +
              selNode.parent.wfName + '</a>';
          } else {
            title = '<i class="fa fa-cog"></i>&nbsp; Dataset';
          }

          if (selNode.parent.motifDiff.numIns !== 0 ||
            selNode.parent.motifDiff.numOuts !== 0 ||
            selNode.parent.motifDiff.numSubanalyses !== 0) {
            if (selNode.parent.motifDiff.numIns < 0) {
              diffNegIns += selNode.parent.motifDiff.numIns;
            } else {
              diffPosIns += selNode.parent.motifDiff.numIns;
            }
            if (selNode.parent.motifDiff.numSubanalyses < 0) {
              diffNegSA += selNode.parent.motifDiff.numSubanalyses;
            } else {
              diffPosSA += selNode.parent.motifDiff.numSubanalyses;
            }
            if (selNode.parent.motifDiff.numOuts < 0) {
              diffNegOuts += selNode.parent.motifDiff.numOuts;
            } else {
              diffPosOuts += selNode.parent.motifDiff.numOuts;
            }
          }
          break;

        case 'analysis':
          data = vis.graph.analysisData.get(selNode.uuid);
          if (typeof data !== 'undefined') {
            title = '<i class="fa fa-cogs"></i>&nbsp; Analysis';
            titleLink = '<a href=/workflows/' + selNode.wfUuid +
              ' target="_blank">' +
              selNode.wfName + '</a>';
          } else {
            title = '<i class="fa fa-cogs"></i>&nbsp; Dataset';
          }
          if (selNode.motifDiff.numIns !== 0 || selNode.motifDiff.numOuts !== 0 ||
            selNode.motifDiff.numSubanalyses !== 0) {
            if (selNode.motifDiff.numIns < 0) {
              diffNegIns += selNode.motifDiff.numIns;
            } else {
              diffPosIns += selNode.motifDiff.numIns;
            }
            if (selNode.motifDiff.numSubanalyses < 0) {
              diffNegSA += selNode.motifDiff.numSubanalyses;
            } else {
              diffPosSA += selNode.motifDiff.numSubanalyses;
            }
            if (selNode.motifDiff.numOuts < 0) {
              diffNegOuts += selNode.motifDiff.numOuts;
            } else {
              diffPosOuts += selNode.motifDiff.numOuts;
            }
          }
          break;

        case 'layer':
          data = {
            aggregation_count: selNode.children.size(),
            workflow: selNode.wfName,
            subanalysis_count: selNode.motif.numSubanalyses,
            wfUuid: selNode.motif.wfUuid
          };

          if (typeof data !== 'undefined') {
            title = '<i class="fa fa-bars"></i>&nbsp; Layer';
            titleLink = '<a href=/workflows/' + data.wfUuid +
              ' target="_blank">' + data.workflow + '</a>';
          }
          if (selNode.children.values().some(function (an) {
            return an.motifDiff.numIns !== 0 || an.motifDiff.numOuts !== 0 ||
            an.motifDiff.numSubanalyses !== 0;
          })) {
            selNode.children.values().forEach(function (an) {
              if (an.motifDiff.numIns < 0) {
                diffNegIns += an.motifDiff.numIns;
              } else {
                diffPosIns += an.motifDiff.numIns;
              }
              if (an.motifDiff.numSubanalyses < 0) {
                diffNegSA += an.motifDiff.numSubanalyses;
              } else {
                diffPosSA += an.motifDiff.numSubanalyses;
              }
              if (an.motifDiff.numOuts < 0) {
                diffNegOuts += an.motifDiff.numOuts;
              } else {
                diffPosOuts += an.motifDiff.numOuts;
              }
            });
          }
          break;
      }

      /* Add diff info to data. */
      if (diffNegIns !== 0 || diffPosIns !== 0) {
        nodeDiff.set('Diff: Inputs', (diffNegIns + ' ' + diffPosIns));
      }
      if (diffNegSA !== 0 || diffPosSA !== 0) {
        nodeDiff.set('Diff: Subanalyses', (diffNegSA + ' ' + diffPosSA));
      }
      if (diffNegOuts !== 0 || diffPosOuts !== 0) {
        nodeDiff.set('Diff: Outputs', (diffNegOuts + ' ' + diffPosOuts));
      }

      $('#nodeInfoTitle').html(title);
      $('#nodeInfoTitleLink').html(titleLink);

      $('#' + 'provenance-nodeInfo-content').html('');
      nodeDiff.entries().forEach(function (d) {
        $('<div/>', {
          class: 'refinery-subheader',
          html: '<h4>' + d.key + '</h4>'
        }).appendTo('#' + 'provenance-nodeInfo-content');
        $('<p/>', {
          class: 'provvisNodeInfoValue provvisNodeInfoDiff',
          html: '<i><b>' + d.value + '</b></i>'
        }).appendTo('#' + 'provenance-nodeInfo-content');
      });

      d3.entries(data).forEach(function (d) {
        $('<div/>', {
          class: 'refinery-subheader',
          html: '<h4>' + d.key + '</h4>'
        }).appendTo('#' + 'provenance-nodeInfo-content');
        $('<p/>', {
          class: 'provvisNodeInfoValue',
          html: '<i>' + d.value + '</i>'
        }).appendTo('#' + 'provenance-nodeInfo-content');
      });
    }
  }
})();
