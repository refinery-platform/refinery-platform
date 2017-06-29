(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  UserFileBrowserFiltersCtrl.$inject = [
    '$log',
    '$q',
    'userFileBrowserFactory',
    'userFileFiltersService'
  ];

  function UserFileBrowserFiltersCtrl ($log, $q, userFileBrowserFactory,
                                       userFileFiltersService) {
    var vm = this;

    vm.togglePanel = function (attribute) {
      vm.hidden[attribute] = ! vm.hidden[attribute];
    };

    vm.hidden = {};

    vm.filterUpdate = function (attribute, value) {
      console.log('attr/val:', attribute, value);
      if (typeof userFileFiltersService[attribute] === 'undefined') {
        userFileFiltersService[attribute] = []; // Init empty set
      }
      var index = userFileFiltersService[attribute].indexOf(value);
      if (index >= 0) {
        userFileFiltersService[attribute].splice(index, 1);
      } else {
        userFileFiltersService[attribute].push(value);
      }
      console.log('updated to:', userFileFiltersService);
    };

    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      vm.attributeFilters =
          userFileBrowserFactory.createFilters(solr.facet_field_counts);
      promise.resolve();
    }, function () {
      $log.error('/user/files/ request failed');
      promise.reject();
    });
  }
})();
