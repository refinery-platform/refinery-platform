'use strict';

function NodeSetListFacory ($resource) {
  return $resource(
    '/api/v1/nodesetlist/', {
      format: 'json'
    }
  );
}

angular
  .module('refineryNodeMapping')
  .factory('NodeSetList', NodeSetListFacory);
