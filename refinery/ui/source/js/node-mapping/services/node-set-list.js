function NodeSetListFacory ($resource) {
  'use strict';

  return $resource(
    "/api/v1/nodesetlist/", {format: "json"}
  );
}

angular
  .module('refineryNodeMapping')
  .factory("NodeSetList", NodeSetListFacory);
