(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$log',
    '$q',
    'userFileBrowserFactory',
    'userFileFiltersService',
    'userFileSortsService',
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl (
      $log,
      $q,
      userFileBrowserFactory,
      userFileFiltersService,
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
      $log.error('/files/ request failed');
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
          $log.error('/files/ request failed');
          promise.reject();
        });
      }
    };

    gridOptionsService.appScopeProvider = vm;
    vm.fileBrowserFilterQuery = function () {
      var params = {};
      Object.keys(userFileFiltersService).forEach(function (key) {
        // TODO: The set of filters on /files does not match the filters on /data_sets.
        // TODO: I don't know whether a given filter is under "Characteristics" or something else.
        // TODO: The target page doesn't load right now, even with the query,
        // TODO:     and switching between tabs loses the query.
        params[key + '_Characteristics_generic_s'] = userFileFiltersService[key];
      });
      return encodeURIComponent(JSON.stringify(params));
    };
    vm.gridOptions = gridOptionsService;
    vm.gridOptions.onRegisterApi = function (api) {
      api.core.on.sortChanged(null, vm.sortChanged);
    };
  }
})();

