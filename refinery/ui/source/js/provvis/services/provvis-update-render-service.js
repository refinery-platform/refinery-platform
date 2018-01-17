/**
 * provvis Update Render Service
 * @namespace provvisUpdateRenderService
 * @desc Service for updating the provvis render graph
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
    'provvisInitDOIService',
    'provvisHelpersService',
    'provvisPartsService',
    'provvisUpdateAnalysisService',
    'provvisUpdateLayerService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisUpdateRenderService (
    $,
    provvisDagreLayoutService,
    provvisInitDOIService,
    provvisHelpersService,
    provvisPartsService,
    provvisUpdateAnalysisService,
    provvisUpdateLayerService,
    provvisUpdateNodeLinksService
  ) {
    var analysisService = provvisUpdateAnalysisService;
    var dagreService = provvisDagreLayoutService;
    var doiService = doiService;
    var layerService = provvisUpdateLayerService;
    var partsService = provvisPartsService;
    var provvisHelpers = provvisHelpersService;
    var updateNodeLink = provvisUpdateNodeLinksService;

    var service = {
      runRenderUpdate: runRenderUpdate
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
        vis.graph.lNodes = partsService.lNodesBAK;
        vis.graph.aNodes = partsService.aNodesBAK;
        vis.graph.saNodes = partsService.saNodesBAK;
        vis.graph.nodes = partsService.nodesBAK;
        vis.graph.aLinks = partsService.aLinksBAK;
        vis.graph.lLinks = partsService.lLinksBAK;

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

        updateNodeLink.updateNodeFilter();
        updateNodeLink.updateLinkFilter();
        analysisService.updateAnalysisLinks(vis);
        layerService.updateLayerLinks(vis.graph.lLinks);

        vis.graph.aNodes.forEach(function (an) {
          updateNodeLink.updateLink(an);
        });
        vis.graph.lNodes.values().forEach(function (ln) {
          updateNodeLink.updateLink(ln);
        });

        /* TODO: Currently enabled. */
        if (partsService.doiAutoUpdate) {
          doiService.recomputeDOI();
        }
      }
      angular.copy(solrResponse, partsService.lastSolrResponse);
    }
  }
})();
