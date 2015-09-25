angular.module('refineryAnalyses')
  .directive("rpAnalysesStartTimeTooltip", ["$filter", rpAnalysesStartTimeTooltip]);

function rpAnalysesStartTimeTooltip($filter) {
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
