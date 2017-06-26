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
    vm.currentGroup = fileService.currentGroup; // maintains nav position
    vm.currentTypes = fileService.currentTypes;
    vm.depthNames = fileService.depthNames;
    vm.inputFileTypes = fileService.inputFileTypes;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
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
          vm.currentGroup = fileService.currentGroup;
          vm.currentTypes = fileService.currentTypes;
          vm.depthNames = fileService.depthNames;

          vm.inputFileTypes = fileService.inputFileTypes;
        }
      );
    };
  }
})();
