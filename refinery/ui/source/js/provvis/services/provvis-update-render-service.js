/**
 * provvis Update Render Service
 * @namespace provvisUpdateRenderService
 * @desc Service for drawing links
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisUpdateRenderService', provvisUpdateRenderService);

  provvisUpdateRenderService.$inject = [
    '$',
    'provvisDagreLayoutService',
    'provvisHandleCollapseService',
    'provvisInitDOIService',
    'provvisDeclService',
    'provvisDrawLinksService',
    'provvisHelpersService',
    'provvisPartsService',
    'provvisUpdateAnalysisService',
    'provvisUpdateLayerService'
  ];

  function provvisUpdateRenderService (
    $,
    provvisDagreLayoutService,
    provvisHandleCollapseService,
    provvisInitDOIService,
    provvisDeclService,
    provvisDrawLinksService,
    provvisHelpersService,
    provvisPartsService,
    provvisUpdateAnalysisService,
    provvisUpdateLayerService
  ) {
    var analysisService = provvisUpdateAnalysisService;
    var collapseService = provvisHandleCollapseService;
    var dagreService = provvisDagreLayoutService;
    var doiService = doiService;
    var linksService = provvisDrawLinksService;
    var layerService = provvisUpdateLayerService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var provvisHelpers = provvisHelpersService;

    var service = {
      runRenderUpdate: runRenderUpdate,
      updateLinkFilter: updateLinkFilter,
      updateNode: updateNode,
      updateNodeAndLink: updateNodeAndLink,
      updateNodeDoi: updateNodeDoi,
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
   * On attribute filter change, the provenance visualization will be updated.
   * @param vis The provenance visualization root object.
   * @param solrResponse Query response object holding information about
   * attribute filter changed.
   */
    function runRenderUpdate (vis, solrResponse) {
      var selNodes = [];

      partsService.filterMethod = 'facet';

      if (solrResponse.nodes.length) {
        angular.copy(vis.graph.lNodes, partsService.lNodesBAK);
        angular.copy(vis.graph.aNodes, partsService.aNodesBAK);
        angular.copy(vis.graph.saNodes, partsService.saNodesBAK);
        angular.copy(vis.graph.nodes, partsService.nodesBAK);
        angular.copy(vis.graph.aLinks, partsService.aLinksBAK);
        angular.copy(vis.graph.lLinks, partsService.lLinksBAK);

        /* Copy filtered nodes. */
        solrResponse.nodes.forEach(function (d) {
          selNodes.push(vis.graph.nodeMap.get(d.uuid));
        });

        /* Update subanalysis and workflow filter attributes. */
        vis.graph.nodes.forEach(function (n) {
          if (selNodes.map(function (d) {
            return d.parent;
          }).indexOf(n.parent) === -1) {
            n.parent.children.values().forEach(function (cn) {
              cn.filtered = false;
            });
            n.parent.filtered = false;
            n.parent.links.values().forEach(function (l) {
              l.filtered = false;
            });
          } else {
            /* Filter pred path. */
            var filterPredPath = function (curN) {
              curN.filtered = true;
              curN.predLinks.values().forEach(function (l) {
                l.filtered = true;
                if (l.source.parent === curN.parent) {
                  filterPredPath(l.source);
                }
              });
            };
            filterPredPath(n);

            n.parent.filtered = true;
            n.parent.links.values().forEach(function (l) {
              l.filtered = true;
            });
          }

          /* Filtered attribute changed. */
          n.parent.children.values().forEach(function (cn) {
            cn.doi.filteredChanged();
          });
          n.parent.doi.filteredChanged();
        });

        /* Update analysis filter attributes. */
        vis.graph.aNodes.forEach(function (an) {
          if (an.children.values().some(function (san) {
            return san.filtered;
          })) {
            an.filtered = true;
          } else {
            an.filtered = false;
          }
          an.doi.filteredChanged();
        });

        /* Update layer filter attributes. */
        vis.graph.lNodes.values().forEach(function (ln) {
          if (ln.children.values().some(function (an) {
            return an.filtered;
          })) {
            ln.filtered = true;
          } else {
            ln.filtered = false;
          }
          ln.doi.filteredChanged();
        });

        /* Update analysis link filter attributes. */
        vis.graph.aLinks.forEach(function (al) {
          al.filtered = false;
        });
        vis.graph.aLinks.filter(function (al) {
          return al.source.parent.parent.filtered &&
          al.target.parent.parent.filtered;
        }).forEach(function (al) {
          al.filtered = true;
        });
        vis.graph.lLinks.values().forEach(function (ll) {
          ll.filtered = false;
        });
        vis.graph.lLinks.values().filter(function (ll) {
          return ll.source.filtered && ll.target.filtered;
        }).forEach(function (ll) {
          ll.filtered = true;
        });


        /* On filter action 'hide', splice and recompute graph. */
        if (partsService.filterAction === 'hide') {
          /* Update filtered nodesets. */
          var cpyLNodes = d3.map();
          vis.graph.lNodes.entries().forEach(function (ln) {
            if (ln.value.filtered) {
              cpyLNodes.set(ln.key, ln.value);
            }
          });
          vis.graph.lNodes = cpyLNodes;
          vis.graph.aNodes = vis.graph.aNodes.filter(function (an) {
            return an.filtered;
          });
          vis.graph.saNodes = vis.graph.saNodes.filter(function (san) {
            return san.filtered;
          });
          vis.graph.nodes = vis.graph.nodes.filter(function (n) {
            return n.filtered;
          });

          /* Update filtered linksets. */
          vis.graph.aLinks = vis.graph.aLinks.filter(function (al) {
            return al.filtered;
          });

          /* Update layer links. */
          var cpyLLinks = d3.map();
          vis.graph.lLinks.entries().forEach(function (ll) {
            if (ll.value.filtered) {
              cpyLLinks.set(ll.key, ll.value);
            }
          });
          vis.graph.lLinks = cpyLLinks;
        }

        dagreService.dagreDynamicLayerLayout(vis.graph);
        if (partsService.fitToWindow) {
          provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
        }

        updateNodeFilter();
        updateLinkFilter();
        analysisService.updateAnalysisLinks(vis);
        layerService.updateLayerLinks(vis.graph.lLinks);

        vis.graph.aNodes.forEach(function (an) {
          linksService.updateLink(an);
        });
        vis.graph.lNodes.values().forEach(function (ln) {
          linksService.updateLink(ln);
        });

        /* TODO: Currently enabled. */
        if (partsService.doiAutoUpdate) {
          doiService.recomputeDOI();
        }
      }
      angular.copy(solrResponse, partsService.lastSolrResponse);
    }

      /* TODO: Code cleanup. */
    /**
     * On doi change, update node doi labels.
     */
    function updateNodeDoi () {
      /**
       * Helper function to check whether every parent node is hidden.
       * @param n BaseNode
       * @returns {boolean} Returns true if any parent node is visible.
       */
      var vis = partsService.vis;

      var allParentsHidden = function (n) {
        var cur = n;

        while (!(cur instanceof provvisDecl.Layer)) {
          if (!(cur instanceof provvisDecl.Layer) && !cur.parent.hidden) {
            return false;
          }
          cur = cur.parent;
        }

        return true;
      };

      /* Update node doi label. */
      partsService.domNodeset.select('.nodeDoiLabel').text(function (d) {
        return d.doi.doiWeightedSum;
      });

      /* On layer doi. */
      vis.graph.lNodes.values().forEach(function (ln) {
        if (ln.doi.doiWeightedSum >= (1 / 4) && !ln.hidden && ln.filtered) {
          /* Expand. */
          collapseService.handleCollapseExpandNode(ln, 'e', 'auto');
        }
      });

      /* On analysis doi. */
      vis.graph.aNodes.forEach(function (an) {
        if (an.doi.doiWeightedSum >= (2 / 4) && !an.hidden && an.filtered) {
          /* Expand. */
          collapseService.handleCollapseExpandNode(an, 'e', 'auto');
        } else if (an.doi.doiWeightedSum < (1 / 4) && !an.hidden &&
          an.parent.children.size() > 1) {
          /* Collapse. */
          collapseService.handleCollapseExpandNode(an, 'c', 'auto');

          if (an.parent.filtered) {
            /* Only collapse those analysis nodes into the layered node which
             * are below the threshold. */
            an.parent.children.values().forEach(function (d) {
              if (d.doi.doiWeightedSum >= (1 / 4)) {
                d.exaggerated = true;

                d.hidden = false;
                d3.select('#nodeId-' + d.autoId).classed('hiddenNode', false);
                linksService.updateLink(d);

                if (d.doi.doiWeightedSum >= (2 / 4) && !d.hidden && d.filtered) {
                  /* Expand. */
                  collapseService.handleCollapseExpandNode(d, 'e', 'auto');
                }
              } else {
                d.exaggerated = false;
                d.hidden = true;
                d3.select('#nodeId-' + an.autoId).classed('hiddenNode', true);
              }
            });
          }
        }
      });

      /* On node doi. */
      vis.graph.saNodes.forEach(function (san) {
        var maxDoi = d3.max(san.children.values(), function (n) {
          return n.doi.doiWeightedSum;
        });
        if (maxDoi < (3 / 4) && (allParentsHidden(san.children.values()[0]) ||
          san.parent.exaggerated)) {
          /* Collapse. */
          collapseService.handleCollapseExpandNode(san.children.values()[0], 'c', 'auto');
        }
      });

      /* On subanalysis doi. */
      vis.graph.saNodes.forEach(function (san) {
        var maxDoi = d3.max(san.parent.children.values(), function (cn) {
          return cn.doi.doiWeightedSum;
        });

        if (san.doi.doiWeightedSum >= (3 / 4) && !san.hidden && san.filtered) {
          /* Expand. */
          collapseService.handleCollapseExpandNode(san, 'e', 'auto');
        } else if (maxDoi < (2 / 4) && (allParentsHidden(san) ||
          san.parent.exaggerated)) {
          /* Collapse. */
          collapseService.handleCollapseExpandNode(san, 'c', 'auto');
        }
      });

      /* Recompute layout. */
      dagreService.dagreDynamicLayerLayout(vis.graph);

      if (partsService.fitToWindow) {
        provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
      }
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
      linksService.updateLink(n);

      if (n instanceof provvisDecl.Layer) {
        n.children.values().forEach(function (an) {
          updateNode(d3.select('#gNodeId-' + an.autoId), an, an.x, an.y);
          linksService.updateLink(an);
        });
      }
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
