(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputControlGroupsCtrl', InputControlGroupsCtrl);

  InputControlGroupsCtrl.$inject = [
    '$scope',
    'fileRelationshipService',
    'resetGridService',
    'selectedNodesService'
  ];


  function InputControlGroupsCtrl (
    $scope,
    fileRelationshipService,
    resetGridService,
    selectedNodesService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = selectedNodesService;
    var vm = this;
    vm.attributes = fileService.attributesObj;
    vm.currentGroup = fileService.currentGroup; // maintains nav
    // position
    vm.currentTypes = fileService.currentTypes;
    vm.inputFileTypes = fileService.inputFileTypes;
    vm.groups = []; // stores all the selected nodes for vm
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.removeAllGroups = removeAllGroups;
    vm.removeGroup = removeGroup; // Refreshes all selection
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

    // PROBABLY SHOULD move 'remove groups' to input group ctrl
    function removeGroup (groupInd) {
      vm.groups[groupInd].isSelected = false;
      nodeService.setSelectedNodes(vm.groups[groupInd]);
    }

    function removeAllGroups () {
      nodeService.setSelectedAllFlags(false);
      resetGridService.setRefreshGridFlag(true);
    }

    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      // copies all selected nodes to the generic group
      $scope.$watchCollection(
        function () {
          return nodeService.selectedNodes;
        },
        function () {
          vm.groups = nodeService.selectedNodes;
        }
      );

      $scope.$watchCollection(
        function () {
          return vm.inputCtrl.tool;
        },
        function () {
          vm.currentTypes = fileService.currentTypes;
          vm.inputFileTypes = fileService.inputFileTypes;
        }
      );
    };
  }
})();
