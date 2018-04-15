/**
 * Group Edit Modal Ctrl
 * @namespace Group Edit Modal Ctrl
 * @desc Main controller for the group edit modal
 * @memberOf refineryApp
 */

(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('GroupMemberEditModalCtrl', GroupMemberEditModalCtrl);

  GroupMemberEditModalCtrl.$inject = [
    '$timeout',
    'groupDataService',
    'groupMemberService'
  ];


  function GroupMemberEditModalCtrl (
    $timeout,
    groupDataService,
    groupMemberService
  ) {
    var vm = this;
    vm.close = close;
    vm.demote = demote;
    vm.promote = promote;
    vm.remove = remove;

    vm.alertType = 'info';
    vm.responseMessage = '';
    vm.member = vm.resolve.config.activeMember;
    // Total number of members in the active group
    vm.totalMembers = vm.resolve.config.totalMembers;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */

    function close () {
      vm.modalInstance.dismiss();
    }

    function demote () {
      console.log('in demote');
      console.log(vm.resolve.config.activeGroup.manager_group_uuid);
      groupMemberService.remove({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        userId: vm.member.user_id
      }).$promise.then(
        function () {
          groupDataService.update();
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully demoted member ' + vm.member.username;
          $timeout(function () {
            vm.modalInstance.dismiss();
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, could not demote member ' +
          vm.member.username + '. Last member and manager can not leave';
      });
    }

    function promote () {
      groupMemberService.add({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        user_id: vm.member.user_id
      }).$promise.then(
        function () {
          groupDataService.update();
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully promoted member ' + vm.member.username;
          $timeout(function () {
            vm.modalInstance.dismiss();
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error Could not promote member ' + vm.member.username;
      });
    }

    function remove () {
      groupMemberService.remove({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        userId: vm.member.user_id
      }).$promise.then(
        function () {
          groupDataService.update();
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully removed member' + vm.member.username;
          $timeout(function () {
            vm.modalInstance.dismiss();
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, could not remove member'
          + vm.member.username + '. Last member and manager can not leave';
      });
    }
  }
})();
