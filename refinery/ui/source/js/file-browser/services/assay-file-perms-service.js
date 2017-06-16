/**
 * Assay File Perms Service
 * @namespace assayFilePermsService
 * @desc Service used to check if user has edit permission
 * @memberOf refineryFileBrowser
 */
(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .factory('groupPermService', groupPermService);

  groupPermService.$inject = ['$window', 'sharingService'];

  function groupPermService ($window, sharingService) {
    var canUsersGroupEdit = false;
    var service = {
      canUsersGroupEdit: canUsersGroupEdit,
      refreshUsersGroupEdit: refreshUsersGroupEdit
    };

    return service;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */

    /**
     * @name canUsersGroupEdit
     * @desc  Checks if the user has edit permission based on group
     * @memberOf refineryFileBrowser.assayFilePermsService
    **/
    function refreshUsersGroupEdit () {
      var params = {
        uuid: $window.dataSetUuid,
        model: 'data_sets'
      };
      var dataSetRequest = sharingService.query(params);
      dataSetRequest.$promise.then(function (response) {
        var allGroups = response.share_list;
        for (var i = 0; i < allGroups.length; i++) {
          if (allGroups[i].perms.write) {
            canUsersGroupEdit = true;
            break;
          }
        }
      });
      return dataSetRequest.$promise;
    }
  }
})();
