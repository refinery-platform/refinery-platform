angular.module('refineryAnalyses')
    .directive("rpAnalysesGlobalListStatus", rpAnalysesGlobalListStatus);

function rpAnalysesGlobalListStatus(){
  "use strict";

  return {
    templateUrl: '/static/partials/analyses-global-list-status.html',
    restrict: 'A',
  };
}
