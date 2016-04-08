'use strict';

function PermissionEditorCtrl (
  $log,
  $uibModalInstance,
  _,
  sharingService,
  dashboardDataSetsReloadService,
  config,
  permissions
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.permissions = permissions;
  this.$uibModalInstance = $uibModalInstance;
  this.sharingService = sharingService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;

  // Used as a shorthand to avoid complicated permission checking in `ngRepeat`
  this.permissionLevel = {
    none: {
      read: false,
      change: false
    },
    read: {
      read: true,
      change: false
    },
    edit: {
      read: true,
      change: true
    }
  };
}

/**
 * Cancel permission editing.
 * @type  {function}
 */
PermissionEditorCtrl.prototype.cancel = function () {
  this.$uibModalInstance.dismiss('cancel');
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
      that.$uibModalInstance.dismiss('saved');
    })
    .catch(function (error) {
      that.$log.error(error);
    })
    .finally(function () {
      that.isSaving = false;
    });
};

angular
  .module('refineryDashboard')
  .controller('PermissionEditorCtrl', [
    '$log',
    '$uibModalInstance',
    '_',
    'sharingService',
    'dashboardDataSetsReloadService',
    'config',
    'permissions',
    PermissionEditorCtrl
  ]);
