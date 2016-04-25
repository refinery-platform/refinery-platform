'use strict';

angular
  .module('refineryApp')
  .factory('nodeService', ['$resource', 'settings',
    function ($resource, settings) {
      var node = $resource(
        settings.appRoot + settings.refineryApi + '/node/:uuid/',
        {
          uuid: 'uuid',
          format: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return node;
    }
  ]);
