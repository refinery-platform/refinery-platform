angular.module('refineryAnalyses')
  .directive("rpAnalysesAlertMsg", ["$location",rpAnalysesAlertMsg]);

function rpAnalysesAlertMsg($location) {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analyses/partials/analyses-alert-msg.html',
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    bindToController: {
      analysesMsg: '@',
    },
  };
}
