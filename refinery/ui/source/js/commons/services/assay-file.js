'use strict';

angular
  .module('refineryApp')
  .factory('assayFileService', ['$resource', 'settings',
    function ($resource, settings) {
      var assayFile = $resource(
        settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/files/',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'GET'
          },
          params: { // TODO: I believe params should be inside query?
            limit: 'limit',
            offset: 'offset'
          }
        }
      );

      return assayFile;
    }
  ]);
