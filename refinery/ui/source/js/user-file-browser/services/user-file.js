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
            fq: function () {
              var filters = Object.keys(userFileFiltersService).map(function (key) {
                var value = userFileFiltersService[key];
                // TODO: escaping!
                return '(' + key + '_Characteristics_generic_s:' + value +
                       ' OR ' + key + '__Factor_Value_s:' + value + ')';
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
