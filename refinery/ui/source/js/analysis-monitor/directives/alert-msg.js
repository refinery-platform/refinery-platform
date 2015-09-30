angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorAlertMsg", ["$location",rpAnalysisMonitorAlertMsg]);

function rpAnalysisMonitorAlertMsg($location) {
  "use strict";

  return {
    restrict: 'A',
    templateUrl: '/static/partials/analyses/partials/alert-msg.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AnalysisMonitorCtrl',
    bindToController: {
      analysesMsg: '@',
    },
    link: function(scope, element, attr){
      scope.AnalysisMonitorCtrl.setAnalysesAlertMsg();
    }
  };
}
