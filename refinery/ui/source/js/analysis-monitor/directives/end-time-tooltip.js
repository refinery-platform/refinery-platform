'use strict';

function rpAnalysisMonitorEndTimeTooltip ($filter) {
  return {
    restrict: 'A',
    link: function (scope, element) {
      var endTime = scope.analysis.time_end;
      var endTimeStr = ($filter('date')(endTime, 'medium'));

      element
        .attr('title', endTimeStr)
        .attr('data-container', 'body')
        .tooltip({
          placement: 'left'
        });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorEndTimeTooltip', [
    '$filter', rpAnalysisMonitorEndTimeTooltip
  ]);
