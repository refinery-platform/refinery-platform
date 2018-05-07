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
    'groupExtendedService',
    'groupMemberService',
    'settings'
  ];

  function GroupEditModalCtrl (
    groupExtendedService,
    groupMemberService,
    settings
  ) {
    var vm = this;
    vm.alertType = 'info';
    vm.close = close;
    vm.deleteGroup = deleteGroup;
    vm.group = vm.resolve.config.group;
    vm.leaveGroup = leaveGroup;
    vm.responseMessage = '';
    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name close
     * @desc  View method to close modals, expects modalInstance in scope
     * @memberOf refineryApp.GroupEditModalCtrl.
    **/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }

    /**
     * @name deleteGroup
     * @desc  View method to delete a group.
     * @memberOf refineryApp.GroupEditModalCtrl
    **/
    function deleteGroup () {
      groupExtendedService.delete({
        uuid: vm.resolve.config.group.uuid
      }).$promise.then(function () {
        vm.alertType = 'success';
        vm.modalInstance.close(vm.alertType);
      }, function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Group could not be deleted.';
      });
    }

    /**
     * @name leaveGroup
     * @desc  View method for a group member to leave
     * @memberOf refineryApp.GroupEditModalCtrl
     * @param {int} depth - group nav index
    **/
    function leaveGroup () {
      groupMemberService.remove({
        uuid: vm.resolve.config.group.uuid,
        userId: settings.djangoApp.userId
      }).$promise.then(function () {
        vm.alertType = 'success';
        vm.modalInstance.close(vm.alertType);
      }, function () {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error leaving group. If last member, delete group.';
      });
    }
  }
})();
