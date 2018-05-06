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

  DashboardMainCtrl.$inject = ['humanize', '_', 'groupInviteService', 'groupMemberService'];

  function DashboardMainCtrl (
    humanize,
    _,
    groupInviteService,
    groupMemberService
  ) {
    var vm = this;
    vm.getGroups = getGroups;
    vm.groups = [];
    vm.groupInvites = {};
    activate();

    function activate () {
      getGroups();
    }

    /**
     * @name getGroups
     * @desc  VM method used by child components to display groups
     * @memberOf refineryDashboard.getGroups
    **/
    function getGroups () {
      var members = groupMemberService.query();
      members.$promise.then(function (response) {
        vm.groups = response.objects;
        _.each(response.objects, function (group) {
          addInviteList(group.id);
        });
      });
      return members.$promise;
    }
      /**
     * @name addInviteList
     * @desc  Private method used by groups to grab and append the invitee list
     * @memberOf refineryDashboard.addInviteList
    **/
    function addInviteList (groupID) {
      groupInviteService.query({
        group_id: groupID
      }).$promise.then(function (data) {
        if (data.objects.length) {
          vm.groupInvites[groupID] = data.objects;
        }
      });
    }
  }
})();
