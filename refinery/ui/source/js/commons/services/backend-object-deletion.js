'use strict';

angular
  .module('refineryApp')
  .factory('deletionService', ['$resource', 'settings',
    function ($resource, settings) {
      var deletion = $resource(
        settings.appRoot + settings.refineryApiV2 + '/:model/:uuid/',
        {
          model: '@model',
          uuid: '@uuid',
          format: 'json'
        },
        {
          delete: {
            method: 'DELETE'
          }
        }
      );
      return deletion;
    }
  ]);
