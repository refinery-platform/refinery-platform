(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = ['_', 'toolsService'];

  function ToolSelectCtrl (_, toolsService) {
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
      if (!_.isEmpty(toolsService.selectedTool)) {
        vm.selectedTool.select = toolsService.selectedTool;
      }
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
