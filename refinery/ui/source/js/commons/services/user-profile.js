'use strict';

angular
  .module('refineryApp')
  .factory('userProfileV2Service', ['$resource', 'settings',
    function ($resource, settings) {
      var userProfile = $resource(
        settings.appRoot + settings.refineryApiV2 + '/user_profile/:uuid/',
        {
          uuid: '@uuid',
          format: 'json'
        },
        {
          partial_update: {
            method: 'PATCH'
          }
        }
      );
      return userProfile;
    }
  ]);
