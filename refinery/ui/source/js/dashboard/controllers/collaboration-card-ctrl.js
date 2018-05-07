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
    '$log',
    '$scope',
    '$uibModal',
    'groupInviteService',
  ];

  function CollaborationCardCtrl (
    $log,
    $scope,
    $uibModal,
    groupInviteService
  ) {
    var vm = this;
    vm.userGroups = [];
    vm.invitation = {};
    vm.openGroupAdd = openGroupAdd;
    vm.openGroupEditor = openGroupEditor;
    vm.openGroupMemberAdd = openGroupMemberAdd;
    vm.openGroupMemberEditor = openGroupMemberEditor;
    vm.resendInvitation = resendInvitation;
    vm.revokeInvitation = revokeInvitation;

    /**
     * @name openGroupAdd
     * @desc  VM method open modal to add a new group
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
    function openGroupAdd () {
      var modalInstance = $uibModal.open({
        component: 'rpGroupAddModal'
      });

      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

     /**
     * @name openGroupEditor
     * @desc  VM method open modal to edit a new group
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
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
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

     /**
     * @name openGroupMemberEditor
     * @desc  VM method open modal to edit members of a group
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
    function openGroupMemberEditor (member, totalMembers, group) {
      var modalInstance = $uibModal.open({
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
      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

    /**
     * @name openGroupMemberAdd
     * @desc  VM method open modal to add a member of a group
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
    function openGroupMemberAdd (group) {
      var modalInstance = $uibModal.open({
        component: 'rpGroupMemberAddModal',
        resolve: {
          config: function () {
            return {
              group: group
            };
          }
        }
      });
      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

     /**
     * @name resendInvitation
     * @desc  VM method to resend an email invite
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
    function resendInvitation (tokenUuid) {
      groupInviteService.resend({
        token: tokenUuid
      }).$promise.then(function () {
        vm.dashboardParentCtrl.getGroups();
      }).catch(function () {
        $log.error('Invitation sending failed');
      });
    }

    /**
     * @name revokeInvitation
     * @desc  VM method to cancel an user's invite to a group
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
    function revokeInvitation (tokenUuid) {
      groupInviteService.revoke({ token: tokenUuid }).$promise.then(function () {
        vm.dashboardParentCtrl.getGroups();
      }).catch(function () {
        $log.error('Invitation could not be revoked');
      });
    }
     /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.dashboardParentCtrl.groups;
        },
        function () {
          vm.userGroups = vm.dashboardParentCtrl.groups;
        }
      );

      $scope.$watchCollection(
        function () {
          return vm.dashboardParentCtrl.groupInvites;
        },
        function () {
          vm.invitations = vm.dashboardParentCtrl.groupInvites;
        }
      );
    };
  }
})();
