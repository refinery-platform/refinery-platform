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
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl (
      $log,
      $q,
      uiGridConstants,
      userFileBrowserFactory,
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
        switch (sortColumns[0].sort.direction) {
          case uiGridConstants.ASC:
            console.log('sort asc');
            // paramService.fileParam.sort = sortColumns[0].field + ' asc';
            // vm.reset();
            break;
          case uiGridConstants.DESC:
            console.log('sort desc');
            // paramService.fileParam.sort = sortColumns[0].field + ' desc';
            // vm.reset();
            break;
          default:
            // vm.reset();
            break;
        }
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

