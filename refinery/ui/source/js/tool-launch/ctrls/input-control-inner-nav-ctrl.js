/**
 * Input Control Inner Nav Ctrl
 * @namespace InputControlInnerNavCtrl
 * @desc Controller for the inner group's navigation.
 * @memberOf refineryApp.refineryToolLaunch
 */
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
    /**
     * @name needMoreNodes
     * @desc View method  uses a service to check if the group has minimum nodes
     * @memberOf refineryToolLaunch.InputControlInnerNavCtrl
    **/
    function needMoreNodes () {
      return toolLaunchService.checkNeedMoreNodes();
    }
    /**
     * @name navLeft
     * @desc  Updates the current group when user navigates the inner group
     * @memberOf refineryToolLaunch.InputControlInnerNavCtrl
     * @param {int} depth - group nav index
    **/
    //  View method to decrease the inner group
    function navLeft (depth) {
      fileService.currentGroup[depth]--;
      vm.currentGroup = fileService.currentGroup;
    }
    /**
     * @name navRight
     * @desc  Updates the current group when user navigates the inner group
     * @memberOf refineryToolLaunch.InputControlInnerNavCtrl
     * @param {int} depth - group nav index
    **/
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
