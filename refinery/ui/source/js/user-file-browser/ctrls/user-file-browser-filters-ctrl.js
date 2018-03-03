(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  UserFileBrowserFiltersCtrl.$inject = [
    '$location',
    '$log',
    '$q',
    'settings',
    'gridOptionsService',
    'userFileBrowserFactory',
    'userFileFiltersService',
    'userFileSortsService'
  ];

  function UserFileBrowserFiltersCtrl (
    $location,
    $log,
    $q,
    settings,
    gridOptionsService,
    userFileBrowserFactory,
    userFileFiltersService,
    userFileSortsService
  ) {
    var vm = this;
    // sync the attribute filter order with grid column order
    vm.orderColumns = settings.djangoApp.userFilesColumns;
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
        vm.attributeFilters =
          userFileBrowserFactory.createFilters(solr.facet_field_counts);

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

    var sort;
    var direction;
    angular.forEach($location.search(), function (values, key) {
      if (key === 'sort') {
        sort = values;
      } else if (key === 'direction') {
        direction = values;
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
    if (angular.isString(sort) && angular.isString(direction)) {
      userFileSortsService.fields[0] = {
        name: sort,
        direction: direction
      };
    }

    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;

    getUserFiles().then(function (solr) {
      vm.attributeFilters = userFileBrowserFactory.createFilters(solr.facet_field_counts);
      promise.resolve();
    }, function () {
      $log.error('/files/ request failed');
      promise.reject();
    });
  }
})();
