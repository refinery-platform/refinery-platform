angular.module('refineryAnalyses')
  .directive("rpAnalysesRunningTabIcon", rpAnalysesRunningTabIcon);

function rpAnalysesRunningTabIcon() {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analyses/partials/analyses-running-tab-icon.html',
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    link: function (scope, element, attr) {
      //if an analysis is launched, then the running list needs to be updated.
     scope.AnalysesCtrl.updateAnalysesRunningList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.AnalysesCtrl.cancelTimerRunningList();
        scope.AnalysesCtrl.updateAnalysesRunningList();
      });

      scope.$on("rf/cancelAnalysis", function(e){
        scope.AnalysesCtrl.cancelTimerRunningList();
        scope.AnalysesCtrl.updateAnalysesRunningList();
      });
    }
  };
}


