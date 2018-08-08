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
    '_',
    'primaryGroupService'
  ];

  function PrimaryGroupButtonCtrl (
    $scope,
    _,
    primaryGroupService
  ) {
    var vm = this;
    vm.filterDataSet = filterDataSet;
    vm.primaryGroup = primaryGroupService.primaryGroup;
    vm.primaryGroupButton = { selected: false };
    vm.updatePrimaryGroup = updatePrimaryGroup;

    activate();

    function activate () {
      if (!_.isEmpty(vm.primaryGroup)) {
        filterDataSet();
      }
    }

    /**
     * @name filterDataSet
     * @desc  View method which toggles the button and updates the group filter
     * @memberOf refineryDashboard.PrimaryGroupButtonCtrl
    **/
    function filterDataSet () {
      if (vm.primaryGroupButton.selected) {
        vm.primaryGroupButton.selected = false;
        vm.filterCtrl.filterDataSets();
        vm.filterCtrl.groupFilter.selectedName = 'All';
      } else {
        vm.primaryGroupButton.selected = true;
        vm.filterCtrl.filterDataSets(vm.primaryGroup.id);
        vm.filterCtrl.groupFilter.selectedName = vm.primaryGroup.name;
      }
    }

    /**
     * @name updatePrimaryGroup
     * @desc  View method which updates the primary group
     * @memberOf refineryDashboard.PrimaryGroupButtonCtrl
     * @param {obj} group - contains group name and id
    **/
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
      // populates button menu to select primary group
      $scope.$watchCollection(
        function () {
          return vm.filterCtrl.groups;
        },
        function () {
          vm.groups = vm.filterCtrl.groups;
        }
      );

      // syncs group filter with primary button filter
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
