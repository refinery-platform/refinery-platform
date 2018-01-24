/**
 * File Param Service
 * @namespace fileParamService
 * @desc Service which tracks the params used to retrieve assay files
 * @memberOf refineryFileBrowser
 */
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
      data_set_uuid: $window.dataSetUuid,
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


    /**
     * @name resetParamFilterAttribute
     * @desc  Clears the filter attribute but also initializes it in case
     * method want to set a filter_attribute key which can throw a
     * javascript error if the filter_attribute is not already initialized
     * @memberOf refineryFileBrowser.fileParamService
    **/
    function resetParamFilterAttribute () {
      fileParam.filter_attribute = {};
    }

    /**
     * @name setParamFilterAttribute
     * @desc  Service requires a deep copy for filter_attribute which is an
     * obj. The reset param serves as an initializing method, in case the
     * key is not pre-exisiting
     * @memberOf refineryFileBrowser.fileParamService
     * @param {object} attributeObj - ex {internalFileName: [{fieldName: true}, fieldName2: true]}
    **/
    function setParamFilterAttribute (attributeObj) {
      resetParamFilterAttribute();
      angular.copy(attributeObj, fileParam.filter_attribute);
    }
  }
})();
