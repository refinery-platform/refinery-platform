/**
 * Tool Params Service
 * @namespace toolParamsService
 * @desc I am a description
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolParamsService', toolParamsService);

  toolParamsService.$inject = [];

  function toolParamsService (
  ) {
    var toolParams = [];

    var service = {
      refreshToolParams: refreshToolParams,
      toolParams: toolParams
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    //
    function refreshToolParams (tool) {
      angular.copy(tool.parameters, toolParams);
    }
  }
})();
