angular.module('refineryAnalyses')
    .directive("rpAnalysesGlobalListStatus", rpAnalysesGlobalListStatus);

function rpAnalysesGlobalListStatus(){
  "use strict";

  return {
    templateUrl: '/static/partials/analyses/partials/analyses-global-list-status.html',
    restrict: 'A',
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    link: function(scope, element, attr){
      scope.AnalysesCtrl.updateAnalysesRunningGlobalList();
    }
  };
}
