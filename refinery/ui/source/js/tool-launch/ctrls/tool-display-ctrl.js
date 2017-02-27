(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolDisplayCtrl', ToolDisplayCtrl);

  ToolDisplayCtrl.$inject = ['$scope', '_', 'toolsService'];

  function ToolDisplayCtrl ($scope, _, toolsService) {
    var vm = this;
    vm.toolList = toolsService.toolList;
    vm.selectedTool = {};
    vm.isToolSelected = false;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */

    /*
    * ---------------------------------------------------------
    * Watchs
    * ---------------------------------------------------------
    */
    $scope.$watchCollection(
      function () {
        return toolsService.selectedTool;
      },
      function () {
        angular.copy(toolsService.selectedTool, vm.selectedTool);
        vm.isToolSelected = !(_.isEmpty(vm.selectedTool));
      }
    );
  }
})();
