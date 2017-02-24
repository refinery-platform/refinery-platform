(function () {
  'use strict';

  angular
    .module('refineryTools')
    .controller('SingleInputGroupCtrl', SingleInputGroupCtrl);

  SingleInputGroupCtrl.$inject = [
    '$scope',
    'fileBrowserFactory',
    'singleInputGroupService',
    'selectedNodesService'
  ];


  function SingleInputGroupCtrl (
    $scope,
    fileBrowserFactory,
    singleInputGroupService,
    selectedNodesService
  ) {
    var vm = this;
    vm.singleInputSelected = false;
    vm.groups = [];
    vm.groupIndex = 0;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.removeGroup = removeGroup;
    vm.removeAllGroups = removeAllGroups;
    vm.service = singleInputGroupService;
    vm.tool = {};
    vm.attributes = {};

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

    function removeGroup (groupInd) {
      vm.groups[groupInd].isSelected = false;
      selectedNodesService.setSelectedNodes(vm.groups[groupInd]);
    }

    function removeAllGroups () {
      selectedNodesService.setSelectedAllFlags(false);
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

      $scope.$watchCollection(
        function () {
          return selectedNodesService.selectedNodes;
        },
        function () {
          vm.groups = selectedNodesService.selectedNodes;
          console.log(vm.groups);
          var attributesArray = vm.groups[0].grid.appScope.assayAttributes;
          for (var ind = 0; ind < attributesArray.length; ind ++) {
            vm.attributes[attributesArray[ind].display_name] = attributesArray[ind].internal_name;
          }
          vm.groupIndex = vm.groups.length - 1;
        }
      );
    };
  }
})();
