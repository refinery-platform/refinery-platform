(function () {
  'use strict';

  angular
    .module('refineryApp')
    .factory('openIdTokenService', openIdTokenService);

  openIdTokenService.$inject = ['$resource', 'settings'];

  function openIdTokenService ($resource, settings) {
    return $resource(
      settings.appRoot + settings.refineryApiV2 + '/openid_token/',
      {
        format: 'json'
      },
      {
        query: {
          method: 'POST',
          isArray: false
        }
      }
    );
  }
})();
