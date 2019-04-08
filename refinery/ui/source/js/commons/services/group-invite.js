'use strict';

angular
  .module('refineryApp')
  .factory('groupInviteService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApiV2 + '/invitations/:id/',
        {
          id: '@id',
          format: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: true
          },
          send: {
            method: 'POST'
          },
          resend: {
            method: 'PATCH'
          },
          revoke: {
            method: 'DELETE'
          }
        }
      );
    }]);
