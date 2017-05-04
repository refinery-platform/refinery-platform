(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = ['_', 'fileRelationshipService', 'toolListService'];

  function ToolSelectCtrl (_, fileRelationshipService, toolListService) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.refreshToolList = refreshToolList;
    vm.selectedTool = { select: null };
    vm.tools = toolListService.toolList;
    vm.updateTool = updateTool;

    activate();

/*
 * -----------------------------------------------------------------------------
 * Methods Definitions
 * -----------------------------------------------------------------------------
 */
    function activate () {
      refreshToolList();
      if (!_.isEmpty(toolListService.selectedTool)) {
        vm.selectedTool.select = toolListService.selectedTool;
      }
    }

    function refreshToolList () {
      if (toolListService.toolList.length === 0) {
        toolListService.getTools().then(function () {
          vm.tools = toolListService.toolList;
        });
      }
    }

    // user selects a new tool, so tool info needs updating
    function updateTool (tool) {
      toolListService.setSelectedTool(tool);
      fileService.resetToolRelated();
      fileService.refreshFileMap();
    }
  }
})();
