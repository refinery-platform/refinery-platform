(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupNavCtrl', InputGroupNavCtrl);

  InputGroupNavCtrl.$inject = ['$scope'];


  function InputGroupNavCtrl ($scope) {
    var vm = this;
    vm.tool = {};
    vm.isNavCollapsed = false;

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
