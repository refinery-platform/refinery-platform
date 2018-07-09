(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('dataSetPropsService', dataSetPropsService);

  dataSetPropsService.$inject = ['$window', 'dataSetService'];

  function dataSetPropsService ($window, dataSetService) {
    var vm = this;
    vm.dataSet = {};
    vm.refreshDataSet = refreshDataSet;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function refreshDataSet () {
      var params = { uuid: $window.dataSetUuid };
      var dataSet = dataSetService.query(params);
      dataSet.$promise.then(function (response) {
        vm.dataSet = response.objects[0];
      });
      return dataSet.$promise;
    }
  }
})();
