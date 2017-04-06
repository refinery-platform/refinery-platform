(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputControlCtrl', InputControlCtrl);

  InputControlCtrl.$inject = [
    '$scope'
  ];


  function InputControlCtrl (
    $scope
  ) {
    var vm = this;
    vm.tool = {};

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
