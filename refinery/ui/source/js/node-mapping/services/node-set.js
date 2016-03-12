angular
  .module('refineryNodeMapping')
  .factory("NodeSetFactory", function($resource) {
    'use strict';

    return $resource(
      "/api/v1/nodeset/", {format: "json"}
    );
  });
