angular.module('refineryAnalysisMonitor')
    .directive("rpAnalysisMonitorGlobalListStatusPopoverDetails",
  rpAnalysisMonitorGlobalListStatusPopoverDetails);

function rpAnalysisMonitorGlobalListStatusPopoverDetails() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/analysis-monitor/partials/global-list-status-popover.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'PopAMCtrl',
    bindToController: {
       analysesGlobalList: '@'
    }
  };
}
