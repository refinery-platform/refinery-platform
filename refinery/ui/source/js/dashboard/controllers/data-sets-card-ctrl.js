/**
 * Data Sets Card Ctrl
 * @namespace DataSetsCardCtrl
 * @desc Controller for data sets card component on dashboard component.
 * Child component of dashboard component
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
    'dataSetV2Service'
  ];

  function DataSetsCardCtrl (
    $log,
    $scope,
    $uibModal,
    $window,
    DataSetSearchApi,
    dataSetV2Service
  ) {
    var vm = this;
    vm.dataSets = [];
    vm.dataSetsError = false;
    vm.filterDataSets = filterDataSets;
    vm.getDataSets = getDataSets;
    vm.groupFilter = { selectedName: 'All' };
    vm.isFiltersEmpty = isFiltersEmpty;
    vm.loadingDataSets = true;
    vm.openDataSetDeleteModal = openDataSetDeleteModal;
    vm.openDataSetTransferModal = openDataSetTransferModal;
    vm.openPermissionEditor = openPermissionEditor;
    vm.params = {};
    vm.resetDataSetSearch = resetDataSetSearch;
    vm.searchDataSets = searchDataSets;
    vm.searchQueryDataSets = '';

    activate();

    function activate () {
      vm.getDataSets();
    }

    /**
     * @name filterDataSets
     * @desc  View method used to update the params with group and own perms
     * @memberOf refineryDashboard.DataSetsCardCtrl
     * @param {string} permsID - string with the perms name or ID
    **/
    function filterDataSets (permsID) {
      if (permsID === 'public') {
        if (vm.groupFilter.public) {
          vm.params.public = 'True';
        } else {
          delete vm.params.public; // public false is unused
        }
      } else if (permsID === 'owned') {
        if (vm.groupFilter.owned) {
          vm.params.is_owner = 'True';
        } else {
          delete vm.params.is_owner; // owned false is unused
        }
      } else if (!permsID) {
        delete vm.params.group;
      } else {
        vm.params.group = permsID;
      }
      getDataSets();
    }

    /**
     * @name getDataSets
     * @desc  View method for updating the data set list
     * @memberOf refineryDashboard.DataSetsCardCtrl
    **/
    function getDataSets () {
      vm.loadingDataSets = true;
      dataSetV2Service.query(vm.params).$promise.then(function (response) {
        vm.searchQueryDataSets = '';
        vm.loadingDataSets = false;
        vm.dataSets = response;
        vm.dataSetsError = false;
      }, function (error) {
        vm.loadingDataSets = false;
        $log.error(error);
        vm.dataSetsError = true;
      });
    }

    /**
     * @name openDataSetDeleteModal
     * @desc  Opens deletion modal
     * @memberOf refineryDashboard.DataSetsCardCtrl
     * @param {obj} dataSet - data set object
    **/
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
          analysesReloadService: function () { return {}; }
        }
      });

      modalInstance.result.then(function () {
        // user confirmed deletion
        getDataSets();
      });
    }

     /**
     * @name openDataSetTransferModal
     * @desc  Opens data set tranfer modal
     * @memberOf refineryDashboard.DataSetsCardCtrl
     * @param {str} dataSetUuid - data set uuid
    **/
    function openDataSetTransferModal (dataSet) {
      console.log('openDataSettransfer');
      console.log(dataSet);
      var modalInstance = $uibModal.open({
        component: 'rpDataSetTransferModal',
        resolve: {
          config: function () {
            return {
              uuid: dataSet.uuid,
              title: dataSet.title
            };
          }
        }
      });

      modalInstance.result.then(function () {
        getDataSets();
      });
    }

    /**
     * @name openPermissionEditor
     * @desc  Opens sharing modal (common component)
     * @memberOf refineryDashboard.DataSetsCardCtrl
     * @param {string} dataSetUuid - data set object uuid
    **/
    /** view method to open the permissions modal component, in commons
     *  directive*/
    function openPermissionEditor (dataSetUuid) {
      var modalInstance = $uibModal.open({
        component: 'rpPermissionEditorModal',
        resolve: {
          config: function () {
            return {
              model: 'data_sets',
              uuid: dataSetUuid
            };
          }
        }
      });

      modalInstance.result.then(function () {
        getDataSets();
      });
    }

    /**
     * @name resetDataSetSearch
     * @desc  View method to reset data search query
     * @memberOf refineryDashboard.DataSetsCardCtrl
    **/
    function resetDataSetSearch () {
      vm.searchQueryDataSets = '';
      vm.getDataSets();
    }

    /**
     * @name searchDataSets
     * @desc  View method to search and update data sets
     * @memberOf refineryDashboard.DataSetsCardCtrl
     * @param {string} query - user entered query for data set search
    **/
    function searchDataSets (query) {
      // reset perm filter until we can search & check perms
      vm.groupFilter = { selectedName: 'All' };
      if (query && query.length > 1) {
        vm.loadingDataSets = true;
        var apiRequest = new DataSetSearchApi(query);
        apiRequest(200).then(function (response) {
          vm.dataSets = response.data;
          vm.loadingDataSets = false;
          vm.dataSetsError = false;
        }, function (error) {
          $log.error(error);
          vm.dataSetsError = true;
          vm.loadingDataSets = false;
        });
      }
    }

    // helper function to deal with search vs perms filtering
    function isFiltersEmpty () {
      if (vm.groupFilter.selectedName !== 'All' ||
        vm.groupFilter.public || vm.groupFilter.owned) {
        return false;
      }
      return true;
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
          vm.groups = vm.dashboardParentCtrl.groups;
        }
      );
    };
  }
})();
