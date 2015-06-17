angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusDetails", externalToolStatusDetails);

function externalToolStatusDetails() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/external_tool_status_details.tpls.html',
    scope: {
       tools_details: '@'
    },
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: true,
  };
}