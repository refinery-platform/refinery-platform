angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorEndTimeTooltip", ["$filter", rpAnalysisMonitorEndTimeTooltip]);

function rpAnalysisMonitorEndTimeTooltip($filter) {
  "use strict";

  return {
    restrict: 'A',
    link: function(scope, element, attrs)
      {
        var endTime = scope.analysis.time_end;
        var endTimeStr = ( $filter('date')(endTime, 'medium'));

        $(element)
          .attr('title', endTimeStr)
          .attr('data-container',"body")
          .tooltip({placement: "left"});
      }
  };
}
