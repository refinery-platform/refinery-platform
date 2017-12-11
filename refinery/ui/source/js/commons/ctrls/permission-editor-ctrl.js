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
    'sharingService',
    'permissionService'
  ];

  function PermissionEditorCtrl (
    $log,
    _,
    sharingService,
    permissionService
  ) {
    var vm = this;
    vm.cancel = cancel;
    vm.permissions = permissionService.permissions;
    // Used as a shorthand to avoid complicated permission checking in `ngRepeat`
    vm.permissionLevel = {
      none: {
        read: false,
        read_meta: false,
        change: false
      },
      read_meta: {
        read: false,
        read_meta: true,
        change: false
      },
      read: {
        read: true,
        read_meta: true,
        change: false
      },
      edit: {
        read: true,
        read_meta: true,
        change: true
      }
    };
    vm.save = save;

    /**
     * Cancel permission editing.
     * @type  {function}
     */
    function cancel () {
      permissionService.getPermissions(vm.resolve.config.uuid);
      vm.modalInstance.dismiss('cancel');
    }

    /**
     * Save permissions
     * @type   {function}
     */
    function save () {
      var that = this;
      var accessList = [];

      this.isSaving = true;

      for (var i = 0, len = vm.permissions.groups.length; i < len; i++) {
        accessList.push(_.assign({
          id: vm.permissions.groups[i].id
        }, vm.permissionLevel[vm.permissions.groups[i].permission]));
      }

      sharingService
        .update({
          model: vm.resolve.config.model,
          uuid: vm.resolve.config.uuid
        }, {
          share_list: accessList
        })
        .$promise
        .then(function () {
          vm.modalInstance.dismiss('saved');
        }, function (error) {
          permissionService.getPermissions(vm.resolve.config.uuid);
          $log.error(error);
        }, function () {
          that.isSaving = false;
        });
    }
  }
})();