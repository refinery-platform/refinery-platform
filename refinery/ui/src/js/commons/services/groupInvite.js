angular
  .module('refineryApp')
  .factory('groupInviteService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/invitations/',
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
          revoke: {
            method: 'DELETE',
            url: settings.appRoot + settings.refineryApi + '/invitations/:token/'
          }
        }
      );
    }]);