angular
  .module('refineryApp')
  .factory('groupService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/extended_groups/',
        {
          uuid: '@uuid',
        },
        {
          create: {
            method: 'POST',
          },
          delete: {
            method: 'DELETE',
            url: settings.appRoot + settings.refineryApi + '/extended_groups/:uuid/'
          }
        }
      );
    }]);