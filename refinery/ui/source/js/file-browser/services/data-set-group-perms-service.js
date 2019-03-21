(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('dataSetGroupPermsService', dataSetGroupPermsService);

  dataSetGroupPermsService.$inject = ['groupService'];

  function dataSetGroupPermsService (groupService) {
    var vm = this;
    vm.dataSetSharing = {};
    vm.groupList = [];
    vm.owner = '';
    vm.ownerName = '';
    vm.getDataSetGroupPerms = getDataSetGroupPerms;
    vm.userPerms = 'none';

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function getDataSetGroupPerms (dataSetUuid) {
      var params = {
        dataSetUuid: dataSetUuid
      };
      var dataSetRequest = groupService.query(params);
      dataSetRequest.$promise.then(function (response) {
        angular.copy(response, vm.groupList);
      });
      return dataSetRequest.$promise;
    }
  }
})();
