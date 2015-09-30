angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorStartTimeTooltip",
  [
    "$filter",
    rpAnalysisMonitorStartTimeTooltip
  ]
);

function rpAnalysisMonitorStartTimeTooltip($filter) {
  "use strict";

  return {
    restrict: 'A',
    link: function(scope, element, attrs)
      {
        var startTime = scope.analysis.time_start;
        var startTimeStr = ( $filter('date')(startTime, 'medium'));

        $(element)
          .attr('title', startTimeStr)
          .attr('data-container',"body")
          .tooltip({placement: "left"});
      }
  };
}
