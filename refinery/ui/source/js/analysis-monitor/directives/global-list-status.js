angular.module('refineryAnalysisMonitor')
    .directive("rpAnalysisMonitorGlobalListStatus", rpAnalysisMonitorGlobalListStatus);

function rpAnalysisMonitorGlobalListStatus(){
  "use strict";

  return {
    templateUrl: '/static/partials/analysis-monitor/partials/global-list-status.html',
    restrict: 'A',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      launchAnalysisFlag: '='
    },
    link: function(scope, element, attr){
      scope.AnalysisMonitorCtrl.updateAnalysesRunningGlobalList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.AnalysisMonitorCtrl.launchAnalysisFlag = true;
        scope.AnalysisMonitorCtrl.analysesRunningGlobalListCount =
          scope.AnalysisMonitorCtrl.analysesRunningGlobalListCount + 1;
      });

      scope.$on("rf/cancelAnalysis", function(e){
        scope.AnalysisMonitorCtrl.cancelTimerRunningGlobalList();
        scope.AnalysisMonitorCtrl.analysesRunningGlobalListCount =
          scope.AnalysisMonitorCtrl.analysesRunningGlobalListCount - 1;
        scope.AnalysisMonitorCtrl.updateAnalysesRunningGlobalList();
      });
    }
  };
}
