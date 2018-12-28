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
    var vm = this;
    vm.nodesCount = userFileBrowserFactory.dataSetNodes.nodesCount;
    vm.totalNodesCount = userFileBrowserFactory.dataSetNodes.totalNodesCount;
    vm.downloadCsv = downloadCsv;
    vm.downloadCsvQuery = downloadCsvQuery;

    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
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

    // helper method to cull out attributes with no fields
    function cullEmptyAttributes (facetCountObj) {
      _.each(facetCountObj, function (counts, facetName) {
        if (!counts.length) {
          delete facetCountObj[facetName];
        }
      });

      return _.keys(facetCountObj).concat('date_submitted', 'sample_name', 'name');
    }

    vm.sortChanged = function (grid, sortColumns) {
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

        // TODO: This is copy-and-paste
        getUserFiles().then(function (solr) {
          // TODO: Should there be something that wraps up this "then"? It is repeated.
          // gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs();
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
    };

    gridOptionsService.appScopeProvider = vm;

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

    vm.gridOptions = gridOptionsService;
    vm.gridOptions.onRegisterApi = function (api) {
      api.core.on.sortChanged(null, vm.sortChanged);
    };

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

