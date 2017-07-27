(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$log',
    '$q',
    'uiGridConstants',
    'userFileBrowserFactory',
    'userFileSortsService',
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl (
      $log,
      $q,
      uiGridConstants,
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
      console.log('sort', sortColumns);
      // TODO: This is copy-and-paste from file-browser
      if (typeof sortColumns !== 'undefined' &&
        typeof sortColumns[0] !== 'undefined' &&
        typeof sortColumns[0].sort !== 'undefined') {
        var name = sortColumns[0].name;
        // TODO: need to handle multiple sorts; also in original file-browser.
        switch (sortColumns[0].sort.direction) {
          case uiGridConstants.ASC:
            console.log(name, 'asc');
            userFileSortsService[name] = 'asc';
            // paramService.fileParam.sort = sortColumns[0].field + ' asc';
            break;
          case uiGridConstants.DESC:
            console.log(name, 'desc');
            userFileSortsService[name] = 'desc';
            // paramService.fileParam.sort = sortColumns[0].field + ' desc';
            break;
          default:
            break;
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
    vm.gridOptions = gridOptionsService;
    vm.gridOptions.onRegisterApi = function (api) {
      console.log('register!', api);
      api.core.on.sortChanged(null, vm.sortChanged);
    };
  }
})();

