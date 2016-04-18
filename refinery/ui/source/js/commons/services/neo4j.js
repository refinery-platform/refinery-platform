'use strict';

function Neo4J ($resource, settings) {
  return $resource(
    settings.appRoot + settings.neo4jApi + '/:res/',
    {
      res: '@res'
    },
    {
      query: {
        method: 'GET',
        isArray: false
      }
    }
  );
}

angular
  .module('refineryApp')
  .factory('neo4j', [
    '$resource',
    'settings',
    Neo4J
  ]);
