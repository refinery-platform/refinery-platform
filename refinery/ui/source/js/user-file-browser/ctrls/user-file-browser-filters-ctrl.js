(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  UserFileBrowserFiltersCtrl.$inject = [
    '$log',
    '$q',
    'gridOptionsService',
    'userFileBrowserFactory',
    'userFileFiltersService'
  ];

  function UserFileBrowserFiltersCtrl ($log, $q,
                                       gridOptionsService,
                                       userFileBrowserFactory,
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

      getUserFiles().then(function (solr) {
        // TODO: Should there be something that wraps up this "then"? It is repeated.
        // gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs();
        gridOptionsService.data = userFileBrowserFactory.createData(solr.nodes);
        promise.resolve();
      }, function () {
        $log.error('/user/files/ request failed');
        promise.reject();
      });
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
