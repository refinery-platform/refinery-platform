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
    vm.isLoading = false;

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
      vm.modalInstance.close(vm.alertType);
    }

    function demote () {
      vm.isLoading = true;
      groupMemberService.remove({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        userId: vm.member.user_id
      }).$promise.then(
        function () {
          groupDataService.update();
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully demoted member ' + vm.member.username;
          vm.isLoading = false;
          $timeout(function () {
            vm.modalInstance.close(vm.alertType);
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, could not demote member ' +
          vm.member.username + '. Last member and manager can not leave';
        vm.isLoading = false;
      });
    }

    function promote () {
      vm.isLoading = true;
      groupMemberService.add({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        user_id: vm.member.user_id
      }).$promise.then(
        function () {
          groupDataService.update();
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully promoted member ' + vm.member.username;
          vm.isLoading = false;
          $timeout(function () {
            vm.modalInstance.close(vm.alerType);
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error Could not promote member ' + vm.member.username;
        vm.isLoading = false;
      });
    }

    function remove () {
      vm.isLoading = true;
      groupMemberService.remove({
        uuid: vm.resolve.config.activeGroup.manager_group_uuid,
        userId: vm.member.user_id
      }).$promise.then(
        function () {
          groupDataService.update();
          vm.alertType = 'success';
          vm.responseMessage = 'Successfully removed member' + vm.member.username;
          vm.isLoading = false;
          $timeout(function () {
            vm.modalInstance.close(vm.alertType);
          }, 1500);
        }
      ).catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, could not remove member'
          + vm.member.username + '. Last member and manager can not leave';
        vm.isLoading = false;
      });
    }
  }
})();
