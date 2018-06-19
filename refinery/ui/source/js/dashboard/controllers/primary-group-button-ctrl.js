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
    'settings',
    'userProfileV2Service'
  ];

  function PrimaryGroupButtonCtrl (
    $scope,
    settings,
    userProfileV2Service
  ) {
    var vm = this;
    vm.filterDataSet = filterDataSet;
    vm.primaryGroup = settings.djangoApp.userprofilePrimaryGroup;
    vm.primaryGroupID = settings.djangoApp.userprofilePrimaryGroupID;
    vm.primaryGroupButton = { selected: false };
    vm.setPrimaryGroup = setPrimaryGroup;

    function filterDataSet () {
      // toggle
      if (vm.primaryGroupButton.selected) {
        vm.filterCtrl.filterDataSets();
        vm.filterCtrl.groupFilter.selectedName = 'All';
        vm.primaryGroupButton.selected = false;
      } else {
        vm.filterCtrl.filterDataSets(vm.primaryGroupID);
        vm.filterCtrl.groupFilter.selectedName = vm.primaryGroup;
        vm.primaryGroupButton.selected = true;
      }
    }

    function setPrimaryGroup (group) {
      console.log('set primary group');
      userProfileV2Service.patch({ primary_group: group.id }).then(function () {
        vm.primaryGroupID = group.id;
        vm.primaryGroup = group.name;
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
          console.log(vm.primaryGroupID);
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
