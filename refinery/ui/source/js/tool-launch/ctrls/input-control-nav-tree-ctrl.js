(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputControlNavTreeCtrl', InputControlNavTreeCtrl);

  InputControlNavTreeCtrl.$inject = [
    '$scope',
    'fileBrowserFactory',
    'resetGridService',
    'selectedNodesService',
    'fileRelationshipService'
  ];


  function InputControlNavTreeCtrl (
    $scope,
    fileBrowserFactory,
    resetGridService,
    selectedNodesService,
    fileRelationshipService
  ) {
    var vm = this;
    vm.attributes = {};
    vm.currentPosition = fileRelationshipService.currentPosition; // maintains nav position
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
      vm.currentPosition[depth]--;
    }

    function navRight (depth) {
      vm.currentPosition[depth]++;
    }

    // PROBABLY SHOULD move 'remove groups' to input group ctrl
    function removeGroup (groupInd) {
      vm.groups[groupInd].isSelected = false;
      selectedNodesService.setSelectedNodes(vm.groups[groupInd]);
    }

    function removeAllGroups () {
      selectedNodesService.setSelectedAllFlags(false);
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
          return selectedNodesService.selectedNodes;
        },
        function () {
          vm.groups = selectedNodesService.selectedNodes;
          if (vm.groups.length > 0) {
            var attributesArray = vm.groups[0].grid.appScope.assayAttributes;
            for (var ind = 0; ind < attributesArray.length; ind ++) {
              vm.attributes[attributesArray[ind].display_name] = attributesArray[ind].internal_name;
            }
          }
        }
      );
    };
  }
})();
