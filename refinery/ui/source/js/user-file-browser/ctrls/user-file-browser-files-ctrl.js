(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$log',
    '$q',
    'userFileBrowserFactory',
    'gridOptionsService'
  ];

  function UserFileBrowserFilesCtrl ($log, $q, userFileBrowserFactory, gridOptionsService) {
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
    };

    gridOptionsService.appScopeProvider = vm;
    vm.gridOptions = gridOptionsService;
    vm.gridOptions.onRegisterApi = function (api) {
      console.log('register!', api);
      api.core.on.sortChanged(null, vm.sortChanged);
    };
  }
})();

