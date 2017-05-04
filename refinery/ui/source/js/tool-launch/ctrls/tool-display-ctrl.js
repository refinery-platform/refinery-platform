(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolDisplayCtrl', ToolDisplayCtrl);

  ToolDisplayCtrl.$inject = [
    '$scope',
    '_',
    'toolListService'];

  function ToolDisplayCtrl (
    $scope,
    _,
    toolListService
  ) {
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
        return toolListService.selectedTool;
      },
      function () {
        angular.copy(toolListService.selectedTool, vm.selectedTool);
        vm.isToolSelected = !(_.isEmpty(vm.selectedTool));
      }
    );
  }
})();
