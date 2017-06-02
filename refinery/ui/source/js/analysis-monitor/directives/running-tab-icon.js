'use strict';

function rpAnalysisMonitorRunningTabIcon ($window) {
  return {
    restrict: 'A',
    templateUrl: function () {
      return $window.getStaticUrl('partials/analysis-monitor/partials/running-tab-icon.html');
    },
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      launchAnalysisFlag: '=?'
    },
    link: function (scope) {
      // if an analysis is launched, then the running list needs to be updated.
      scope.AMCtrl.updateAnalysesRunningList();
      scope.$on('rf/launchAnalysis', function () {
        scope.AMCtrl.launchAnalysisFlag = true;
      });

      scope.$on('rf/cancelAnalysis', function () {
        scope.AMCtrl.cancelTimerRunningList();
        scope.AMCtrl.updateAnalysesRunningList();
      });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorRunningTabIcon', [
    '$window',
    rpAnalysisMonitorRunningTabIcon
  ]);
