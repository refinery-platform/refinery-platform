/**
 * Group Member Edit Modal Ctrl
 * @namespace Group Member Edit Modal Ctrl
 * @desc Component controller for the group member edit modal
 * @memberOf refineryApp
 */

(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('GroupMemberEditModalCtrl', GroupMemberEditModalCtrl);

  GroupMemberEditModalCtrl.$inject = [
    '$timeout',
    'groupService'
  ];

  function GroupMemberEditModalCtrl (
    $timeout,
    groupService
  ) {
    var vm = this;
    vm.alertType = 'info';
    vm.close = close;
    vm.demote = demote;
    vm.isLoading = false;
    vm.member = vm.resolve.config.activeMember;
    vm.promote = promote;
    vm.remove = remove;
    vm.responseMessage = '';
    // Total number of members in the active group
    vm.totalMembers = vm.resolve.config.totalMembers;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
     /**
     * @name close
     * @desc  View method to close modals
     * @memberOf refineryApp.GroupMemberEditModalCtrl. Expects modalInstance inscope
      ***/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }

     /**
     * @name demote
     * @desc  View method for demoted a member from manager
     * @memberOf refineryApp.GroupMemberEditModalCtrl
    **/
    function demote () {
      vm.isLoading = true;
      groupService.partial_update({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        user_id: vm.member.id
      }).$promise.then(
        function () {
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully demoted member ' + vm.member.username;
          $timeout(function () {
            vm.isLoading = false;
            vm.modalInstance.close(vm.alertType);
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, could not demote member ' +
          vm.member.username + '. Last member and manager can not leave.';
        vm.isLoading = false;
      });
    }

     /**
     * @name promote
     * @desc  View method for promoting a member to manager
     * @memberOf refineryApp.GroupMemberEditModalCtrl
    **/
    function promote () {
      vm.isLoading = true;
      groupService.partial_update({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        user_id: vm.member.id
      }).$promise.then(
        function () {
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully promoted member ' + vm.member.username + '.';
          vm.isLoading = false;
          $timeout(function () {
            vm.modalInstance.close(vm.alerType);
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error Could not promote member ' + vm.member.username + '.';
        vm.isLoading = false;
      });
    }

     /**
     * @name remove
     * @desc  View method for removing a member from group
     * @memberOf refineryApp.GroupMemberEditModalCtrl
    **/
    function remove () {
      vm.isLoading = true;
      groupService.partial_update({
        uuid: vm.resolve.config.activeGroup.uuid,
        user_id: vm.member.id
      }).$promise.then(
        function () {
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully removed member ' + vm.member.username + '.';
          vm.isLoading = false;
          $timeout(function () {
            vm.modalInstance.close(vm.alertType);
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, could not remove member '
          + vm.member.username + '. Last member and manager can not leave.';
        vm.isLoading = false;
      });
    }
  }
})();
