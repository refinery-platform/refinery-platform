(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('isOwnerService', isOwnerService);

  isOwnerService.$inject = ['$window', 'dataSetService'];

  function isOwnerService ($window, dataSetService) {
    var vm = this;
    vm.dataSet = {};
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
        vm.dataSet = response.objects[0];
      });
      return dataSet.$promise;
    }
  }
})();
