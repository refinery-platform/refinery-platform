/**
 * User Profile V2 Service
 * @namespace userProfileV2Service
 * @desc Service to update user_profile fields via user_profile v2 api.
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .factory('userProfileV2Service', userProfileV2Service);

  userProfileV2Service.$inject = ['$resource', 'settings'];

  function userProfileV2Service ($resource, settings) {
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
})();
