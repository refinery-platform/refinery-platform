(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .directive(
      'rpAnalysisMonitorGlobalStatusTooltipHider',
      rpAnalysisMonitorGlobalStatusTooltipHider
    );

  function rpAnalysisMonitorGlobalStatusTooltipHider () {
    return {
      scope: {},
      restrict: 'A',
      link: function (scope, element) {
        // The script is in the global-list-status.html template.
        element.on('click', function () {
          element.find('#global-analysis-status-run-div').tooltip('hide');
          element.find('#global-analysis-status').tooltip('hide');
        });
      }
    };
  }
})();
