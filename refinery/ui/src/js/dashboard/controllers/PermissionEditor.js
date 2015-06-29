function PermissionEditorCtrl ($http, $modalInstance, _, sharingService, config) {
  var that = this;

  this._ = _;
  this.config = config;
  this.$modalInstance = $modalInstance;
  this.sharingService = sharingService;

  this.getPermissions(
    this.config.model,
    this.config.uuid
  ).then(function (data) {
    that.permissions = data;
  }).catch(function (error) {
    console.error(error);
  });

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
    },
  };
}

/**
 * Cancel permission editing.
 * @type  {function}
 */
PermissionEditorCtrl.prototype.cancel = function () {
  this.$modalInstance.dismiss('cancel');
};

/**
 * [getPermissions description]
 * @type   {function}
 * @param  {string}   model Model which permissions are to be edited.
 * @param  {string}   uuid  UUID of the exact model entity.
 * @return {object}         Angular promise.
 */
PermissionEditorCtrl.prototype.getPermissions = function (model, uuid) {
  var that = this,
      permissions;

  permissions = this.sharingService.get({
    model: model,
    uuid: uuid
  });

  return permissions
    .$promise
    .then(function (data) {
      groups = [];
      for (var i = 0, len = data.share_list.length; i < len; i++) {
        groups.push({
          id: data.share_list[i].group_id,
          name: data.share_list[i].group_name,
          permission: that.getPermissionLevel(data.share_list[i].perms)
        });
      }
      return {
        isOwner: data.is_owner,
        groups: groups
      };
    })
    .catch(function (error) {
      return error;
    });
};

/**
 * Turns permission object into a simple string.
 * @type   {function}
 * @param  {object} perms Object of the precise permissions.
 * @return {string}       Permission's name.
 */
PermissionEditorCtrl.prototype.getPermissionLevel = function (perms) {
  if (perms.read === false) {
    return 'none';
  }
  if (perms.change === true) {
    return 'edit';
  }
  return 'read';
};

/**
 * Save permissions
 * @type   {function}
 */
PermissionEditorCtrl.prototype.save = function () {
  var that = this,
      accessList = [];

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
      'share_list': accessList
    })
    .$promise
      .then(function () {
        console.log('Sweet permissions are saved');
        that.$modalInstance.dismiss('saved');
      })
      .catch(function (error) {
        console.error(error);
      })
      .finally(function () {
        that.isSaving = false;
      });
};

angular
  .module('refineryDashboard')
  .controller('PermissionEditorCtrl', [
    '$http',
    '$modalInstance',
    '_',
    'sharingService',
    'config',
    PermissionEditorCtrl
  ]);
