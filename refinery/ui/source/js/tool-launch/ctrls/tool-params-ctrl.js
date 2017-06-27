/**
 * Tool Params Ctrl
 * @namespace ToolParamsCtrl
 * @desc Ctrl for rpToolParams directive, which is the parameter's panel.
 * Include collapsing, displaying parameters, and form for parameters.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolParamsCtrl', ToolParamsCtrl);

  ToolParamsCtrl.$inject = [
    '$scope',
    'toolParamsService'
  ];


  function ToolParamsCtrl (
    $scope,
    toolParamsService
  ) {
    var paramsService = toolParamsService;
    var vm = this;
    vm.isToolParamsCollapsed = true; // tracks the parameters panel
    vm.params = paramsService.toolParams;
    vm.paramsForm = paramsService.paramsForm;

    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */

    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.displayCtrl.selectedTool;
        },
        function () {
          vm.params = paramsService.toolParams;
        }
      );
    };
  }
})();
