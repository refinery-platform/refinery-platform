'use strict';

function PermissionEditorCtrl (
  $log,
  _,
  sharingService,
  dashboardDataSetsReloadService,
  permissionService
) {
  this.$log = $log;
  this._ = _;
  this.config = this.resolve.config;
  this.permissions = permissionService.permissions;
  this.sharingService = sharingService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
  this.permissionService = permissionService;

  // Used as a shorthand to avoid complicated permission checking in `ngRepeat`
  this.permissionLevel = {
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
}

/**
 * Cancel permission editing.
 * @type  {function}
 */
PermissionEditorCtrl.prototype.cancel = function () {
  this.permissionService.getPermissions(this.config.uuid);
  this.modalInstance.dismiss('cancel');
};

/**
 * Save permissions
 * @type   {function}
 */
PermissionEditorCtrl.prototype.save = function () {
  var that = this;
  var accessList = [];

  this.isSaving = true;

  for (var i = 0, len = this.permissions.groups.length; i < len; i++) {
    accessList.push(this._.assign({
      id: this.permissions.groups[i].id
    }, this.permissionLevel[this.permissions.groups[i].permission]));
  }

  this
    .sharingService
    .update({
      model: this.config.model,
      uuid: this.config.uuid
    }, {
      share_list: accessList
    })
    .$promise
    .then(function () {
      that.dashboardDataSetsReloadService.reload(true);
      that.modalInstance.dismiss('saved');
    }, function (error) {
      this.permissionService.getPermissions(that._currentUuid);
      that.$log.error(error);
    }, function () {
      that.isSaving = false;
    });
};

angular
  .module('refineryApp')
  .controller('PermissionEditorCtrl', [
    '$log',
    '_',
    'sharingService',
    'dashboardDataSetsReloadService',
    'permissionService',
    PermissionEditorCtrl
  ]);
