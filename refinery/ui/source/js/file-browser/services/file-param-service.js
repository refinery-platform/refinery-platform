(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .factory('fileParamService', fileParamService);

  fileParamService.$inject = ['$window'];

  function fileParamService ($window) {
    // params for the assays api
    var fileParam = {
      uuid: $window.externalAssayUuid,
      offset: 0
    };

    var service = {
      fileParam: fileParam,
      resetParamFilterAttribute: resetParamFilterAttribute,
      setParamFilterAttribute: setParamFilterAttribute
    };

    return service;
    /*
     * ---------------------------------------------------------
     * Methods
     * ---------------------------------------------------------
     */
    function resetParamFilterAttribute () {
      fileParam.filter_attribute = {};
    }

    function setParamFilterAttribute (attributeObj) {
      resetParamFilterAttribute();
      angular.copy(attributeObj, fileParam.filter_attribute);
    }
  }
})();
