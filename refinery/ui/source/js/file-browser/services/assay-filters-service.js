/**
 * Assay Filters Service
 * @namespace assayFiltersService
 * @desc Service variables need to be set by api solr response in order to
 * generate the ui attribute/analysis filter for UI Grid table
 * @memberOf refineryFileBrowser
 */
(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .factory('assayFiltersService', assayFiltersService);

  function assayFiltersService () {
    // ex of the filter data structure: {Author: {
    // facetObj: {author1: 4}, internal_name: Author_Characteristics_6_3_s}
    var analysisFilter = {};
    var attributeFilter = {};

    var service = {
      analysisFilter: analysisFilter,
      attributeFilter: attributeFilter,
      generateFilters: generateFilters
    };

    return service;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * @name generateFilters
     * @desc  Configures the attribute and analysis filter data by adding the display
     * name from the assay files attributes display_name. The attributes returns
     * all fields, while the counts will return only the faceted fields.
     * @memberOf refineryFileBrowser.assayFiltersService
     * @param {obj} attributes - attribute obj from solr response
     * @param {obj} facetCounts - facetCount obj from solr response which
     * maintains # of fields count
    **/
    function generateFilters (attributes, facetCounts) {
      // resets the attribute filters, which can be changed by owners
      var outAttributeFilter = {};
      var outAnalysisFilter = {};
      attributes.forEach(function (facetObj) {
        if (facetCounts[facetObj.internal_name] !== undefined) {
          var facetObjCount = facetCounts[facetObj.internal_name];
          // for filtering out (only) attributes with only 1 field
          var facetObjCountMinLen = Object.keys(facetObjCount).length > 1;

          if (facetObjCountMinLen && facetObj.display_name !== 'Analysis') {
            outAttributeFilter[facetObj.display_name] = {
              facetObj: facetObjCount,
              internal_name: facetObj.internal_name
            };
          } else if (facetObjCount && facetObj.display_name === 'Analysis') {
            outAnalysisFilter[facetObj.display_name] = {
              facetObj: facetObjCount,
              internal_name: facetObj.internal_name
            };
          }
        }
      });

      angular.copy(outAttributeFilter, attributeFilter);
      angular.copy(outAnalysisFilter, analysisFilter);
    }
  }
})();
