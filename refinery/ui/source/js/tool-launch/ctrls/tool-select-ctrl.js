(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = ['toolsService'];

  function ToolSelectCtrl (toolsService) {
    var vm = this;
    vm.selectedTool = { select: null };
    vm.tools = toolsService.toolList;
    vm.updateTool = updateTool;

/*
 * -----------------------------------------------------------------------------
 * Methods Definitions
 * -----------------------------------------------------------------------------
 */
    function updateTool () {
      toolsService.setSelectedTool({ name: vm.selectedTool.select.name });
    }
  }
})();
