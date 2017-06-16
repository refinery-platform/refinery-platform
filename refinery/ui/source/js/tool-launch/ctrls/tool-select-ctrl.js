/**
 * Tool Select Ctrl
 * @namespace ToolSelectCtrl
 * @desc Controller for component, rpToolSelect. Displays and allows user
  * selection of a tool.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolSelectCtrl', ToolSelectCtrl);

  ToolSelectCtrl.$inject = [
    '_',
    'fileRelationshipService',
    'toolParamsService',
    'toolSelectService'
  ];

  function ToolSelectCtrl (
    _,
    fileRelationshipService,
    toolParamsService,
    toolSelectService
  ) {
    var fileService = fileRelationshipService;
    var paramsService = toolParamsService;
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
      refreshToolList(); // intialize tool list
      // for tabbing, previous value exists in selectedTool
      if (!_.isEmpty(toolService.selectedTool)) {
        vm.selectedTool.select = toolService.selectedTool;
      }
    }


  /**
   * @name refreshToolList
   * @desc Initializes the tool list from toolService
   * @memberOf refineryToolLaunch.ToolSelectCtrl
  **/
    function refreshToolList () {
      if (toolService.toolList.length === 0) {
        toolService.getTools().then(function () {
          vm.tools = toolService.toolList;
        });
      }
    }


   /**
    * @name refreshToolList
    * @desc VM method when user selects a new tool, updates service and
    * calls on methods to reset any tool related data.
    * @memberOf refineryToolLaunch.ToolSelectCtrl
    **/
    function updateTool (tool) {
      toolService.setSelectedTool(tool);
      fileService.resetToolRelated();
      fileService.refreshFileMap();
      paramsService.refreshToolParams(tool);
    }
  }
})();
