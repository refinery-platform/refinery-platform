'use strict';

angular
  .module('refineryApp')
  .factory('dataSetV2Service', ['$resource', 'settings',
    function ($resource, settings) {
      var dataSets = $resource(
        settings.appRoot + settings.refineryApiV2 + '/data_sets/:uuid/',
        {
          uuid: '@uuid',
          format: 'json'
        },
        {
          partial_update: {
            method: 'PATCH'
          }
        }
      );
      return dataSets;
    }
  ]);
