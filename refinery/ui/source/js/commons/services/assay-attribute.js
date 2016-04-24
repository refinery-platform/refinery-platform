'use strict';

angular
  .module('refineryApp')
  .factory('assayAttributeService', ['$resource', 'settings',
    function ($resource, settings) {
      var assayAttribute = $resource(
        settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/attributes/',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'GET',
            isArray: true
          },

          update: {
            method: 'PUT'
          }
        }
      );
      return assayAttribute;
    }
  ]);
