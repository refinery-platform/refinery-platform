angular.module('refineryExternalToolStatus')
    .directive("externalToolStatus", externalToolStatus);

function externalToolStatus() {
  "use strict";

  return {
    templateUrl: '/static/partials/external-tool-status/partials/external-tool-status.html',
    restrict: 'A',
  };
}
