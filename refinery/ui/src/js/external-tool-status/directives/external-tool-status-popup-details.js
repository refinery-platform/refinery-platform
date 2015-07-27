angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusDetailsPopover", externalToolStatusDetailsPopover);

function externalToolStatusDetailsPopover() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/external-tool-status/partials/external-tool-status-details-popover.html',
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: {
       tools_details: '@'
    }
  };
}
