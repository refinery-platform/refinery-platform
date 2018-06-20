/**
 * Primary Group Button Ctrl
 * @namespace PrimaryGroupButtonCtrl
 * @desc Controller for history card component on dashboard component.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('PrimaryGroupButtonCtrl', PrimaryGroupButtonCtrl);

  PrimaryGroupButtonCtrl.$inject = [
    '$scope',
    'primaryGroupService'
  ];

  function PrimaryGroupButtonCtrl (
    $scope,
    primaryGroupService
  ) {
    var vm = this;
    vm.filterDataSet = filterDataSet;
    console.log('in ctrl');
    console.log(primaryGroupService.primaryGroup);
    vm.primaryGroup = primaryGroupService.primaryGroup;
    vm.primaryGroupButton = { selected: false };
    vm.updatePrimaryGroup = updatePrimaryGroup;

    function filterDataSet () {
      // toggle
      if (vm.primaryGroupButton.selected) {
        vm.filterCtrl.filterDataSets();
        vm.filterCtrl.groupFilter.selectedName = 'All';
        vm.primaryGroupButton.selected = false;
      } else {
        vm.filterCtrl.filterDataSets(vm.primaryGroup.name);
        vm.filterCtrl.groupFilter.selectedName = vm.primaryGroup.name;
        vm.primaryGroupButton.selected = true;
      }
    }

    function updatePrimaryGroup (group) {
      console.log('entering function');
      console.log(group);
      primaryGroupService.setPrimaryGroup(group).then(function () {
        console.log('in the update');
        console.log(primaryGroupService.primaryGroup);
        vm.primaryGroup = primaryGroupService.primaryGroup;
      });
    }

  /* ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.filterCtrl.groups;
        },
        function () {
          vm.groups = vm.filterCtrl.groups;
        }
      );
      $scope.$watchCollection(
        function () {
          return vm.filterCtrl.groupFilter;
        },
        function () {
          if (vm.primaryGroupID && vm.filterCtrl.groupFilter.selectedName === vm.primaryGroup) {
            vm.primaryGroupButton.selected = true;
          } else {
            vm.primaryGroupButton.selected = false;
          }
        }
      );
    };
  }
})();
