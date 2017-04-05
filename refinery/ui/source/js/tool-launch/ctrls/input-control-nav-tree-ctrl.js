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
    vm.groups = [];
    vm.groupIndex = 0;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.removeGroup = removeGroup;
    vm.removeAllGroups = removeAllGroups;
    vm.attributes = {};
    vm.getFileMap = getFileMap;
    vm.counter = 0;
    vm.currentPosition = [];
    vm.getFileMap();
  /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */

    function getFileMap () {
      if (vm.counter === 0) {
        vm.currentPosition = fileRelationshipService.refreshFileMap();
        console.log(vm.currentPosition);
      }
    }

    function navLeft (depth) {
      console.log(depth);
      vm.currentPosition[depth]--;
      console.log(vm.currentPosition);
    }

    function navRight (depth) {
      console.log(depth);
      vm.currentPosition[depth]++;
      console.log(vm.currentPosition);
    }

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
            vm.groupIndex = vm.groups.length - 1;
          }
        }
      );
    };
  }
})();
