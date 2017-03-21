(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = ['toolsService'];

  function ToolSelectCtrl (toolsService) {
    var vm = this;
    vm.refreshToolList = refreshToolList;
    vm.selectedTool = { select: null };
    vm.tools = toolsService.toolList;
    vm.updateTool = updateTool;

    activate();

/*
 * -----------------------------------------------------------------------------
 * Methods Definitions
 * -----------------------------------------------------------------------------
 */
    function activate () {
      refreshToolList();
    }

    function refreshToolList () {
      toolsService.getTools().then(function () {
        vm.tools = toolsService.toolList;
      });
    }

    function updateTool (tool) {
      toolsService.setSelectedTool(tool);
    }
  }
})();
