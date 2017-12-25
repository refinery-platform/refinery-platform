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
          params: {
            limit: 0,
            offset: 0
          }
        }
      );

      return assayFile;
    }
  ]);
