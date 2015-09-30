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
      scope.AMCtrl.updateAnalysesRunningGlobalList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.AMCtrl.launchAnalysisFlag = true;
        scope.AMCtrl.analysesRunningGlobalListCount =
          scope.AMCtrl.analysesRunningGlobalListCount + 1;
      });

      scope.$on("rf/cancelAnalysis", function(e){
        scope.AMCtrl.cancelTimerRunningGlobalList();
        scope.AMCtrl.analysesRunningGlobalListCount =
          scope.AMCtrl.analysesRunningGlobalListCount - 1;
        scope.AMCtrl.updateAnalysesRunningGlobalList();
      });
    }
  };
}
