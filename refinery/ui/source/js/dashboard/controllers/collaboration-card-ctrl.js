/**
 * Collaboration Card Ctrl
 * @namespace CollaborationCardCtrl
 * @desc Controller for events card component on dashboard component.
 * @memberOf refineryApp.refineryEventsCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('CollaborationCardCtrl', CollaborationCardCtrl);

  CollaborationCardCtrl.$inject = [
    '$uibModal',
    'groupDataService',
    'groupMemberService'];

  function CollaborationCardCtrl (
    $uibModal,
    groupDataService,
    groupMemberService
  ) {
    var vm = this;
    vm.userGroups = [];
    vm.openGroupEditor = openGroupEditor;
    vm.openGroupMemberEditor = openGroupMemberEditor;
    activate();

    function activate () {
      getGroups();
    }

    // list of groups a user is a member of
    function getGroups () {
      groupMemberService.query().$promise.then(function (response) {
        vm.userGroups = response.objects;
      });
    }

    function openGroupEditor (group) {
      $uibModal.open({
        component: 'rpGroupEditModal',
        resolve: {
          config: function () {
            return {
              group: group
            };
          }
        }
      });
    }

    function openGroupMemberEditor (member, totalMembers, group) {
      $uibModal.open({
        component: 'rpGroupMembersEditModal',
        resolve: {
          config: function () {
            return {
              activeMember: member,
              activeGroup: group,
              totalMember: totalMembers
            };
          }
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
