(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  // TODO: userFileBrowserFiltersCtrl.filters is what I need, but maybe I need a new service?
  userFileService.$inject = [
    '$resource',
    'settings',
    'userFileParamsService'
  ];

  function userFileService (
      $resource,
      settings,
      userFileParamsService
  ) {
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/files/',
      {},
      {
        query: {
          method: 'GET',
          params: userFileParamsService
        }
      }
    );
    return userFile;
  }
})();
