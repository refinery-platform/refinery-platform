angular.module('refineryFileBrowser')
    .factory("fileBrowserFactory", ['$http','assayFileService','settings', '$window', fileBrowserFactory]);

function fileBrowserFactory($http, assayFileService, settings, $window) {
  "use strict";
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];
  //var exposedAttributes = [];
  //var facetAttributes = [];

  var getAssayFiles = function (params) {
    params = params || {};
    params.attributes = exposedAttributes.join(',');
    params.facets = facetAttributes.join(',');

    var assayFile = assayFileService.query(params);
    assayFile.$promise.then(function (response) {
      angular.copy(response.attributes, assayAttributes);
      angular.copy(response.nodes, assayFiles);
    }, function (error) {
      console.log(error);
    });

    return assayFile.$promise;
  };

  var getAssayAttributeOrder = function () {
    var assay_uuid = $window.externalAssayUuid;
    var apiUrl = settings.appRoot + settings.refineryApiV2 +
      '/assays/' + assay_uuid + '/attributes/';

    return $http({
      method: 'GET',
      url: apiUrl,
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': assay_uuid}
    }).then(function (response) {
     // filterExposedAttributes(response.data);
      angular.copy(response.data, assayAttributeOrder);
    }, function (error) {
      console.log(error);
    });
  };

  //var filterExposedAttributes = function(attributes){
  //  var tempExposedAttributes = [];
  //  var tempFacetAttributes = [];
  //  attributes.forEach(function(attribute) {
  //    if (attribute.is_exposed) {
  //      tempExposedAttributes.push(attribute);
  //      if(attribute.is_facet) {
  //        tempFacetAttributes.push(attribute);
  //      }
  //    }
  //  });
  //  angular.copy(tempExposedAttributes, exposedAttributes);
  //  angular.copy(tempFacetAttributes, FacetAttributes);
  //};

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
    getAssayFiles: getAssayFiles,
    getAssayAttributeOrder: getAssayAttributeOrder,
    postAssayAttributeOrder: postAssayAttributeOrder,
  };

}
