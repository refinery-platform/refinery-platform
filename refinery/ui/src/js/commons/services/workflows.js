angular
  .module('refineryApp')
  .factory('workflowService', ['$resource', 'settings',
    function ($resource, settings) {

      var projects = $resource(
        settings.appRoot + settings.refineryApi + '/workflow/',
        {
          format: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false,
          }
        }
      );

      return projects;
    }
  ]);
