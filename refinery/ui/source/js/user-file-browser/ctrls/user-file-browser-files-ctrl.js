(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$log',
    '$q',
    'userFileBrowserFactory',
    'userFileSortsService',
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl (
      $log,
      $q,
      userFileBrowserFactory,
      userFileSortsService,
      gridOptionsService
  ) {
    var vm = this;
    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs();
      gridOptionsService.data = userFileBrowserFactory.createData(solr.nodes);
      promise.resolve();
    }, function () {
      $log.error('/user/files/ request failed');
      promise.reject();
    });

    vm.sortChanged = function (grid, sortColumns) {
      if (typeof sortColumns !== 'undefined') {
        for (var i = 0; i < sortColumns.length; i++) {
          var column = sortColumns[i];
          userFileSortsService.fields[i] = {
            name: column.field,
            direction: column.sort.direction
            // NOTE: UI Grid uiGridConstants.ASC and DESC happen to match
            // "asc" and "desc" for solr, but if that changed, this breaks.
            // NOTE: column.sort.priority seems to be redundant with array order,
            // but I don't think we have this guaranteed.
          };
        }

        // TODO: This is copy-and-paste
        getUserFiles().then(function (solr) {
          // TODO: Should there be something that wraps up this "then"? It is repeated.
          // gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs();
          gridOptionsService.data = userFileBrowserFactory.createData(solr.nodes);
          promise.resolve();
        }, function () {
          $log.error('/user/files/ request failed');
          promise.reject();
        });
      }
    };

    gridOptionsService.appScopeProvider = vm;
    vm.filterQuery = function () { return 'foo=bar'; };
    vm.gridOptions = gridOptionsService;
    vm.gridOptions.onRegisterApi = function (api) {
      api.core.on.sortChanged(null, vm.sortChanged);
    };
  }
})();

