angular
  .module('refineryApp')
  .factory('groupInviteService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/invitations/',
        {
          format: 'json'
        },
        {
          send: {
            method: 'POST'
          }
        }
      );
    }]);