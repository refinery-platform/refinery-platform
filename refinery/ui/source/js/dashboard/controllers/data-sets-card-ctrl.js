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

  DataSetsCardCtrl.$inject = [
    '$log',
    '$uibModal',
    '$window',
    'DataSetSearchApi',
    'dataSetService'
  ];

  function DataSetsCardCtrl (
    $log,
    $uibModal,
    $window,
    DataSetSearchApi,
    dataSetService
  ) {
    var vm = this;
    vm.dataSetsAll = [];
    vm.dataSets = [];
    vm.dataSetsError = false;
    vm.openDataSetDeleteModal = openDataSetDeleteModal;
    vm.getDataSets = getDataSets;
    vm.searchDataSets = searchDataSets;
    vm.searchQueryDataSets = '';
    vm.resetDataSetSearch = resetDataSetSearch;

    activate();

    function activate () {
      vm.getDataSets();
    }

    function getDataSets () {
      dataSetService.query().$promise.then(function (response) {
        vm.dataSetsAll = response.objects;
        vm.dataSets = vm.dataSetsAll;
        vm.dataSetsError = false;
      }, function (error) {
        $log.error(error);
        vm.dataSetsError = true;
      });
    }

    function searchDataSets (query) {
      if (query && query.length > 1) {
        var apiRequest = new DataSetSearchApi(query);
        console.log(apiRequest);
        apiRequest().then(function (response) {
          vm.dataSets = response.data;
          vm.dataSetsError = false;
        }, function (error) {
          $log.error(error);
          vm.dataSetsError = true;
        });
      } else {
        vm.dataSets = vm.dataSetsAll;
      }
    }

    function resetDataSetSearch () {
      vm.searchQueryDataSets = '';
      vm.dataSets = vm.dataSetsAll;
    }

 /*
 * Open the deletion modal for a given Datset.
 * @method  openDataSetDeleteModal
 */
    function openDataSetDeleteModal (dataSet) {
      console.log('open data set modal');
      var datasetDeleteDialogUrl = $window.getStaticUrl(
        'partials/dashboard/partials/dataset-delete-dialog.html'
      );
      console.log(dataSet.uuid);
      console.log(vm.dataSets);

      console.log('where the error');
      $uibModal.open({
        backdrop: 'static',
        keyboard: false,
        templateUrl: datasetDeleteDialogUrl,
        controller: 'DataSetDeleteCtrl as modal',
        resolve: {
          config: function () {
            console.log('wheres the error');
            return {
              model: 'data_sets',
              uuid: dataSet.uuid
            };
          },
          dataSet: dataSet,
          dataSets: function () { return {}; },
          analyses: function () { return {}; },
          analysesReloadService: function () { return {}; },
        }
      });
    }


    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
