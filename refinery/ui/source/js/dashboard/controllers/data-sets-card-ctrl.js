/**
 * Data Sets Card Ctrl
 * @namespace DataSetsCardCtrl
 * @desc Controller for data sets card component on dashboard component.
 * @memberOf refineryApp.refineryDataSetsCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('DataSetsCardCtrl', DataSetsCardCtrl);

  DataSetsCardCtrl.$inject = ['$log', 'dataSetService'];

  function DataSetsCardCtrl (
    $log,
    dataSetService
  ) {
    var vm = this;
    vm.getDataSets = getDataSets;
    vm.searchQueryDataSets = '';
    vm.resetDataSetSearch = resetDataSetSearch;
    vm.showNotifications = showNotifications;

    activate();

    function activate () {
      vm.getDataSets();
    }

    function getDataSets () {
      dataSetService.query().$promise.then(function (response) {
        vm.dataSets = response.objects;
      }, function (error) {
        $log.error(error);
      });
    }

    function showNotifications () {
      console.log('show notifications');
    }

    function resetDataSetSearch () {
      console.log('resetDataSetSearch');
    }


    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
