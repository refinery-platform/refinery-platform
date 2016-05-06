'use strict';

function NodeSetListFactory ($resource) {
  return $resource(
    '/api/v1/nodesetlist/', {
      format: 'json'
    }
  );
}

angular
  .module('refineryNodeMapping')
  .factory('NodeSetList', ['$resource', NodeSetListFactory]);
