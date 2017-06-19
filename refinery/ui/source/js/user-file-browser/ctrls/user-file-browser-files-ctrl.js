(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$q',
    'userFileBrowserFactory'
  ];

  function UserFileBrowserFilesCtrl ($q, userFileBrowserFactory) {
    var vm = this;
    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      vm.gridOptions.columnDefs = userFileBrowserFactory.createColumnDefs(solr.attributes);
      vm.gridOptions.data = userFileBrowserFactory.createData(solr.nodes);
      promise.resolve();
    }, function () {
      promise.reject();
    });

    vm.gridOptions = {
      appScopeProvider: vm,
      useExternalSorting: true,
      selectionRowHeaderWidth: 35,
      rowHeight: 35
    };
  }
})();

