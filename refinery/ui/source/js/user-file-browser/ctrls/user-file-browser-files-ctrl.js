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
    '_',
    'userFileBrowserFactory',
    'userFileParamsService',
    'userFileSortsService',
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl (
      $httpParamSerializer,
      $location,
      $log,
      $q,
      _,
      userFileBrowserFactory,
      userFileParamsService,
      userFileSortsService,
      gridOptionsService
  ) {
    var vm = this;
    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs(
        cullEmptyAttributes(solr.facet_field_counts)
      );
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

      return _.keys(facetCountObj).concat('date_submitted', 'sample_name', 'filename');
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
    vm.downloadCsvQuery = function () {
      return $httpParamSerializer({
        fq: userFileParamsService.fq(),
        sort: userFileParamsService.sort()
      });
    };
    vm.downloadCsvPath = function () {
      return '/files_download?' + vm.downloadCsvQuery();
    };
    vm.downloadCsvUrl = function () {
      return $location.protocol() + '://'
          + $location.host() + ':' + $location.port()
          + vm.downloadCsvPath();
    };
    vm.gridOptions = gridOptionsService;
    vm.gridOptions.onRegisterApi = function (api) {
      api.core.on.sortChanged(null, vm.sortChanged);
    };
  }
})();

