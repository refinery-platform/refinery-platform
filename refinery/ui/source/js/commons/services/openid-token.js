'use strict';

angular
  .module('refineryApp')
  .factory('openIdTokenService', ['$resource', 'settings',
    function ($resource, settings) {
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
  ]);
