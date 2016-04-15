'use strict';

angular
  .module('refineryApp')
  .factory('workflowService', ['$resource', 'settings',
    function ($resource, settings) {
      var workflows = $resource(
        settings.appRoot + settings.refineryApi + '/workflow/',
        {
          format: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return workflows;
    }
  ]);
