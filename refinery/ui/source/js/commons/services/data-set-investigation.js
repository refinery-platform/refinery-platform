'use strict';

angular
  .module('refineryApp')
  .factory('dataSetInvestigationService', ['$resource', 'settings',
    function ($resource, settings) {
      var investigation = $resource(
        settings.appRoot + settings.refineryApi + '/data_sets/:uuid/investigation/',
        {
          uuid: '@uuid',
          format: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return investigation;
    }
  ]);
