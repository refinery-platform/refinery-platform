(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolDisplayCtrl', ToolDisplayCtrl);

  ToolDisplayCtrl.$inject = ['$scope', '_', 'toolsService'];

  function ToolDisplayCtrl ($scope, _, toolsService) {
    var vm = this;
    vm.toolList = [
      { name: 'Workflow 1' },
      { name: 'Workflow 2' },
      { name: 'Visualization 1' }
    ];
    vm.updateTool = updateTool;
    vm.selectedTool = {};
    vm.isToolSelected = false;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    function updateTool (tool) {
      console.log(vm.selectedTool.select);
      angular.copy(tool, vm.selectedTool);
    }

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
