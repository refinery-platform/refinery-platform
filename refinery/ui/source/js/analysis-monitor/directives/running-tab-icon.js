angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorRunningTabIcon", rpAnalysisMonitorRunningTabIcon);

function rpAnalysisRunningTabIcon() {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analysis-monitor/partials/running-tab-icon.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'analysisMonitorCtrl',
    bindToController: {
      launchAnalysisFlag: '='
    },
    link: function (scope, element, attr) {
      //if an analysis is launched, then the running list needs to be updated.
     scope.analysisMonitorCtrl.updateAnalysesRunningList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.analysisMonitorCtrl.launchAnalysisFlag = true;
      });
      
      scope.$on("rf/cancelAnalysis", function(e){
        scope.analysisMonitorCtrl.cancelTimerRunningList();
        scope.analysisMonitorCtrl.updateAnalysesRunningList();
      });
    }
  };
}


