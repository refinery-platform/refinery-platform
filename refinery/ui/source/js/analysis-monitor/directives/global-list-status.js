angular.module('refineryAnalysisMonitor')
    .directive("rpAnalysisMonitorGlobalListStatus", rpAnalysisMonitorGlobalListStatus);

function rpAnalysisMonitorGlobalListStatus(){
  "use strict";

  return {
    templateUrl: '/static/partials/analysis-monitor/partials/global-list-status.html',
    restrict: 'AE',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      launchAnalysisFlag: '=',
      analysesRunningGlobalListCount: '=',
      analysesRunningGlobalList: '&',
    },
    link: function(scope, element, attr, AMCtrl){
      scope.AMCtrl.updateAnalysesRunningGlobalList();
      console.log("in global");
       console.log(scope.$id);


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
