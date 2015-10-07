angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorRunningTabIcon", rpAnalysisMonitorRunningTabIcon);

function rpAnalysisMonitorRunningTabIcon() {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analysis-monitor/partials/running-tab-icon.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      launchAnalysisFlag: '='
    },
    link: function (scope, element, attr) {
      //if an analysis is launched, then the running list needs to be updated.
     scope.AMCtrl.updateAnalysesRunningList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.AMCtrl.launchAnalysisFlag = true;
      });
      
      scope.$on("rf/cancelAnalysis", function(e){
        scope.AMCtrl.cancelTimerRunningList();
        scope.AMCtrl.updateAnalysesRunningList();
      });
    }
  };
}


