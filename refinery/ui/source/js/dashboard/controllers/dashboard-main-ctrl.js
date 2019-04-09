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

  DashboardMainCtrl.$inject = [
    'humanize',
    '_',
    'groupInviteService',
    'groupService',
    'settings'
  ];

  function DashboardMainCtrl (
    humanize,
    _,
    groupInviteService,
    groupService,
    settings
  ) {
    var vm = this;
    vm.getGroups = getGroups;
    vm.groups = [];
    vm.groupInvites = {};
    vm.refreshEvents = false;
    vm.isLoggedIn = settings.djangoApp.userId !== undefined;
    activate();

    function activate () {
      // avoid unneccessary api when user is not logged in
      if (vm.isLoggedIn) {
        getGroups();
      }
    }

    /**
     * @name getGroups
     * @desc  VM method used by child components to display groups
     * @memberOf refineryDashboard.DashboardMainCtrl
    **/
    function getGroups () {
      var members = groupService.query();
      members.$promise.then(function (response) {
        vm.groups = response;
        vm.groups.forEach(function (group) {
          if (group.name !== 'Public') {
            addInviteList(group.uuid);
          }
        });
      });
      return members.$promise;
    }
    /**
     * @name addInviteList
     * @desc  Private method used by groups to grab and append the invitee list
     * @memberOf refineryDashboard.DashboardMainCtrl
     * @param {int} groupID - group ID number
    **/
    function addInviteList (groupUuid) {
      groupInviteService.query({
        group_uuid: groupUuid
      }).$promise.then(function (data) {
        if (!_.has(vm.groupInvites, 'groupUuid')) {
          vm.groupInvites[groupUuid] = [];
        }
        angular.copy(data, vm.groupInvites[groupUuid]);
      });
    }
  }
})();
