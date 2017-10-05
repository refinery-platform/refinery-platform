(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileParamsService', userFileParamsService);

  userFileParamsService.$inject = [
    'userFileFiltersService',
    'userFileSortsService'
  ];

  function userFileParamsService (
      userFileFiltersService,
      userFileSortsService
  ) {
    var characterSuffix = '_Characteristics_generic_s';
    var factorSuffix = '_Factor_Value_generic_s';
    var params = {
      limit: 100, // Default is 100,000. Immutability make it hard in python.
      fq: function () {
        var filters = Object.keys(userFileFiltersService).map(function (key) {
          var values = userFileFiltersService[key];
          // TODO: escaping!
          var orValues = values.map(function (value) {
            return '(' +
                key + characterSuffix + ':"' + value + '" OR ' +
                key + factorSuffix + ':"' + value + '")';
          }).join(' OR ');
          return '(' + orValues + ')';
        });
        return filters.join(' AND ');
      },
      sort: function () {
        return userFileSortsService.fields.map(function (field) {
          var name = field.name;
          var direction = field.direction;
          return [
            name + characterSuffix + ' ' + direction,
            name + factorSuffix + ' ' + direction].join(', ');
        }).join(', ');
      }
    };
    return params;
  }
})();
