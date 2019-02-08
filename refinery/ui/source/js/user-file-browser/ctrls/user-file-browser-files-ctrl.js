/**
 * User File Browser Files Ctrl
 * @namespace UserFileBrowserFilesCtrl
 * @desc Main controller for user files data.
 * @memberOf refineryApp.refineryUserFileBrowser
 */
(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$httpParamSerializer',
    '$location',
    '$log',
    '$q',
    '$scope',
    '$window',
    '_',
    'userFileBrowserFactory',
    'userFileFiltersService',
    'userFileParamsService',
    'userFileSortsService',
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl (
      $httpParamSerializer,
      $location,
      $log,
      $q,
      $scope,
      $window,
      _,
      userFileBrowserFactory,
      userFileFiltersService,
      userFileParamsService,
      userFileSortsService,
      gridOptionsService
  ) {
    gridOptionsService.appScopeProvider = vm;
    var promise = $q.defer();
    var vm = this;
    vm.downloadCsv = downloadCsv;
    vm.downloadCsvQuery = downloadCsvQuery;
    vm.refreshUserFiles = refreshUserFiles;
    vm.gridOptions = gridOptionsService;
    vm.nodesCount = userFileBrowserFactory.dataSetNodes.nodesCount;
    vm.sortChanged = sortChanged;
    vm.totalNodesCount = userFileBrowserFactory.dataSetNodes.totalNodesCount;

    activate();

   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    function activate () {
      refreshUserFiles();
    }
    // helper method to cull out attributes with no fields
    function cullEmptyAttributes (facetCountObj) {
      _.each(facetCountObj, function (counts, facetName) {
        if (!counts.length) {
          delete facetCountObj[facetName];
        }
      });

      return _.keys(facetCountObj).concat('date_submitted', 'sample_name', 'name');
    }

    /**
     * @name downloadCsv
     * @desc  VM method used to interact with the `/files_download`
     * endpoint to get a .csv
     * @memberOf UserFileBrowserFilesCtrl
    **/
    function downloadCsv () {
      $window.location.href = '/files_download?' + downloadCsvQuery();
    }

    /**
     * @name downloadCsvQuery
     * @desc  VM method used to construct the query parameters to be sent
     * to the `/files_download` endpoint
     * @memberOf UserFileBrowserFilesCtrl
    **/
    function downloadCsvQuery () {
      return $httpParamSerializer({
        filter_attribute: userFileFiltersService,
        sort: userFileParamsService.sort(),
        limit: 100000000
      });
    }

    vm.gridOptions.onRegisterApi = function (api) {
      api.core.on.sortChanged(null, vm.sortChanged);
    };

    /**
     * @name refreshUserFiles
     * @desc  Uses service to update the data in grid
     * @memberOf refineryUserFileBrowser.refreshUserFiles
    **/
    function refreshUserFiles () {
      userFileBrowserFactory.getUserFiles().then(function (solr) {
        gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs(
          cullEmptyAttributes(solr.facet_field_counts)
        );
        userFileBrowserFactory.dataSetNodes.nodesCount = solr.nodes.length;
        userFileBrowserFactory.dataSetNodes.totalNodesCount = solr.nodes_count;

        gridOptionsService.data = userFileBrowserFactory.createData(solr.nodes);
        promise.resolve();
      }, function () {
        $log.error('/files/ request failed');
        promise.reject();
      });
    }

    function sortChanged (grid, sortColumns) {
      var sortUrlParam = 'sort';
      var directionUrlParam = 'direction';
      if (typeof sortColumns !== 'undefined' && sortColumns.length > 0) {
        // NOTE: With the current config, you can only sort on one column
        var column = sortColumns[0];
        // If a hash is used with $location.search, it clears all params
        $location.search(sortUrlParam, column.field);
        $location.search(directionUrlParam, column.sort.direction);
        userFileSortsService.fields[0] = {
          name: column.field,
          direction: column.sort.direction
        };

        refreshUserFiles.getUserFiles().then(function (solr) {
          gridOptionsService.data = userFileBrowserFactory.createData(solr.nodes);
          userFileBrowserFactory.dataSetNodes.nodesCount = solr.nodes.length;
          userFileBrowserFactory.dataSetNodes.totalNodesCount = solr.nodes_count;
          promise.resolve();
        }, function () {
          $log.error('/files/ request failed');
          promise.reject();
        });
      } else {
        $location.search(sortUrlParam, null);
        $location.search(directionUrlParam, null);
      }
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    $scope.$watchCollection(
      function () {
        return userFileBrowserFactory.dataSetNodes;
      },
      function () {
        vm.nodesCount = userFileBrowserFactory.dataSetNodes.nodesCount;
        vm.totalNodesCount = userFileBrowserFactory.dataSetNodes.totalNodesCount;
      }
    );
  }
})();

