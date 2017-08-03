(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  // TODO: userFileBrowserFiltersCtrl.filters is what I need, but maybe I need a new service?
  userFileService.$inject = [
    '$resource',
    'settings',
    'userFileFiltersService',
    'userFileSortsService'
  ];

  function userFileService (
      $resource,
      settings,
      userFileFiltersService,
      userFileSortsService
  ) {
    var characterSuffix = '_Characteristics_generic_s';
    var factorSuffix = '_Factor_Value_generic_s';
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/user/files/',
      {},
      {
        query: {
          method: 'GET',
          params: {
            limit: 1000, // Default is 100,000. Immutability make it hard in python.
            fq: function () {
              var operation = ' OR ';
              var filters = Object.keys(userFileFiltersService).map(function (key) {
                var values = userFileFiltersService[key];
                // TODO: escaping!
                return values.map(function (value) {
                  return '(' +
                      key + characterSuffix + ':"' + value + '" OR ' +
                      key + factorSuffix + ':"' + value + '")';
                }).join(operation);
              });
              // TODO: Repeated fq params may be more efficient, but not a big deal
              return filters.join(operation);
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
          }
        }
      }
    );
    return userFile;
  }
})();
