'use strict';

angular
  .module('refineryApp')
  .factory('groupMemberService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/extended_groups/members/',
        {
          uuid: '@uuid',
          userId: '@userId',
          id: 'id',
          format: 'json'
        },
        {
          query: {
            method: 'GET'
          },
          add: {
            method: 'POST',
            url: (
              settings.appRoot +
              settings.refineryApi +
              '/extended_groups/:uuid/members/'
            )
          },
          remove: {
            method: 'DELETE',
            url: (
              settings.appRoot +
              settings.refineryApi +
              '/extended_groups/:uuid/members/:userId/'
            )
          }
        }
      );
    }]);
