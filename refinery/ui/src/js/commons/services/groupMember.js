angular
  .module('refineryApp')
  .factory('groupMemberService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/groups/members/',
        {
          groupId: '@groupId',
          userId: '@userId',
          format: 'json'
        },
        {
          query: {
            method: 'GET',
          },
          add: {
            method: 'POST',
            url: settings.appRoot + settings.refineryApi + '/groups/:groupId/members/'
          },
          remove: {
            method: 'DELETE',
            url: settings.appRoot + settings.refineryApi + '/groups/:groupId/members/:userId/'
          }
        }
      );
    }]);