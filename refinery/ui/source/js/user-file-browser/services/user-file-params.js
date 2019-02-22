(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileParamsService', userFileParamsService);

  userFileParamsService.$inject = [
    '_',
    'selectedFilterService',
    'userFileFiltersService',
    'userFileSortsService'
  ];

  function userFileParamsService (
      _,
      selectedFilterService,
      userFileFiltersService,
      userFileSortsService
  ) {
    var characterSuffix = '_Characteristics_generic_s';

    var params = {
      limit: 100, // Default is 100,000. Immutability make it hard in python.
      filter_attribute: function () {
        return selectedFilterService.encodeAttributeFields(angular.copy(userFileFiltersService));
      },
      sort: function () {
        return userFileSortsService.fields.map(function (field) {
          var name = field.name;
          var direction = field.direction;
          if (name === 'name') {
            return name + ' ' + direction;
          }
          return name + characterSuffix + ' ' + direction;
        });
      }
    };
    return params;
  }
})();
