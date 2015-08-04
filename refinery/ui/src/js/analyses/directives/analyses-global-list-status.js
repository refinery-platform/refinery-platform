angular.module('refineryAnalyses')
    .directive("rpAnalysesGlobalListStatus", rpAnalysesGlobalListStatus);

function rpAnalysesGlobalListStatus(){
  "use strict";

  return {
    templateUrl: '/static/partials/analyses/partials/analyses-global-list-status.html',
    restrict: 'A',
    controller: 'AnalysesCtrl',
    controllerAs: 'analysesCtrl',
    bindToController: {
      launchAnalysisFlag: '='
    },
    link: function(scope, element, attr){
      scope.analysesCtrl.updateAnalysesRunningGlobalList();
      scope.$on("rf/launchAnalysis", function (e) {
        scope.analysesCtrl.launchAnalysisFlag = true;
      });

      scope.$on("rf/cancelAnalysis", function(e){
        scope.analysesCtrl.cancelTimerRunningGlobalList();
        scope.analysesCtrl.updateAnalysesRunningGlobalList();
      });
    }
  };
}
