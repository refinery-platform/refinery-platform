(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputControlCtrl', InputControlCtrl);

  InputControlCtrl.$inject = [
    '$scope',
    'fileRelationshipService'
  ];


  function InputControlCtrl (
    $scope,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.attributes = fileService.attributesObj;
    vm.currentGroup = fileService.currentGroup; // maintains nav
    // position
    vm.currentTypes = fileService.currentTypes;
    vm.groups = []; // stores all the selected nodes for vm
    vm.inputFileTypes = fileService.inputFileTypes;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.tool = {};
   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    function navLeft (depth) {
      vm.currentGroup[depth]--;
    }

    function navRight (depth) {
      vm.currentGroup[depth]++;
    }
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
          vm.currentGroup = fileService.currentGroup;
          vm.currentTypes = fileService.currentTypes;
          vm.inputFileTypes = fileService.inputFileTypes;
        }
      );
    };
  }
})();
