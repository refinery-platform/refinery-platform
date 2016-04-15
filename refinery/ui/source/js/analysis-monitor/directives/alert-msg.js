'use strict';

function rpAnalysisMonitorAlertMsg () {
  return {
    restrict: 'A',
    templateUrl: '/static/partials/analysis-monitor/partials/alert-msg.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      analysesMsg: '@'
    },
    link: function (scope) {
      scope.AMCtrl.setAnalysesAlertMsg();
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorAlertMsg', [
    rpAnalysisMonitorAlertMsg
  ]);
