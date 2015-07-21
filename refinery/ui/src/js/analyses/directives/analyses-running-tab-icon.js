angular.module('refineryAnalyses')
  .directive("rpAnalysesRunningTabIcon", rpAnalysesRunningTabIcon);

function rpAnalysesRunningTabIcon() {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analyses-running-tab-icon.html',
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    bindToController: {
      analysesRunningFlag: '@',
    },
  };
}
