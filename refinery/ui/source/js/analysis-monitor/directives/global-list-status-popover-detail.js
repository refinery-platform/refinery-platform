'use strict';

function rpAnalysisMonitorGlobalListStatusPopoverDetails ($window) {
  return {
    restrict: 'E',
    templateUrl:
      $window.getStaticUrl('partials/analysis-monitor/partials/global-list-status-popover.html'),
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'PopAMCtrl',
    bindToController: {
      analysesGlobalList: '@'
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatusPopoverDetails', [
    '$window',
    rpAnalysisMonitorGlobalListStatusPopoverDetails
  ]);
