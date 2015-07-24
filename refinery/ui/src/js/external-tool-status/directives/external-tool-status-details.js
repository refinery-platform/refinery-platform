angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusDetails", externalToolStatusDetails);

function externalToolStatusDetails() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/external-tool-status/partials/external_tool_status_details.tpls.html',
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: {
       tools_details: '@'
    }
  };
}
