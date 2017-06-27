(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  UserFileBrowserFiltersCtrl.$inject = [
    '$log',
    '$q',
    'userFileBrowserFactory'
  ];

  function UserFileBrowserFiltersCtrl ($log, $q, userFileBrowserFactory) {
    var vm = this;

    vm.togglePanel = function (attribute) {
      vm.hidden[attribute] = ! vm.hidden[attribute];
    };

    vm.hidden = {};

    vm.filters = {};

    vm.filterUpdate = function (attribute, value) {
      if (typeof vm.filters[attribute] === 'undefined') {
        vm.filters[attribute] = {};
      }
      vm.filters[attribute][value] = !vm.filters[attribute][value];
    };

    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      vm.attributeFilters =
          userFileBrowserFactory.createFilters(solr.attributes, solr.facet_field_counts);
      promise.resolve();
    }, function () {
      $log.error('/user/files/ request failed');
      promise.reject();
    });
  }
})();
