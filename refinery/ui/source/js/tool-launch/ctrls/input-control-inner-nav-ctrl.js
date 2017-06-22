(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputControlInnerNavCtrl', InputControlInnerNavCtrl);

  InputControlInnerNavCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
    'toolLaunchService'
  ];


  function InputControlInnerNavCtrl (
    $scope,
    _,
    fileRelationshipService,
    toolLaunchService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.currentGroup = fileService.currentGroup; // maintains nav position
    vm.currentTypes = fileService.currentTypes;
    vm.inputFileTypes = fileService.inputFileTypes;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.needMoreNodes = needMoreNodes;
   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */

    // View method to check if the group has minimum nodes
    function needMoreNodes () {
      return toolLaunchService.checkNeedMoreNodes();
    }

    //  View method to decrease the inner group
    function navLeft (depth) {
      fileService.currentGroup[depth]--;
      vm.currentGroup = fileService.currentGroup;
    }

    // View method to increase the inner group
    function navRight (depth) {
      fileService.currentGroup[depth]++;
      vm.currentGroup = fileService.currentGroup;
    }

    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return fileService.currentGroup;
        },
        function () {
          vm.currentGroup = fileService.currentGroup;
          vm.currentTypes = fileService.currentTypes;

          vm.inputFileTypes = fileService.inputFileTypes;
        }
      );
    };
  }
})();
