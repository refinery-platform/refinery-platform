'use strict';

angular
  .module('refineryApp')
  .factory('nodeService', ['$resource', 'settings',
    function ($resource, settings) {
      var node = $resource(
        settings.appRoot + settings.refineryApi + '/node/:uuid/',
        {
          uuid: 'uuid',
          format: 'json',
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

// http://192.168.50.50:8000/api/v1/node/0c2778e8-eed5-4981-9ccb-5f1ff75571d5/?format=json
