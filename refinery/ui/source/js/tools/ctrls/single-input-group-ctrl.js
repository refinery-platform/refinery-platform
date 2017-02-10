(function () {
  'use strict';

  angular
    .module('refineryTools')
    .controller('SingleInputGroupNavCtrl', SingleInputGroupNavCtrl);

  SingleInputGroupNavCtrl.$inject = ['$scope', 'singleInputGroupService'];


  function SingleInputGroupNavCtrl ($scope, singleInputGroupService) {
    var vm = this;
    vm.groups = singleInputGroupService.inputGroups;
    vm.groupIndex = 0;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.removeGroup = removeGroup;
    vm.removeAllGroups = removeAllGroups;
    vm.service = singleInputGroupService;
    vm.tool = {};

  /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    function navLeft () {
      if (vm.groupIndex > 0) {
        vm.groupIndex--;
      }
    }

    function navRight () {
      if (vm.groupIndex < vm.groups.length) {
        vm.groupIndex++;
      }
    }

    function removeGroup () {
      console.log('remove group');
    }

    function removeAllGroups () {
      console.log('remove all groups');
    }

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
