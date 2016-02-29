angular.module('refineryFileBrowser')
    .factory("fileBrowserFactory", ['$http','assayFileService','settings', fileBrowserFactory]);

function fileBrowserFactory($http, assayFileService, settings) {
  "use strict";
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];

  var getAssayFiles = function (params) {
    params = params || {};

    var assayFile = assayFileService.query(params);
    assayFile.$promise.then(function (response) {
      angular.copy(response.attributes, assayAttributes);
      angular.copy(response.nodes, assayFiles);
    }, function (error) {
      console.log(error);
    });

    return assayFile.$promise;
  };

  var getAssayAttributes = function (uuid) {
    return $http({
      method: 'GET',
      url: settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/attributes/',
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': uuid}
    }).then(function (response) {
      console.log(response);
    }, function (error) {
      console.log(error);
    });
  };

  var postAssayAttributes = function (uuid) {
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
    getAssayAttributes: getAssayAttributes,
    postAssayAttributes: postAssayAttributes,
  };

}
