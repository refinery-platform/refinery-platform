/**
 * Tool Display Ctrl
 * @namespace ToolDisplayCtrl
 * @desc Main controller for the main view, tool display. Ctrl for parent
  * component and updates the selected tool
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolDisplayCtrl', ToolDisplayCtrl);

  ToolDisplayCtrl.$inject = [
    '$scope',
    '_',
    'toolSelectService'];

  function ToolDisplayCtrl (
    $scope,
    _,
    toolSelectService
  ) {
    var toolService = toolSelectService;
    var vm = this;
    vm.selectedTool = {};
    vm.isToolSelected = false;

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
    $scope.$watchCollection(
      function () {
        return toolService.selectedTool;
      },
      function () {
        angular.copy(toolService.selectedTool, vm.selectedTool);
        vm.isToolSelected = !(_.isEmpty(vm.selectedTool));
      }
    );
  }
})();
