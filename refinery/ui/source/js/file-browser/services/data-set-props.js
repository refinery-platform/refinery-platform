(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('dataSetPropsService', dataSetPropsService);

  dataSetPropsService.$inject = ['$window', 'dataSetV2Service'];

  function dataSetPropsService ($window, dataSetV2Service) {
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
      var dataSet = dataSetV2Service.query(params);
      dataSet.$promise.then(function (response) {
        angular.copy(response.data, vm.dataSet);
      });
      return dataSet.$promise;
    }
  }
})();
