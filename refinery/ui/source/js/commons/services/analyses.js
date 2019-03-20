'use strict';

angular
  .module('refineryApp')
  .factory('analysisService', ['$resource', 'settings',
    function ($resource, settings) {
      var analyses = $resource(
        settings.appRoot + settings.refineryApiV2 + '/analyses/',
        {},
        {
          query: {
            method: 'GET',
            isArray: true
          }
        }
      );

      return analyses;
    }
  ]);
