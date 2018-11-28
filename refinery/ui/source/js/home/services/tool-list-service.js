/**
 * Tool List Service
 * @namespace Tool List Service
 * @desc Service which grabs a list of tool defintions.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .factory('toolListService', toolListService);

  toolListService.$inject = ['toolDefinitionsService'];

  function toolListService (toolDefinitionsService) {
    var toolList = [];

    var service = {
      getTools: getTools,
      toolList: toolList
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    /**
     * @name getTools
     * @desc  Copies the list of tools from tool definition service
     * @memberOf refineryToolLaunch.toolSelectService
    **/
    function getTools () {
      var toolDefs = toolDefinitionsService.query();
      toolDefs.$promise.then(function (response) {
        angular.copy(response, toolList);
      });
      return toolDefs.$promise;
    }
  }
})();
