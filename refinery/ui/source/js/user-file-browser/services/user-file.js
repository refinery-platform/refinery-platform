(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  userFileService.$inject = ['$resource', 'settings'];

  function userFileService ($resource, settings) {
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 +
        '/user/files/?fq=technology_Characteristics_generic_s%3AChIP-seq',
        // TODO: Hardcoded to debug API
      {},
      {
        query: {
          method: 'GET'
        }
      }
    );
    return userFile;
  }
})();
