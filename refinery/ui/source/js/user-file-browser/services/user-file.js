(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  // TODO: userFileBrowserFiltersCtrl.filters is what I need, but maybe I need a new service?
  userFileService.$inject = ['$resource', 'settings', 'userFileFiltersService'];

  function userFileService ($resource, settings, userFileFiltersService) {
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/user/files/',
      {},
      {
        query: {
          method: 'GET',
          params: {
            limit: 100, // Default is 100,000. Immutability make it hard in python.
            fq: function () {
              var filters = Object.keys(userFileFiltersService).map(function (key) {
                var values = userFileFiltersService[key];
                // TODO: escaping!
                return values.map(function (value) {
                  return '(' + key + '_Characteristics_generic_s:"' + value + '"' +
                  ' OR ' + key + '_Factor_Value_s:"' + value + '")';
                }).join(' AND ');
              });
              // TODO: Repeated fq params may be more efficient, but not a big deal
              return filters.join(' AND ');
            }
          }
        }
      }
    );
    return userFile;
  }
})();
