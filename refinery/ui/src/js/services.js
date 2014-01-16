angular.module('refineryServices', [])

.factory("Workflow", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/workflow/", {format: "json"}
  );
})

.factory("NodeSetList", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/nodesetlist/", {format: "json"}
  );
})

.factory("NodeMappingList", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/noderelationship/", {format: "json"}
  );
});
