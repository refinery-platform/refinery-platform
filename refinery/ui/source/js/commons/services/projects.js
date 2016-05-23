'use strict';

angular
  .module('refineryApp')
  .factory('projectService', ['$resource', 'settings',
    function ($resource, settings) {
      var projects = $resource(
        settings.appRoot + settings.refineryApi + '/projects/',
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

      return projects;
    }
  ]);
