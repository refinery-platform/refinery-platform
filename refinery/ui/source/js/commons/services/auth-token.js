'use strict';

angular
  .module('refineryApp')
  .factory('authTokenService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApiV2 + '/obtain-auth-token/',
        {},
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );
    }
  ]);
