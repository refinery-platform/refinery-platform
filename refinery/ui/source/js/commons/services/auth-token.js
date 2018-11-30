/**
 * Auth Token Service
 * @namespace authTokenService
 * @desc Service responsible for fetching a Django REST framework auth
 * token for a user
 * @memberOf refineryApp
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('authTokenService', authTokenService);

  authTokenService.$inject = ['$resource', 'settings'];

  function authTokenService ($resource, settings) {
    var authToken = $resource(
      settings.appRoot + settings.refineryApiV2 + '/obtain-auth-token/',
      {},
      {
        query: {}
      }
    );
    return authToken;
  }
})();

