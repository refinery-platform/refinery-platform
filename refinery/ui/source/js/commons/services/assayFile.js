angular
  .module('refineryApp')
  .factory('assayFileService', ['$resource', 'settings',
    function ($resource, settings) {

      var assayFile = $resource(
        settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/files/',
        {
          uuid: '@uuid',
          limit: 'limit',
          offset: 'offset'
        },
        {
          query: {
            method: 'GET'
          }
        }
      );

      return assayFile;
    }
  ]);
