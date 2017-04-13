(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolDisplayCtrl', ToolDisplayCtrl);

  ToolDisplayCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
    'toolsService'];

  function ToolDisplayCtrl (
    $scope,
    _,
    fileRelationshipService,
    toolsService
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
        return toolsService.selectedTool;
      },
      function () {
        angular.copy(toolsService.selectedTool, vm.selectedTool);
        vm.isToolSelected = !(_.isEmpty(vm.selectedTool));
        if (vm.isToolSelected) {
          fileRelationshipService.resetCurrents();
          fileRelationshipService.refreshFileMap();
        }
      }
    );
  }
})();
