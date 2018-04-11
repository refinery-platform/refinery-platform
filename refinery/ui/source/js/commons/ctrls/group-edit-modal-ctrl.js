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
    .controller('GroupEditModalCtrl', GroupEditModalCtrl);

  GroupEditModalCtrl.$inject = [
    '$timeout',
    'groupExtendedService',
    'groupMemberService',
    'authService',
    'sessionService'
  ];


  function GroupEditModalCtrl (
    $timeout,
    groupExtendedService,
    groupMemberService,
    authService,
    sessionService
  ) {
    var vm = this;
    vm.alertType = '';
    vm.close = close;
    vm.group = vm.resolve.config.group;
    vm.responseMessage = '';
    vm.leaveGroup = leaveGroup;
    vm.deleteGroup = deleteGroup;
    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */

    function close () {
      vm.modalInstance.dismiss();
    }

    function leaveGroup () {
      authService.isAuthenticated().then(function (isAuthenticated) {
        if (isAuthenticated) {
          groupMemberService.remove({
            uuid: vm.resolve.config.group.uuid,
            userId: sessionService.get('userId')
          }).$promise.then(function () {
            vm.alertType = 'success';
            $timeout(function () {
              vm.modalInstance.dismiss();
            }, 1500);
          }, function () {
            vm.alertType = 'danger';
            vm.responseMessage = 'Error leaving group. If last member, delete group.';
          });
        } else {
          vm.alertType = 'danger';
          vm.responseMessage = 'Error, please log in.';
        }
      })
      .catch(function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, please try again.';
      });
    }

    function deleteGroup () {
      groupExtendedService.delete({
        uuid: vm.resolve.config.group.uuid
      }).$promise.then(function () {
        vm.alertType = 'success';
        $timeout(function () {
          vm.modalInstance.dismiss();
        }, 1500);
      }, function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Group could not be deleted.';
      });
    }
  }
    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
})();
