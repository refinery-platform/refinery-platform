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
    '$scope',
    '$uibModal',
    '$window',
    'DataSetSearchApi',
    'dataSetService'
  ];

  function DataSetsCardCtrl (
    $log,
    $scope,
    $uibModal,
    $window,
    DataSetSearchApi,
    dataSetService
  ) {
    var vm = this;
    vm.dataSetsAll = [];
    vm.dataSets = [];
    vm.dataSetsError = false;
    vm.filterDataSets = filterDataSets;
    vm.openDataSetDeleteModal = openDataSetDeleteModal;
    vm.getDataSets = getDataSets;
    vm.searchDataSets = searchDataSets;
    vm.searchQueryDataSets = '';
    vm.resetDataSetSearch = resetDataSetSearch;
    vm.groupFilter = {};
    var params = {};

    activate();

    function filterDataSets (permsID) {
      if (permsID === 'public') {
        params.public = vm.groupFilter.public ? 'True' : 'False';
      } else if (permsID === 'owned') {
        params.owned = vm.groupFilter.owned ? 'True' : 'False';
      } else if (!permsID) {
        delete params.group;
        vm.groupFilter.group = 0;
      } else {
        params.group = permsID;
        vm.groupFilter.group = permsID;
      }
      getDataSets();
    }

    function activate () {
      vm.getDataSets();
    }

    function getDataSets () {
      console.log(params);
      dataSetService.query(params).$promise.then(function (response) {
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
      var datasetDeleteDialogUrl = $window.getStaticUrl(
        'partials/dashboard/partials/dataset-delete-dialog.html'
      );
      var modalInstance = $uibModal.open({
        backdrop: 'static',
        keyboard: false,
        templateUrl: datasetDeleteDialogUrl,
        controller: 'DataSetDeleteCtrl as modal',
        resolve: {
          config: function () {
            return {
              model: 'data_sets',
              uuid: dataSet.uuid
            };
          },
          // Refactor data set deletion into it's own component (shared) It
          // should not be responsible for updating another view's cache [JM]
          dataSet: dataSet,
          dataSets: function () { return {}; },
          analyses: function () { return {}; },
          analysesReloadService: function () { return {}; },
        }
      });

      modalInstance.result.then(function () {
        // user confirmed deletion
        getDataSets();
      });
    }
   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.dashboardParentCtrl.groups;
        },
        function () {
          console.log(vm.dashboardParentCtrl.groups);
          vm.groups = vm.dashboardParentCtrl.groups;
        }
      );
    };
  }
})();
