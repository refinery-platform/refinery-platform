(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .service('permissionService', permissionService);

  permissionService.$inject = ['groupService'];

  function permissionService (groupService) {
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
      return groupService.query({
        data_set_uuid: uuid,
        all_perms: 'True'
      }).$promise
        .then(function (data) {
          var groups = [];
          for (var i = 0, len = data.length; i < len; i++) {
            groups.push({
              id: data[i].id,
              name: data[i].name,
              uuid: data[i].uuid,
              permission: vm.getPermissionLevel(data[i].perm_list)
            });
          }
          vm.permissions = {
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
      if (perms.change === true) {
        return 'edit';
      }
      if (perms.read === true) {
        return 'read';
      }
      if (perms.read_meta === true) {
        return 'read_meta';
      }
      return 'none';
    };
  }
})();
