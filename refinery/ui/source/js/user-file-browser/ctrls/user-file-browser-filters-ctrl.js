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

    vm.filterIsSet = function (attribute, value) {
      var attr = userFileFiltersService[attribute];
      return angular.isObject(attr) && attr.indexOf(value) >= 0;
    };

    vm.filterUpdate = function (attribute, value) {
      var set = filterSet(attribute, value);
      $location.search(attribute, set);

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

    function filterSet (attribute, value) {
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
      return set;
    }

    angular.forEach($location.search(), function (values, key) {
      if (key === 'sort' || key === 'direction') {
        // TODO: sorts
      } else {
        if (typeof values === 'string') {
          filterSet(key, values);
        } else {
          angular.forEach(values, function (value) {
            filterSet(key, value);
          });
        }
      }
    });

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
