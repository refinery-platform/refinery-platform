angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorAlertMsg", ["$location",rpAnalysisMonitorAlertMsg]);

function rpAnalysisMonitorAlertMsg($location) {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analysis-monitor/partials/alert-msg.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      analysesMsg: '@',
    },
    link: function(scope, element, attr){
      scope.AMCtrl.setAnalysesAlertMsg();
    }
  };
}
