angular.module('refineryAnalyses')
    .directive("rpAnalysesGlobalListStatus", rpAnalysesGlobalListStatus);

function rpAnalysesGlobalListStatus(){
  "use strict";

  return {
    templateUrl: '/static/partials/analyses/partials/analyses-global-list-status.html',
    restrict: 'A',
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    bindToController: {
      launchAnalysisFlag: '='
    },
    link: function(scope, element, attr){
      scope.AnalysesCtrl.updateAnalysesRunningGlobalList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.AnalysesCtrl.launchAnalysisFlag = true;
      });

      scope.$on("rf/cancelAnalysis", function(e){
        scope.AnalysesCtrl.cancelTimerRunningGlobalList();
        scope.AnalysesCtrl.updateAnalysesRunningGlobalList();
      });
    }
  };
}
