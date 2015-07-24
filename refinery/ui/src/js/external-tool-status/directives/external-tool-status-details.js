angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusDetails", externalToolStatusDetails);

function externalToolStatusDetails() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/external-tool-status/partials/external-tool-status-details.html',
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: {
       tools_details: '@'
    }
  };
}
