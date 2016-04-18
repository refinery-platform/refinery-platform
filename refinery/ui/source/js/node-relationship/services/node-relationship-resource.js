'use strict';

function NodeRelationshipFactory ($resource) {
  return $resource(
    '/api/v1/noderelationship/:uuid/', {
      uuid: '@uuid',
      format: 'json'
    },
    {
      update: {
        method: 'PUT'
      },
      update_partial: {
        method: 'PATCH'
      }
    }
  );
}

angular
  .module('refineryNodeRelationship')
  .factory('NodeRelationshipResource', ['$resource', NodeRelationshipFactory]);
