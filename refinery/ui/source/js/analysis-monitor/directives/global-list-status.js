'use strict';

function rpAnalysisMonitorGlobalListStatus (urlService) {
  return {
    templateUrl: function () {
      return urlService.static('partials/analysis-monitor/partials/global-list-status.html');
    },
    restrict: 'AE',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      launchAnalysisFlag: '=?',
      analysesRunningGlobalListCount: '=?',
      analysesRunningGlobalList: '&?'
    },
    link: function (scope) {
      scope.AMCtrl.updateAnalysesRunningGlobalList();

      scope.$on('rf/launchAnalysis', function () {
        scope.AMCtrl.launchAnalysisFlag = true;
        scope.AMCtrl.analysesRunningGlobalListCount =
          scope.AMCtrl.analysesRunningGlobalListCount + 1;
      });

      scope.$on('rf/cancelAnalysis', function () {
        scope.AMCtrl.cancelTimerRunningGlobalList();
        scope.AMCtrl.analysesRunningGlobalListCount =
          scope.AMCtrl.analysesRunningGlobalListCount - 1;
        scope.AMCtrl.updateAnalysesRunningGlobalList();
      });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatus', [
    'urlService',
    rpAnalysisMonitorGlobalListStatus
  ]);
