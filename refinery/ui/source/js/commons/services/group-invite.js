/**
 * Invitation V2 Service
 * @namespace invitationV2Service
 * @desc Service to query invitation API with a group uuid
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .factory('groupInviteService', groupInviteService);

  groupInviteService.$inject = ['$resource', 'settings'];

  function groupInviteService ($resource, settings) {
    var invites = $resource(
      settings.appRoot + settings.refineryApiV2 + '/invitations/:id/',
      {
        id: '@id'
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
      });
    return invites;
  }
})();
