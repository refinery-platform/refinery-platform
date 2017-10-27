/**
 * Tool Select Service
 * @namespace toolSelectService
 * @desc Service tracks the selected tool, grabs the tool definition
 * list from service, and tracks if the panels are collapsed
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolSelectService', toolSelectService);

  toolSelectService.$inject = ['$window', 'toolDefinitionsService'];

  function toolSelectService ($window, toolDefinitionsService) {
    var selectedTool = {};
    var toolList = [];
    var isToolInfoCollapsed = true;
    var isToolPanelCollapsed = true;
    var dataSetUuid = $window.dataSetUuid;

    var service = {
      getTools: getTools,
      isToolInfoCollapsed: isToolInfoCollapsed,
      isToolPanelCollapsed: isToolPanelCollapsed,
      selectedTool: selectedTool,
      setSelectedTool: setSelectedTool,
      toolList: toolList
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    /**
     * @name setSelectedTool
     * @desc  Deep copy of tool
     * @memberOf refineryToolLaunch.toolSelectService
     * @param {obj} tool - api response tool
    **/
    function setSelectedTool (tool) {
      angular.copy(tool, selectedTool);
    }

    /**
     * @name getTools
     * @desc  Copies the list of tools from tool definition service
     * @memberOf refineryToolLaunch.toolSelectService
    **/
    function getTools () {
      var params = {
        dataSetUuid: dataSetUuid
      };

      var toolDefs = toolDefinitionsService.query(params);
      toolDefs.$promise.then(function (response) {
        angular.copy(response, toolList);
      });
      return toolDefs.$promise;
    }
  }
})();
