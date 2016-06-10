'use strict';

angular
  .module('refineryApp')
  .factory('assayService', ['$resource', 'settings',
    function ($resource, settings) {
      var assays = $resource(
        settings.appRoot + settings.refineryApiV2 + '/assays/',
        {},
        {
          query: {
            method: 'GET',
            isArray: true
          },
          params: {
            uuid: 'uuid',
            study: 'study'
          }
        }
      );

      return assays;
    }
  ]);
