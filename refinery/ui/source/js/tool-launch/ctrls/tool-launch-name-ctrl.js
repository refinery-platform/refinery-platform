/**
 * Tool Launch Name Ctrl
 * @namespace ToolLaunchNameCtrl
 * @desc Component controller for launch name input
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('ToolLaunchNameCtrl', ToolLaunchNameCtrl);

  ToolLaunchNameCtrl.$inject = [
    '$log',
    '$scope',
    'settings',
    'toolParamsService',
    'toolSelectService'
  ];

  function ToolLaunchNameCtrl (
    $log,
    $scope,
    settings,
    toolParamsService,
    toolSelectService
  ) {
    var vm = this;
    vm.form = { name: '' };
    vm.selectedTool = {};
    vm.toolType = '';
    vm.updateToolLaunchName = updateToolLaunchName;
    vm.userName = settings.djangoApp.userName;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
    /**
     * @name updateToolLaunchName
     * @desc  view method which updates tool launch name when input changes
     * @memberOf refineryApp.refineryToolLaunch.
    **/
    function updateToolLaunchName (inputName) {
      toolParamsService.paramsForm.display_name = inputName;
    }
  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    $scope.$watchCollection(
      function () {
        return toolSelectService.selectedTool;
      },
      function () {
        if (toolSelectService.selectedTool) {
          angular.copy(toolSelectService.selectedTool, vm.selectedTool);
          var lCToolType = toolSelectService.selectedTool.tool_type.toLowerCase();
          vm.toolType = lCToolType[0].toUpperCase() + lCToolType.slice(1, lCToolType.length);
        }
      }
    );
  }
})();
