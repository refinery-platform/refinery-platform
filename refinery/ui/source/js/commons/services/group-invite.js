'use strict';

angular
  .module('refineryApp')
  .factory('groupInviteService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/invitations/:token/',
        {
          token: '@token',
          format: 'json'
        },
        {
          query: {
            method: 'GET'
          },
          send: {
            method: 'POST'
          },
          resend: {
            method: 'PUT'
          },
          revoke: {
            method: 'DELETE'
          }
        }
      );
    }]);
