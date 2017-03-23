(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolInfoDisplayCtrl', ToolInfoDisplayCtrl);

  ToolInfoDisplayCtrl.$inject = ['$scope'];


  function ToolInfoDisplayCtrl ($scope) {
    var vm = this;
    vm.tool = {};
    vm.isToolInfoCollapsed = false;


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
        }
      );
    };
  }
})();
