(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupCtrl', InputGroupCtrl);

  InputGroupCtrl.$inject = [
    '$scope',
    'fileRelationshipService',
    'selectedNodesService'
  ];


  function InputGroupCtrl (
    $scope,
    fileRelationshipService,
    selectedNodesService
  ) {
    var vm = this;
    vm.attributes = fileRelationshipService.attributesObj;
    vm.currentFileInput = [];
    vm.isNavCollapsed = false;
    vm.tool = {}; // selected tool displayed in panel
    vm.toolType = ''; // workflow vs visualization


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
          if (vm.tool.toolType === 'Workflow') {
            vm.toolType = vm.tool.toolType;
          }
        }
      );

      $scope.$watchCollection(
        function () {
          return selectedNodesService.selectedNodes;
        },
        function () {
          vm.currentFileInput = selectedNodesService.selectedNodes;
        }
      );
    };
  }
})();
