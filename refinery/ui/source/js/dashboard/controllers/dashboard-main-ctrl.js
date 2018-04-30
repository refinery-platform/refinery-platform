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

  function DashboardMainCtrl (humanize, _, groupInviteService, groupMemberService) {
    var vm = this;
    vm.groups = [];
    vm.groupInvites = {};
    vm.getGroups = getGroups;

    activate();

    function activate () {
      getGroups();
    }

    // list of groups a user is a member of
    function getGroups () {
      groupMemberService.query().$promise.then(function (response) {
        vm.groups = response.objects;
        _.each(response.objects, function (group) {
          addInviteList(group.id);
        });
      });
    }

    function addInviteList (groupID) {
      groupInviteService.query({
        group_id: groupID
      }).$promise.then(function (data) {
        if (data.objects.length) {
          vm.groupInvites[groupID] = data.objects;
        }
      });
    }
    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
