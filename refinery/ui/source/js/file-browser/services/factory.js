angular.module('refineryFileBrowser')
    .factory("fileBrowserFactory", ['$http','assayFileService', fileBrowserFactory]);

function fileBrowserFactory($http, assayFileService) {
  "use strict";
  var assayFiles = [];
  var assayAttributes = [];

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

  return{
    assayFiles: assayFiles,
    assayAttributes: assayAttributes,
    getAssayFiles: getAssayFiles
  };

}
