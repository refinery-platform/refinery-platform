'use strict';

angular
  .module('refineryApp')
  .factory('analysisService', ['$resource', 'settings',
    function ($resource, settings) {
      var analyses = $resource(
        settings.appRoot + settings.refineryApi + '/analysis/',
        {
          format: 'json',
          limit: 0,
          order_by: '-time_start'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return analyses;
    }
  ]);
