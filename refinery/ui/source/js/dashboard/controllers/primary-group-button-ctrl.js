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

  PrimaryGroupButtonCtrl.$inject = [];

  function PrimaryGroupButtonCtrl (
  ) {
    var vm = this;
    vm.filterDataSet = filterDataSet;
    vm.primaryGroup = { name: 'Bubba', id: '101' };
    vm.primaryGroupButton = { selected: false };
    activate();

    function activate () {
      console.log('get Group List or PG');
    }

    function filterDataSet () {
      // toggle
      if (vm.primaryGroupButton.selected) {
        vm.filterCtrl.filterDataSets();
        vm.primaryGroupButton.selected = false;
      } else {
        vm.filterCtrl.filterDataSets(vm.primaryGroup.id);
        vm.primaryGroupButton.selected = true;
      }
    }
  }
})();
