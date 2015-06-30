angular
  .module('refineryApp')
  .factory('solrService', ['$resource', 'settings',
    function ($resource, settings) {

      var query = $resource(
        settings.appRoot + settings.solrApi + '/:index/select',
        {
          index: '@index',
          wt: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false,
          }
        }
      );

      return query;
    }
  ]);
