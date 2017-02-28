(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupNavCtrl', InputGroupNavCtrl);

  InputGroupNavCtrl.$inject = ['$scope'];


  function InputGroupNavCtrl ($scope) {
    var vm = this;
    vm.tool = {};
    vm.toolType = '';
    vm.isNavCollapsed = false;

    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.displayCtrl.selectedTool;
        },
        function () {
          angular.copy(vm.displayCtrl.selectedTool, vm.tool);
          console.log('in input group nav ctrl');
          console.log(vm.tool);
          if (vm.tool.toolType === 'Workflow') {
            vm.toolType = 'singleInputWorkflow';
          }
        }
      );
    };
  }
})();
