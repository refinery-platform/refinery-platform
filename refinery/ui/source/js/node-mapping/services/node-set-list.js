angular
  .module('refineryNodeMapping')
  .factory("NodeSetList", function($resource) {
    'use strict';

    return $resource(
      "/api/v1/nodesetlist/", {format: "json"}
    );
  });
