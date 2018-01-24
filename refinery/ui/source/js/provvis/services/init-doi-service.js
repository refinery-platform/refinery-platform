/**
 * provvis Init DOI Service
 * @namespace provvisInitDOIService
 * @desc Service for computing DOI
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisInitDOIService', provvisInitDOIService);

  provvisInitDOIService.$inject = [
    'd3',
    'provvisHelpersService',
    'provvisPartsService',
    'provvisHandleCollapseService'
  ];

  function provvisInitDOIService (
    d3,
    provvisHelpersService,
    provvisPartsService,
    provvisHandleCollapseService
  ) {
    var partsService = provvisPartsService;
    var provvisHelpers = provvisHelpersService;
    var collapseService = provvisHandleCollapseService;

    var service = {
      initDoiFilterComponent: initDoiFilterComponent,
      initDoiTimeComponent: initDoiTimeComponent,
      initDoiLayerDiffComponent: initDoiLayerDiffComponent,
      recomputeDOI: recomputeDOI
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */

    /**
     * Compute doi weight based on nodes initially set as filtered.
     * @param lNodes Layer nodes.
     */
    function initDoiFilterComponent (lNodes) {
      lNodes.values().forEach(function (ln) {
        ln.filtered = true;
        ln.doi.filteredChanged();

        ln.children.values().forEach(function (an) {
          an.filtered = true;
          an.doi.filteredChanged();

          an.children.values().forEach(function (san) {
            san.filtered = true;
            san.doi.filteredChanged();

            san.children.values().forEach(function (n) {
              n.filtered = true;
              n.doi.filteredChanged();
            });
          });
        });
      });
    }

    /**
    * Compute doi weight based on analysis start time.
    * @param aNodes Analysis nodes.
    */
    function initDoiTimeComponent (aNodes) {
      var vis = partsService.vis;
      var min = d3.time.format.iso(new Date(0));
      var max = d3.time.format.iso(new Date(0));

      if (aNodes.length > 1) {
        min = d3.min(aNodes, function (d) {
          return provvisHelpers.parseISOTimeFormat(d.start);
        });
        max = d3.max(aNodes, function (d) {
          return provvisHelpers.parseISOTimeFormat(d.start);
        });
      }

      var doiTimeScale = d3.time.scale()
        .domain([min, max])
        .range([0.0, 1.0]);

      aNodes.forEach(function (an) {
        an.doi.initTimeComponent(doiTimeScale(provvisHelpers.parseISOTimeFormat(an.start)));
        an.children.values().forEach(function (san) {
          san.doi.initTimeComponent(doiTimeScale(provvisHelpers.parseISOTimeFormat(an.start)));
          san.children.values().forEach(function (n) {
            n.doi.initTimeComponent(doiTimeScale(provvisHelpers.parseISOTimeFormat(an.start)));
          });
        });
      });

      vis.graph.lNodes.values().forEach(function (l) {
        l.doi.initTimeComponent(d3.mean(l.children.values(), function (an) {
          return doiTimeScale(provvisHelpers.parseISOTimeFormat(an.start));
        }));
      });
    }

    /**
     * Compute doi weight based on the motif diff.
     * @param lNodes Layer nodes.
     * @param aNodes Analysis nodes.
     */
    function initDoiLayerDiffComponent (lNodes, aNodes) {
      var doiDiffMin = 0;
      var doiDiffMax = d3.max(aNodes, function (an) {
        return d3.max([Math.abs(an.motifDiff.numIns),
          Math.abs(an.motifDiff.numSubanalyses),
          Math.abs(an.motifDiff.numOuts)], function (d) {
          return d;
        });
      });

      partsService.doiDiffScale = d3.scale.linear()
        .domain([doiDiffMin, doiDiffMax])
        .range([0.0, 1.0]);

      /* Init analysis nodes with a factor in relation to the highes diff in
       the whole graph. */
      aNodes.forEach(function (an) {
        an.doi.initLayerDiffComponent(partsService.doiDiffScale(Math.abs(an.motifDiff.numIns) +
          Math.abs(an.motifDiff.numOuts) +
          Math.abs(an.motifDiff.numSubanalyses)));
        an.children.values().forEach(function (san) {
          san.doi.initLayerDiffComponent(an.doi.doiLayerDiff);
          san.children.values().forEach(function (cn) {
            cn.doi.initLayerDiffComponent(an.doi.doiLayerDiff);
          });
        });
      });

      /* Init layer nodes with max value from child nodes. */
      lNodes.values().forEach(function (ln) {
        var anMax = d3.max(ln.children.values(), function (an) {
          return an.doi.doiLayerDiff;
        });
        ln.doi.initLayerDiffComponent(anMax);
      });
    }

      /**
   * Recomputes the DOI for every node
   */
    function recomputeDOI () {
      var vis = partsService.vis;
      vis.graph.lNodes.values().forEach(function (l) {
        l.doi.computeWeightedSum();
        l.children.values().forEach(function (an) {
          an.doi.computeWeightedSum();
          an.children.values().forEach(function (san) {
            san.doi.computeWeightedSum();
            san.children.values().forEach(function (n) {
              n.doi.computeWeightedSum();
            });
          });
        });
      });
      collapseService.updateNodeDoi(partsService.domNodeset);
    }
  }
})();
