(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  UserFileBrowserFiltersCtrl.$inject = [
    '$q',
    'userFileBrowserFactory'
  ];

  function UserFileBrowserFiltersCtrl ($q, userFileBrowserFactory) {
    var vm = this;
    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      console.log(solr);
      vm.attributeFilters = userFileBrowserFactory.createFilters(solr);
      promise.resolve();
    }, function () {
      promise.reject();
    });
  }
})();

