/**
 * Collaboration Card Ctrl
 * @namespace CollaborationCardCtrl
 * @desc Controller for events card component on dashboard component.
 * @memberOf refineryApp.CollaborationCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('CollaborationCardCtrl', CollaborationCardCtrl);

  CollaborationCardCtrl.$inject = [
    '$uibModal',
    'groupMemberService'
  ];

  function CollaborationCardCtrl (
    $uibModal,
    groupMemberService
  ) {
    var vm = this;
    vm.userGroups = [];
    vm.openGroupAdd = openGroupAdd;
    vm.openGroupEditor = openGroupEditor;
    vm.openGroupMemberAdd = openGroupMemberAdd;
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

    function openGroupAdd () {
      $uibModal.open({
        component: 'rpGroupAddModal'
      });
    }

    function openGroupEditor (group, member) {
      var modalInstance = $uibModal.open({
        component: 'rpGroupEditModal',
        resolve: {
          config: function () {
            return {
              group: group,
              activeMember: member
            };
          }
        }
      });

      modalInstance.result.then(function (response) {
        console.log(response);
        console.log('positive');
        getGroups();
      }, function (error) {
        console.log(error);
        console.log('error');
      });
    }

    function openGroupMemberEditor (member, totalMembers, group) {
      $uibModal.open({
        component: 'rpGroupMemberEditModal',
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

    function openGroupMemberAdd (group) {
      $uibModal.open({
        component: 'rpGroupMemberAddModal',
        resolve: {
          config: function () {
            return {
              group: group
            };
          }
        }
      });
    }
  }
})();
