(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolSelectService', toolSelectService);

  toolSelectService.$inject = ['toolDefinitionsService'];

  function toolSelectService (toolDefinitionsService) {
    var selectedTool = {};
    var toolList = [];
    var isToolPanelCollapsed = true;

    var service = {
      getTools: getTools,
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
    function setSelectedTool (tool) {
      angular.copy(tool, selectedTool);
    }

    function getTools () {
      var toolDefs = toolDefinitionsService.query();
      toolDefs.$promise.then(function (response) {
        angular.copy(response, toolList);
      });
      return toolDefs.$promise;
    }
  }
})();
