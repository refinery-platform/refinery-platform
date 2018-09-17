/**
 * Provvis Analysis Timeline Service
 * @namespace provvisAnalysisTimelineService
 * @desc Service for creating the analysis timeline
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisAnalysisTimelineService', provvisAnalysisTimelineService);

  provvisAnalysisTimelineService.$inject = [
    'd3',
    'provvisDagreLayoutService',
    'provvisHelpersService',
    'provvisInitDOIService',
    'provvisPartsService',
    'provvisUpdateAnalysisService',
    'provvisUpdateLayerService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisAnalysisTimelineService (
    d3,
    provvisDagreLayoutService,
    provvisHelpersService,
    provvisInitDOIService,
    provvisPartsService,
    provvisUpdateAnalysisService,
    provvisUpdateLayerService,
    provvisUpdateNodeLinksService
  ) {
    var dagreService = provvisDagreLayoutService;
    var doiService = provvisInitDOIService;
    var partsService = provvisPartsService;
    var provvisHelpers = provvisHelpersService;
    var updateAnalysis = provvisUpdateAnalysisService;
    var updateLayers = provvisUpdateLayerService;
    var updateNodeLink = provvisUpdateNodeLinksService;

    var service = {
      createAnalysistimeColorScale: createAnalysistimeColorScale,
      filterAnalysesByTime: filterAnalysesByTime
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */

    /**
     * Creates a linear time scale ranging from the first to the last analysis
     * created.
     * @param aNodes Analysis nodes.
     * @param range Linear color scale for domain values.
     */
    function createAnalysistimeColorScale (aNodes, range) {
      var min = d3.min(aNodes, function (d) {
        return provvisHelpers.parseISOTimeFormat(d.start);
      });
      var max = d3.max(aNodes, function (d) {
        return provvisHelpers.parseISOTimeFormat(d.start);
      });

      return d3.time.scale()
        .domain([min, max])
        .range([range[0], range[1]]);
    }

    /* TODO: Update to incorporate facet filtering and adjust link visibility
     * on loose graphs. */
    /**
     * Filter analyses by time gradient timeline view.
     * @param lowerTimeThreshold The point of time where analyses executed before
     * are hidden.
     * @param upperTimeThreshold The point of time where analyses executed after
     * are hidden.
     * @param vis The provenance visualization root object.
     */
    function filterAnalysesByTime (lowerTimeThreshold, upperTimeThreshold, vis) {
      vis.graph.lNodes = partsService.lNodesBAK;
      vis.graph.aNodes = partsService.aNodesBAK;
      vis.graph.saNodes = partsService.saNodesBAK;
      vis.graph.nodes = partsService.nodesBAK;
      vis.graph.aLinks = partsService.aLinksBAK;
      vis.graph.lLinks = partsService.lLinksBAK;

      var selAnalyses = vis.graph.aNodes.filter(function (an) {
        upperTimeThreshold.setSeconds(upperTimeThreshold.getSeconds() + 1);
        return provvisHelpers.parseISOTimeFormat(an.start) >= lowerTimeThreshold &&
          provvisHelpers.parseISOTimeFormat(an.start) <= upperTimeThreshold;
      });

      /* Set (un)filtered analyses. */
      vis.graph.aNodes.forEach(function (an) {
        if (selAnalyses.indexOf(an) === -1) {
          an.filtered = false;
          an.children.values().forEach(function (san) {
            san.filtered = false;
            san.children.values().forEach(function (n) {
              n.filtered = false;
            });
          });
        } else {
          an.filtered = true;
          an.children.values().forEach(function (san) {
            san.filtered = true;
            san.children.values().forEach(function (n) {
              n.filtered = true;
            });
          });
        }
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
      updateAnalysis.updateAnalysisLinks(vis, partsService.linkStyle);
      updateLayers.updateLayerLinks(vis.graph.lLinks);

      vis.graph.aNodes.forEach(function (an) {
        updateNodeLink.updateLink(an);
      });
      vis.graph.lNodes.values().forEach(function (ln) {
        updateNodeLink.updateLink(ln);
      });

      /* TODO: Temporarily enabled. */
      if (partsService.doiAutoUpdate) {
        doiService.recomputeDOI();
      }
    }
  }
})();
