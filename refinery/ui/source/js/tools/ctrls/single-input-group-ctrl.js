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

      $scope.$watchCollection(
        function () {
          return selectedNodesService.selectedNodes;
        },
        function () {
          vm.groups = selectedNodesService.selectedNodes;
          console.log('in the single input group ctrl');
          console.log(vm.groups);
          var attributesArray = vm.groups[0].grid.appScope.assayAttributes;
          console.log(attributesArray);
          for (var ind = 0; ind < attributesArray.length; ind ++) {
            vm.attributes[attributesArray[ind].display_name] = attributesArray[ind].internal_name;
          }
          console.log('here I am');
          console.log(vm.attributes);
        }
      );
    };
  }
})();
