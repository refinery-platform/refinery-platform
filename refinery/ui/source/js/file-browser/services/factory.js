angular.module('refineryFileBrowser')
    .factory("fileBrowserFactory", ['$http','assayFileService','settings', '$window', fileBrowserFactory]);

function fileBrowserFactory($http, assayFileService, settings, $window) {
  "use strict";
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];
  var attributeFilter = {};
  var analysisFilter = {};

  var getAssayFiles = function (params) {
    params = params || {};

    var assayFile = assayFileService.query(params);
    assayFile.$promise.then(function (response) {
      angular.copy(response.attributes, assayAttributes);
      angular.copy(response.nodes, assayFiles);
      generateFilters(response.attributes, response.facet_field_counts);
    }, function (error) {
      console.log(error);
    });

    return assayFile.$promise;
  };

  var generateFilters = function(attributes, facet_counts){
    attributes.forEach(function(facetObj){
      var facetObjCount =  facet_counts[facetObj.internal_name];
       //for filtering out (only)attributes with only 1 field
      var facetObjCountMinLen = Object.keys(facetObjCount).length > 1;

      if(facetObjCountMinLen && facetObj.display_name !== 'Analysis'){
          attributeFilter[facetObj.display_name] = {
            'facetObj': facetObjCount,
            'internal_name': facetObj.internal_name
          };
      }else if(facetObjCount && facetObj.display_name === 'Analysis'){
        analysisFilter[facetObj.display_name]= {
          'facetObj': facetObjCount,
          'internal_name': facetObj.internal_name
        };
      }
    });
  };

  var getAssayAttributeOrder = function (uuid) {
    var apiUrl = settings.appRoot + settings.refineryApiV2 +
      '/assays/' + uuid + '/attributes/';

    return $http({
      method: 'GET',
      url: apiUrl,
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': uuid}
    }).then(function (response) {
      angular.copy(response.data, assayAttributeOrder);
    }, function (error) {
      console.log(error);
    });
  };

  var postAssayAttributeOrder = function (uuid) {
    return $http({
      method: 'POST',
      url: settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/attributes/',
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': uuid}
    }).then(function (response) {
      console.log(response);
    }, function (error) {
      console.log(error);
    });
  };

  return{
    assayFiles: assayFiles,
    assayAttributes: assayAttributes,
    assayAttributeOrder: assayAttributeOrder,
    attributeFilter: attributeFilter,
    analysisFilter: analysisFilter,
    getAssayFiles: getAssayFiles,
    getAssayAttributeOrder: getAssayAttributeOrder,
    postAssayAttributeOrder: postAssayAttributeOrder,
  };

}
