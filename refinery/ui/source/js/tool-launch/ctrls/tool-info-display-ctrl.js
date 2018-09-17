/**
 * Tool Info Display Ctrl
 * @namespace ToolInfoDisplayCtrl
 * @desc Controller for the child component, rpToolInfoDisplay. Outer panel
  * for displaying tool description.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolInfoDisplayCtrl', ToolInfoDisplayCtrl);

  ToolInfoDisplayCtrl.$inject = ['$scope', 'toolSelectService'];

  function ToolInfoDisplayCtrl ($scope, toolSelectService) {
    var vm = this;
    vm.tool = {};
    vm.isToolInfoCollapsed = toolSelectService.isToolInfoCollapsed;

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
          angular.copy(vm.displayCtrl.selectedTool, vm.tool);
        }
      );
    };
  }
})();
