'use strict';

angular
  .module('refineryApp')
  .factory('dataSetV2Service', ['$resource', '_', 'settings',
    function ($resource, _, settings) {
      var dataSets = $resource(
        settings.appRoot + settings.refineryApiV2 + '/data_sets/:uuid/',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'GET',
            isArray: true,
            interceptor: {
              response: function (response) {
                if (!_.has(response.config, 'params')) {
                  response.config.params = {};
                }
                return response; // need header to avoid race conditions
                // when filtering, otherwise just data is returned
              }
            }
          }
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
