(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = ['_', 'fileRelationshipService', 'toolSelectService'];

  function ToolSelectCtrl (_, fileRelationshipService, toolSelectService) {
    var fileService = fileRelationshipService;
    var toolService = toolSelectService;
    var vm = this;
    vm.refreshToolList = refreshToolList;
    vm.selectedTool = { select: null };
    vm.tools = toolService.toolList;
    vm.updateTool = updateTool;

    activate();

/*
 * -----------------------------------------------------------------------------
 * Methods Definitions
 * -----------------------------------------------------------------------------
 */
    function activate () {
      refreshToolList();
      if (!_.isEmpty(toolService.selectedTool)) {
        vm.selectedTool.select = toolService.selectedTool;
      }
    }

    function refreshToolList () {
      if (toolService.toolList.length === 0) {
        toolService.getTools().then(function () {
          vm.tools = toolService.toolList;
        });
      }
    }

    // user selects a new tool, so tool info needs updating
    function updateTool (tool) {
      toolService.setSelectedTool(tool);
      fileService.resetToolRelated();
      fileService.refreshFileMap();
      toolService.generateLaunchConfig();
    }
  }
})();
