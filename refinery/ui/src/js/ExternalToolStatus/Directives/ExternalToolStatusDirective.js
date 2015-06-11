angular.module('refineryExternalToolStatus')
    .directive("externalToolStatus", externalToolStatus);

function externalToolStatus() {
  "use strict";

  return {
    templateUrl: '/static/partials/external_tool_status.tpls.html',
    restrict: 'A',
  };
}