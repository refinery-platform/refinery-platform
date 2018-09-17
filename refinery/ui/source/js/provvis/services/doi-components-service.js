/**
 * provvis Decl Doi Components
 * @namespace provvisDeclDoiComponents
 * @desc Service for constructor methods
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDeclDoiComponents', provvisDeclDoiComponents);

  provvisDeclDoiComponents.$inject = [
    'provvisDeclDoiFactors'
  ];

  function provvisDeclDoiComponents (
    provvisDeclDoiFactors
  ) {
    var DoiFactors = provvisDeclDoiFactors;

    var service = {
      DoiComponents: DoiComponents
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
     /**
     * Constructor function representing the degree-of-interest (DOI)
     * components for BaseNode.
     * @param node The encapsulating node.
     * @constructor
     */
    function DoiComponents (node) {
      this.node = node;

      /* API: General interest. */
      /* ********************** */

      /* The latest execution time of a node is more important
       * than earlier executions.
       */
      this.doiTime = 0;

      /* For weak layering, analyses are layered without considering the number
       * of subanlayses, inputs or outputs. Therefore a diff in those three
       * categories may occur. The number of nodes carrying a diff in relation
       * to the number of layered nodes.
       */

      this.doiLayerDiff = 0;

      /* For layered nodes: Workflow parameters, files or topology changes over
       * time.
       */
      this.change = {
        wfParams: d3.map(),
        files: d3.map(),
        topology: d3.map()
      };

      /* Corresponds to the node type: Node, subanalysis, analysis.*/
      this.relationship = 0;

      /* The overall graph width and height influences node appearances.*/
      this.graphMetrics = {
        width: -1,
        height: -1
      };


      /* UI: Interest derived from user actions. */
      /* *************************************** */

      /* A node is in the result set of filter actions. */
      this.doiFiltered = 0;

      /* A node is selected by user actions. */
      this.doiSelected = 0;

      /* A node is part of a node-link path highlighted. */
      this.doiHighlighted = 0;


      /* Distance. */
      /* ********* */

      /* A node's neighborhood directly influences it's DOI value through
       * link weight and fallout function.
       */
      this.neighborhoodDoiFactor = 1;


      /* Computation. */
      /* ************ */

      /* A node's dominant component is represented by the minimum or maximum
       * value throughout all components.
       */
      this.doiMinMax = -1;

      /* A node's average DOI value is calculated by the sum of all weighted
       * single DOI component values.
       */
      this.doiWeightedSum = -1;

       /**
       * Look up filtered attribute for encapsulating node.
       * A node is within the filter results.
       */
      this.filteredChanged = function () {
        this.doiFiltered = this.node.filtered ? 1 : 0.5;
        this.computeWeightedSum();
      };

      /**
       * A node can be selected for further actions or detailed information.
       */
      this.selectedChanged = function () {
        this.doiSelected = this.node.selected ? 1 : 0;
        this.computeWeightedSum();
      };

      /**
       * A path containing nodes may be highlighted.
       */
      this.highlightedChanged = function () {
        this.doiHighlighted = this.node.highlighted ? 1 : 0;
        this.computeWeightedSum();
      };

      /**
       * Based on the time frame, calculate component weight.
       * @param factor The analysis start time scaled between 0 and 1.
       */
      this.initTimeComponent = function (factor) {
        this.doiTime = factor;
        this.computeWeightedSum();
      };

      /**
       * Based on amount of nodes with a diff within a layer, calculate component
       * weight.
       * @param factor The accumulated diffs scaled between 0 and 1.
       */
      this.initLayerDiffComponent = function (factor) {
        this.doiLayerDiff = factor;
        this.computeWeightedSum();
      };

      /**
       * Calculates the dominant doi component.
       */
      this.computeMinMax = function () {
        /* TODO: Based on heuristics, find dominant component.*/
        this.doiMinMax = -1;
      };

      /**
       * Calculates a weighted doi value among all doi components considering
       * component weights.
       */
      this.computeWeightedSum = function () {
        this.doiWeightedSum = (
          this.doiFiltered * DoiFactors.factors.filtered.value +
          this.doiSelected * DoiFactors.factors.selected.value +
          this.doiHighlighted * DoiFactors.factors.highlighted.value +
          this.doiTime * DoiFactors.factors.time.value +
          this.doiLayerDiff * DoiFactors.factors.diff.value
        ).toFixed(2);
      };
    }
  }
})();
