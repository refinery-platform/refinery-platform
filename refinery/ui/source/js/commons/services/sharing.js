'use strict';

angular
  .module('refineryApp')
  .factory('sharingService', ['$resource', 'settings',
    function ($resource, settings) {
      var sharing = $resource(
        settings.appRoot + settings.refineryApi + '/:model/:uuid/sharing/',
        {
          model: '@model',
          uuid: '@uuid',
          format: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          },
          update: {
            method: 'PUT'
          }
        }
      );

      return sharing;
    }
  ]);
