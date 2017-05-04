(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolListService', toolListService);

  toolListService.$inject = ['toolsDefinitionsService'];

  function toolListService (toolsDefinitionsService) {
    var selectedTool = {};
    var toolList = [];

    var service = {
      getTools: getTools,
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
      var toolsDefs = toolsDefinitionsService.query();
      toolsDefs.$promise.then(function (response) {
        angular.copy(response, toolList);
      });
      return toolsDefs.$promise;
    }
  }
})();
