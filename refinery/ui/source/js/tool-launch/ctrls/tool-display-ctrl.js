(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolDisplayCtrl', ToolDisplayCtrl);

  ToolDisplayCtrl.$inject = ['$scope', 'toolsService'];

  function ToolDisplayCtrl ($scope, toolsService) {
    var vm = this;
    vm.toolList = [
      { name: 'Workflow 1' },
      { name: 'Workflow 2' },
      { name: 'Visualization 1' }
    ];
    vm.updateTool = updateTool;
    vm.selectedTool = {};

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
      }
    );
  }
})();
