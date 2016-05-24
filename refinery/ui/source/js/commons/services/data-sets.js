'use strict';

angular
  .module('refineryApp')
  .factory('dataSetService', ['$resource', 'settings',
    function ($resource, settings) {
      var dataSets = $resource(
        settings.appRoot + settings.refineryApi + '/data_sets/:extra/',
        {
          extra: '@extra',
          format: 'json',
          order_by: '-modification_date'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return dataSets;
    }
  ]);
