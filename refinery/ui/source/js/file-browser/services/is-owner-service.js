(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('isOwnerService', isOwnerService);

  isOwnerService.$inject = ['$window', 'dataSetService'];

  function isOwnerService ($window, dataSetService) {
    var vm = this;
    vm.isOwner = false;
    vm.refreshDataSetOwner = refreshDataSetOwner;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function refreshDataSetOwner () {
      var params = { uuid: $window.dataSetUuid };
      var dataSet = dataSetService.query(params);
      dataSet.$promise.then(function (response) {
        vm.isOwner = response.objects[0].is_owner;
      });
      return dataSet.$promise;
    }
  }
})();
