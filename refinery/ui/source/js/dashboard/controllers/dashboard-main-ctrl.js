/**
 * Dashboard Main Ctrl
 * @namespace DashboardMainCtrl
 * @desc Main controller for the main view, dashboard. Ctrl for parent component
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('DashboardMainCtrl', DashboardMainCtrl);

  DashboardMainCtrl.$inject = ['groupMemberService'];

  function DashboardMainCtrl (groupMemberService) {
    var vm = this;
    vm.getGroups = getGroups;

    activate();

    function activate () {
      getGroups();
      console.log('dashboard-main-ctrl');
    }

    // list of groups a user is a member of
    function getGroups () {
      console.log('calling get groups');
      groupMemberService.query().$promise.then(function (response) {
        vm.groups = response.objects;
      });
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
