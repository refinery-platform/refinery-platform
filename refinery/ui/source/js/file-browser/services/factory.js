'use strict';

function fileBrowserFactory ($http, assayFileService, settings, $window) {
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];
  var attributeFilter = {};
  var analysisFilter = {};
  var assayFilesTotalItems = {};

  // Helper function encodes field array in an obj
  var encodeAttributeFields = function (attributeObj) {
    angular.forEach(attributeObj, function (fieldArray) {
      for (var ind = 0; ind < fieldArray.length; ind++) {
        fieldArray[ind] = $window.encodeURIComponent(fieldArray[ind]);
      }
    });
    return (attributeObj);
  };

  var generateFilters = function (attributes, facetCounts) {
    // resets the attribute filters, which can be changed by owners
    var outAttributeFilter = {};
    var outAnalysisFilter = {};

    attributes.forEach(function (facetObj) {
      var facetObjCount = facetCounts[facetObj.internal_name];
      // for filtering out (only)attributes with only 1 field
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
    });
    return {
      attributeFilter: outAttributeFilter,
      analysisFilter: outAnalysisFilter
    };
  };

  var getAssayFiles = function (_params_) {
    var params = _params_ || {};

    // encodes all field names to avoid issues with escape characters.
    if (typeof params.filter_attribute !== 'undefined') {
      params.filter_attribute = encodeAttributeFields(params.filter_attribute);
    }

    var assayFile = assayFileService.query(params);
    assayFile.$promise.then(function (response) {
      angular.copy(response.attributes, assayAttributes);
      angular.copy(response.nodes, assayFiles);
      assayFilesTotalItems.count = response.nodes_count;
      var filterObj = generateFilters(response.attributes, response.facet_field_counts);
      angular.copy(filterObj.attributeFilter, attributeFilter);
      angular.copy(filterObj.analysisFilter, analysisFilter);
    });
    return assayFile.$promise;
  };

  var getAssayAttributeOrder = function (uuid) {
    var apiUrl = settings.appRoot + settings.refineryApiV2 +
      '/assays/' + uuid + '/attributes/';

    return $http({
      method: 'GET',
      url: apiUrl,
      data: {
        csrfmiddlewaretoken: $window.csrf_token,
        uuid: uuid
      }
    }).then(function (response) {
      angular.copy(response.data, assayAttributeOrder);
    });
  };

  var postAssayAttributeOrder = function (uuid) {
    return $http({
      method: 'POST',
      url: settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/attributes/',
      data: {
        csrfmiddlewaretoken: $window.csrf_token,
        uuid: uuid
      }
    });
  };

  return {
    assayFiles: assayFiles,
    assayAttributes: assayAttributes,
    assayAttributeOrder: assayAttributeOrder,
    attributeFilter: attributeFilter,
    analysisFilter: analysisFilter,
    assayFilesTotalItems: assayFilesTotalItems,
    getAssayFiles: getAssayFiles,
    getAssayAttributeOrder: getAssayAttributeOrder,
    postAssayAttributeOrder: postAssayAttributeOrder
  };
}

angular
  .module('refineryFileBrowser')
  .factory('fileBrowserFactory', [
    '$http',
    'assayFileService',
    'settings',
    '$window',
    fileBrowserFactory
  ]
);
