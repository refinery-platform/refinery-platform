/**
 * Tool Params Service
 * @namespace toolParamsService
 * @desc Service which keeps the select tool parameters and the user's
 * updated params for the launch config.
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
    /**
     * Variable sourced from the parameter UI form and used to create
     * launchConfig.parameters, ex: {parameterUuid:value, parameterUuid2:value2}
     * @var {object} paramsForm
    */
    var paramsForm = {};
    /**
     * Variable sourced from selectedTool and used generate Parameters panel
     * @var {array} toolParams
    */
    var toolParams = [];

    var service = {
      paramsForm: paramsForm,
      refreshToolParams: refreshToolParams,
      toolParams: toolParams
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * @name refreshToolParams
     * @desc Used by toolSelectService, updates the selected tool's
     * parameters used by the UI parameters panel
     * @memberOf refineryToolLaunch.toolParamsService
     * @param {object} tool - select tool object, includes property parameters
    **/
    function refreshToolParams (tool) {
      angular.copy(tool.parameters, toolParams);
    }
  }
})();
