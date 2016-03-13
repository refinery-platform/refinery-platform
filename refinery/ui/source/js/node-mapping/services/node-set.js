function NodeSerFactory ($resource) {
  'use strict';

  return $resource(
    '/api/v1/nodeset/', {format: 'json'}
  );
}

angular
  .module('refineryNodeMapping')
  .factory('NodeSetFactory', NodeSerFactory);
