(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  UserFileBrowserFiltersCtrl.$inject = [
    '$location',
    '$log',
    '$q',
    'gridOptionsService',
    'userFileBrowserFactory',
    'userFileFiltersService'
  ];

  function UserFileBrowserFiltersCtrl ($location, $log, $q,
                                       gridOptionsService,
                                       userFileBrowserFactory,
                                       userFileFiltersService) {
    var vm = this;

    vm.togglePanel = function (attribute) {
      vm.foldedDown[attribute] = ! vm.foldedDown[attribute];
    };

    vm.foldedDown = {};
    vm.isDown = function (attribute, search) {
      var attributeObj = vm.attributeFilters[attribute];
      return vm.foldedDown[attribute] ||
          attributeObj.lowerCaseNames.includes(search.toLowerCase()) && search.length;
    };

    vm.filterUpdate = function (attribute, value) {
      if (typeof userFileFiltersService[attribute] === 'undefined') {
        userFileFiltersService[attribute] = []; // Init empty set
      }
      var set = userFileFiltersService[attribute];
      var index = set.indexOf(value);
      if (index >= 0) {
        // Remove from list
        set.splice(index, 1);
        // ... and delete list if empty.
        if (set.length === 0) {
          delete userFileFiltersService[attribute];
        }
      } else {
        // Add to list
        set.push(value);
      }

      $location.search(userFileFiltersService);

      getUserFiles().then(function (solr) {
        // TODO: Should there be something that wraps up this "then"? It is repeated.
        // gridOptionsService.columnDefs = userFileBrowserFactory.createColumnDefs();
        gridOptionsService.data = userFileBrowserFactory.createData(solr.nodes);
        promise.resolve();
      }, function () {
        $log.error('/files/ request failed');
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
      $log.error('/files/ request failed');
      promise.reject();
    });
  }
})();
