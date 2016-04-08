'use strict';

angular.module('refineryServices', [])

  .factory('Workflow', function ($resource) {
    return $resource(
      '/api/v1/workflow/', {
        format: 'json'
      }
    );
  });
