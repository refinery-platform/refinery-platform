(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('dataSetPermsService', dataSetPermsService);

  dataSetPermsService.$inject = ['sharingService'];

  function dataSetPermsService (sharingService) {
    var vm = this;
    vm.dataSetSharing = {};
    vm.groupList = [];
    vm.owner = '';
    vm.ownerName = '';
    vm.getDataSetSharing = getDataSetSharing;
    vm.userPerms = 'none';

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    // helper method returns only groups associated with data set
    var filterDataSetGroups = function (allGroups) {
      var filteredGroupList = [];
      for (var i = 0; i < allGroups.length; i++) {
        if (allGroups[i].perms.read_meta || allGroups[i].perms.read || allGroups[i].perms.change) {
          filteredGroupList.push(allGroups[i]);
        }
      }
      return filteredGroupList;
    };

    function getDataSetSharing (dataSetUuid) {
      var params = {
        uuid: dataSetUuid,
        model: 'data_sets'
      };
      var dataSetRequest = sharingService.query(params);
      dataSetRequest.$promise.then(function (response) {
        angular.copy(response, vm.dataSetSharing);
        var filteredGroups = filterDataSetGroups(response.share_list);
        angular.copy(filteredGroups, vm.groupList);
        vm.userPerms = response.user_perms;
      });
      return dataSetRequest.$promise;
    }
  }
})();
