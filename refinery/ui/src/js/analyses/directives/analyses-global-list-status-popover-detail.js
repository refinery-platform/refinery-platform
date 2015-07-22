angular.module('refineryAnalyses')
    .directive("rpAnalysesGlobalListStatusPopoverDetails", rpAnalysesGlobalListStatusPopoverDetails);

function rpAnalysesGlobalListStatusPopoverDetails() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/analyses-global-list-status-popover.html',
    controller: 'AnalysesCtrl',
    controllerAs: 'analysesCtrl',
    bindToController: {
       analysesGlobalList: '@'
    }
  };
}
