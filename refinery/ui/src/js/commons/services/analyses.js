angular
  .module('refineryApp')
  .factory('analysisService', ['$resource', 'settings',
    function ($resource, settings) {

      var analyses = $resource(
        settings.appRoot + settings.refineryApi + '/analysis/',
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

      return analyses;
    }
  ]);
