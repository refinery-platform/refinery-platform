angular.module('refineryServices', [])

.factory("Workflow", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/workflow/", {format: "json"}
  );
});