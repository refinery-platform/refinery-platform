'use strict';

function permissionService (sharingService) {
  var vm = this;
  vm.permissions = {};

  /**
   * Load permissions for this dataset.
   *
   * @method  getPermissions
   * @author  Fritz Lekschas
   * @date    2015-08-21
   *
   * @param   {String}  uuid   UUID of the exact model entity.
   * @return  {Object}         Angular promise.
   * */
  vm.getPermissions = function (uuid) {
    return sharingService.get({
      model: 'data_sets',
      uuid: uuid
    }).$promise
      .then(function (data) {
        var groups = [];
        for (var i = 0, len = data.share_list.length; i < len; i++) {
          groups.push({
            id: data.share_list[i].group_id,
            name: data.share_list[i].group_name,
            uuid: data.share_list[i].group_uuid,
            permission: vm.getPermissionLevel(data.share_list[i].perms)
          });
        }
        vm.permissions = {
          isOwner: data.is_owner,
          groups: groups
        };
      });
  };

    /**
   * Turns permission object into a simple string.
   *
   * @method  getPermissions
   * @author  Fritz Lekschas
   * @date    2015-08-21
   *
   * @param   {Object}  perms  Object of the precise permissions.
   * @return  {String}         Permission's name.
   */
  vm.getPermissionLevel = function (perms) {
    if (perms.read_meta === false) {
      return 'none';
    }
    if (perms.change === true) {
      return 'edit';
    }
    if (perms.read === true) {
      return 'read';
    }
    return 'read_meta';
  };
}

angular.module('refineryDashboard')
  .service('permissionService', [
    'sharingService',
    permissionService
  ]
);
