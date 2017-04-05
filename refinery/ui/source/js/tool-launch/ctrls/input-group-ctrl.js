(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupCtrl', InputGroupCtrl);

  InputGroupCtrl.$inject = ['$scope', 'selectedNodesService'];


  function InputGroupCtrl ($scope, selectedNodesService) {
    var vm = this;
    vm.tool = {}; // selected tool displayed in panel
    vm.toolType = ''; // workflow vs visualization
    vm.isNavCollapsed = false;
    vm.currentFileInput = [];
    vm.attributes = {};


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
          console.log('in the watcher');
          console.log(vm.currentFileInput);
          if (vm.currentFileInput.length > 0) {
            var attributesArray = vm.currentFileInput[0].grid.appScope.assayAttributes;
            for (var ind = 0; ind < attributesArray.length; ind ++) {
              vm.attributes[attributesArray[ind].display_name] = attributesArray[ind].internal_name;
            }
          }
        }
      );
    };
  }
})();
