(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .factory('assayFiltersService', assayFiltersService);

  function assayFiltersService () {
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

    /** Configures the attribute and analysis filter data by adding the display
     * name from the assay files attributes display_name. The attributes returns
     * all fields, while the counts will return only the faceted fields. **/
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
