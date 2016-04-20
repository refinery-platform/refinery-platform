'use strict';

function NodePairFactory ($resource) {
  return $resource(
    '/api/v1/nodepair/:uuid/', {
      uuid: '@uuid',
      format: 'json'
    },
    {
      update: {
        method: 'PUT'
      }
    }
  );
}

angular
  .module('refineryNodeRelationship')
  .factory('NodePairResource', ['$resource', '$http', NodePairFactory]);
