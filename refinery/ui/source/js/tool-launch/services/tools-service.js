(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolsService', [toolsService]);

  function toolsService () {
    var selectedTool = {};
    var toolList = [
      { name: 'Workflow 1' },
      { name: 'Workflow 2' },
      { name: 'Visualization 1' }
    ];

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    function setSelectedTool (tool) {
      angular.copy(tool, selectedTool);
    }


    /* Return */
    return {
      selectedTool: selectedTool,
      setSelectedTool: setSelectedTool,
      toolList: toolList
    };
  }
})();
