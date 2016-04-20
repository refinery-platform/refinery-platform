'use strict';

function rpAnalysisMonitorStartTimeTooltip ($filter) {
  return {
    restrict: 'A',
    link: function (scope, element) {
      var startTime = scope.analysis.time_start;
      var startTimeStr = ($filter('date')(startTime, 'medium'));

      element
        .attr('title', startTimeStr)
        .attr('data-container', 'body')
        .tooltip({
          placement: 'left'
        });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorStartTimeTooltip', [
    '$filter',
    rpAnalysisMonitorStartTimeTooltip
  ]);
