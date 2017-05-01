(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = ['_', 'fileRelationshipService', 'toolsService'];

  function ToolSelectCtrl (_, fileRelationshipService, toolsService) {
    var fileService = fileRelationshipService;
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
      if (toolsService.toolList.length === 0) {
        toolsService.getTools().then(function () {
          vm.tools = toolsService.toolList;
        });
      }
    }

    // user selects a new tool, so tool info needs updating
    function updateTool (tool) {
      toolsService.setSelectedTool(tool);
      fileService.resetToolRelated();
      fileService.refreshFileMap();
    }
  }
})();
