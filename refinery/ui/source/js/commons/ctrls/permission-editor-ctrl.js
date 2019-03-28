/**
 * Permission Editor Ctrl
 * @namespace PermissionEditorCtrl
 * @desc Main controller for the permission modal component.
 * @memberOf refineryApp
 */

(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('PermissionEditorCtrl', PermissionEditorCtrl);

  PermissionEditorCtrl.$inject = [
    '$log',
    '_',
    'groupService',
    'permissionService'
  ];

  function PermissionEditorCtrl (
    $log,
    _,
    groupService,
    permissionService
  ) {
    var vm = this;
    vm.close = close;
    vm.permissions = permissionService.permissions;
    // Used as a shorthand to avoid complicated permission checking in `ngRepeat`
    vm.permissionLevel = {
      none: {
        read_meta: false,
        read: false,
        change: false
      },
      read_meta: {
        read_meta: true,
        read: false,
        change: false
      },
      read: {
        read_meta: true,
        read: true,
        change: false
      },
      edit: {
        read_meta: true,
        read: true,
        change: true
      }
    };
    vm.updatePerms = updatePerms;

   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
    /**
     * @name close
     * @desc  Closes modal
     * @memberOf RefinaryApp.PermissionEditorCtrl
     * @param {int} depth - group nav index
    **/
    function close () {
      permissionService.getPermissions(vm.resolve.config.uuid);
      vm.modalInstance.dismiss('close');
    }

    /**
     * @name updatePerms
     * @desc  Patches a group's permission for a particular data set
     * @memberOf  RefinaryApp.PermissionEditorCtrl
     * @param {obj} group - view's group object, expect permissionLevel to be a
     * string (edit, read, read_meta)
    **/
    function updatePerms (group) {
      groupService
        .partial_update({
          dataSetUuid: vm.resolve.config.uuid,
          uuid: group.uuid,
          perm_list: vm.permissionLevel[group.permission]
        })
        .$promise
        .then(function (response) {
          $log.info(response);
        }, function (error) {
          permissionService.getPermissions(vm.resolve.config.uuid);
          $log.error(error);
        });
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      if (!_.isEmpty(vm.resolve) && vm.resolve.config.uuid) {
        permissionService.getPermissions(vm.resolve.config.uuid).then(function () {
          vm.permissions = permissionService.permissions;
        });
      }
    };
  }
})();
