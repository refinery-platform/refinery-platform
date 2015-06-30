angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusDetailsPopover", externalToolStatusDetailsPopover);

function externalToolStatusDetailsPopover() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/external_tool_status_details_popover.tpls.html',
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: {
       tools_details: '@'
    }
  };
}
