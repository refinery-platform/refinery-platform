'use strict';

function rpAnalysisMonitorGlobalListStatusPopoverDetails (urlService) {
  return {
    restrict: 'E',
    templateUrl:
      urlService.static('partials/analysis-monitor/partials/global-list-status-popover.html'),
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
    'urlService',
    rpAnalysisMonitorGlobalListStatusPopoverDetails
  ]);
