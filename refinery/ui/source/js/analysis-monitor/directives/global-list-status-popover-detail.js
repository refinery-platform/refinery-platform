'use strict';

function rpAnalysisMonitorGlobalListStatusPopoverDetails () {
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

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatusPopoverDetails', [
    rpAnalysisMonitorGlobalListStatusPopoverDetails
  ]);
