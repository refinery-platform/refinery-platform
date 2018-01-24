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

      _.forEach(vm.permissions.groups, function (group) {
        accessList.push(_.assign({ id: group.id }, vm.permissionLevel[group.permission]));
      });

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
    vm.$onInit = function () {
      if (!_.isEmpty(vm.resolve) && vm.resolve.config.uuid) {
        permissionService.getPermissions(vm.resolve.config.uuid).then(function () {
          vm.permissions = permissionService.permissions;
        });
      }
    };
  }
})();
