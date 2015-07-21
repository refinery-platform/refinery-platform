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
          resend: {
            method: 'PUT',
            url: settings.appRoot + settings.refineryApi + '/invitations/:token/'
          },
          revoke: {
            method: 'DELETE',
            url: settings.appRoot + settings.refineryApi + '/invitations/:token/'
          }
        }
      );
    }]);