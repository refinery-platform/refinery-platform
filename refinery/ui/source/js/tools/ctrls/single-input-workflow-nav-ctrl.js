(function () {
  'use strict';

  angular
    .module('refineryTools')
    .controller('SingleInputWorkflowNavCtrl', SingleInputWorkflowNavCtrl);

  SingleInputWorkflowNavCtrl.$inject = ['$scope'];


  function SingleInputWorkflowNavCtrl ($scope) {
    var vm = this;
    vm.tool = {};

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
