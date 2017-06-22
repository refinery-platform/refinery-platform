(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  userFileService.$inject = ['$resource', 'settings'];

  function userFileService ($resource, settings) {
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/user/files/',
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
