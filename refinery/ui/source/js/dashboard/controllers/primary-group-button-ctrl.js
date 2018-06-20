/**
 * Primary Group Button Ctrl
 * @namespace PrimaryGroupButtonCtrl
 * @desc Controller for the primary group button component
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
    vm.primaryGroup = primaryGroupService.primaryGroup;
    vm.primaryGroupButton = { selected: false };
    vm.updatePrimaryGroup = updatePrimaryGroup;

    function filterDataSet () {
      // toggle
      if (vm.primaryGroupButton.selected) {
        vm.primaryGroupButton.selected = false;
        vm.filterCtrl.filterDataSets();
        vm.filterCtrl.groupFilter.selectedName = 'All';
      } else {
        vm.primaryGroupButton.selected = true;
        vm.filterCtrl.filterDataSets(vm.primaryGroup.name);
        vm.filterCtrl.groupFilter.selectedName = vm.primaryGroup.name;
      }
    }

    function updatePrimaryGroup (group) {
      primaryGroupService.setPrimaryGroup(group).then(function () {
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
          if (vm.primaryGroup.id && vm.filterCtrl.groupFilter
              .selectedName === vm.primaryGroup.name) {
            vm.primaryGroupButton.selected = true;
          } else {
            vm.primaryGroupButton.selected = false;
          }
        }
      );
    };
  }
})();
